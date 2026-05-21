import 'dotenv/config'
import { createHmac, createHash } from 'crypto'
import { request as httpsRequest } from 'https'
import { Agent, setGlobalDispatcher } from 'undici'
import express from 'express'
import cors from 'cors'
import { scSend } from 'serverchan-sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'

// COS 调用走 undici fetch，强制 IPv4
setGlobalDispatcher(new Agent({ connect: { family: 4 } }))

// 微信 API 用 Node.js 原生 https 模块（undici/fetch 的 OpenSSL 与微信服务器 TLS 握手不兼容）
function wxRequest<T>(url: string, postBody?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = postBody ? JSON.stringify(postBody) : undefined
    const req = httpsRequest(
      {
        hostname: u.hostname, port: 443, path: u.pathname + u.search,
        method: payload ? 'POST' : 'GET',
        headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
        minVersion: 'TLSv1.2' as any, maxVersion: 'TLSv1.3' as any,
        ALPNProtocols: ['http/1.1'],
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => { raw += chunk })
        res.on('end', () => { try { resolve(JSON.parse(raw) as T) } catch (e) { reject(e) } })
      },
    )
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(new Error('wx request timeout')) })
    if (payload) req.write(payload)
    req.end()
  })
}

// ── 环境变量 ──────────────────────────────────────────────────────────────────
const PORT        = Number(process.env.PORT)                  || 3004
const SECRET_ID   = process.env.COS_SECRET_ID                 || ''
const SECRET_KEY  = process.env.COS_SECRET_KEY                || ''
const BUCKET      = process.env.COS_BUCKET                    || ''
const REGION      = process.env.COS_REGION                    || ''
const PUSH_KEY    = process.env.PUSH_KEY                      || ''
const WX_APP_ID   = process.env.WX_APP_ID                     || ''
const WX_SECRET   = process.env.WX_APP_SECRET                 || ''
const WX_TMPL_ID  = process.env.WX_SUBSCRIBE_TEMPLATE_ID      || ''

// ── 类型定义 ──────────────────────────────────────────────────────────────────
type DishCategory = '荤菜' | '素菜' | '汤羹' | '主食' | '小吃'
type SessionStatus = 'active' | 'closed'
interface Dish { id: string; name: string; category: DishCategory; description: string; imageUrl: string; available: boolean; price: number; createdAt: string; isCustom?: boolean }
interface CartItem { dish: Dish; quantity: number; submittedQty?: number; preferences?: string[]; deviceId?: string }
interface OrderPayload { items: CartItem[]; note: string; submittedAt: string }
interface ParticipantInfo { deviceId: string; avatarUrl: string; nickName: string; updatedAt: string }
interface OrderSession {
  id: string; name: string; status: SessionStatus; items: CartItem[]
  participants?: string[]; participantInfos?: ParticipantInfo[]; subscribers?: string[]
  createdAt: string; updatedAt: string
}

// ── COS 工具 ──────────────────────────────────────────────────────────────────
const DISHES_KEY   = 'kitchen/dishes.json'
const SESSIONS_KEY = 'kitchen/sessions.json'

function _cosAuth(method: string, urlPath: string): string {
  const now = Math.floor(Date.now() / 1000)
  const keyTime = `${now};${now + 3600}`
  const signKey = createHmac('sha1', SECRET_KEY).update(keyTime).digest('hex')
  const httpStr = `${method.toLowerCase()}\n${urlPath}\n\n\n`
  const strToSign = `sha1\n${keyTime}\n${createHash('sha1').update(httpStr).digest('hex')}\n`
  const sig = createHmac('sha1', signKey).update(strToSign).digest('hex')
  return `q-sign-algorithm=sha1&q-ak=${SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=&q-url-param-list=&q-signature=${sig}`
}
const _cosBase = () => `https://${BUCKET}.cos.${REGION}.myqcloud.com`

async function cosGet<T>(key: string, fallback: T): Promise<T> {
  const path = `/${key}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${_cosBase()}${path}?_ts=${Date.now()}`, {
        headers: { Authorization: _cosAuth('GET', path), 'Cache-Control': 'no-store' },
      })
      if (!res.ok) return fallback
      return await res.json() as T
    } catch (e) {
      if (attempt === 2) { console.warn(`[cosGet] ${key} 放弃:`, (e as Error).message); return fallback }
      console.warn(`[cosGet] ${key} 第${attempt + 1}次失败，300ms后重试:`, (e as Error).message)
      await new Promise(r => setTimeout(r, 300))
    }
  }
  return fallback
}

async function cosPut(key: string, body: unknown): Promise<void> {
  const path = `/${key}`
  const content = JSON.stringify(body, null, 2)
  const res = await fetch(`${_cosBase()}${path}`, {
    method: 'PUT',
    headers: { Authorization: _cosAuth('PUT', path), 'Content-Type': 'application/json' },
    body: content,
  })
  if (!res.ok) throw new Error(`COS PUT failed: ${res.status} ${await res.text()}`)
}

// ── 内存状态 ──────────────────────────────────────────────────────────────────
// 所有数据以内存为主，开机时从 COS 加载一次，写操作即时改内存 + 异步刷 COS
let _sessions: OrderSession[] = []
let _dishes: Dish[] = []
let _ready = false

async function initFromCOS(): Promise<void> {
  const [s, d] = await Promise.all([
    cosGet<OrderSession[]>(SESSIONS_KEY, []),
    cosGet<Dish[]>(DISHES_KEY, []),
  ])
  _sessions = s
  _dishes = d
  _ready = true
  console.log(`[init] 加载完成: ${_sessions.length} 工单, ${_dishes.length} 菜品`)
}

function _flushCOS(): void {
  // 异步刷 COS，不阻塞请求
  Promise.all([
    cosPut(SESSIONS_KEY, _sessions).catch(e => console.warn('[COS] sessions 刷入失败:', e.message)),
    cosPut(DISHES_KEY, _dishes).catch(e => console.warn('[COS] dishes 刷入失败:', e.message)),
  ])
}

function findSession(sid: string): OrderSession | undefined {
  return _sessions.find(s => s.id === sid)
}

function sessionIndex(sid: string): number {
  return _sessions.findIndex(s => s.id === sid)
}

// ── 微信 access_token ────────────────────────────────────────────────────────
let _wxToken = '', _wxTokenExp = 0
async function getWxToken(): Promise<string> {
  if (_wxToken && Date.now() < _wxTokenExp) return _wxToken
  if (!WX_APP_ID || !WX_SECRET) throw new Error('未配置 WX_APP_ID / WX_APP_SECRET')
  const d = await wxRequest<any>(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APP_ID}&secret=${WX_SECRET}`)
  if (!d.access_token) throw new Error(`获取 access_token 失败: ${d.errmsg}`)
  _wxToken = d.access_token
  _wxTokenExp = Date.now() + (d.expires_in - 300) * 1000
  return _wxToken
}
async function code2openid(code: string): Promise<string> {
  const d = await wxRequest<any>(`https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APP_ID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`)
  if (!d.openid) throw new Error(`code2session 失败: ${d.errmsg}`)
  return d.openid as string
}

// ── 订阅消息 ──────────────────────────────────────────────────────────────────
async function sendSubscribeMsg(openid: string, session: OrderSession): Promise<void> {
  if (!WX_TMPL_ID) return
  const token = await getWxToken()
  const totalDishes = session.items.reduce((s, i) => s + i.quantity, 0)
  const startTime = new Date(session.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const endTime = new Date().toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const body = {
    touser: openid, template_id: WX_TMPL_ID, page: 'pages/order/order', miniprogram_state: 'formal', lang: 'zh_CN',
    data: {
      thing1: { value: `${session.name.slice(0, 14)}，共${totalDishes}道菜` },
      phrase2: { value: '已完成' }, date3: { value: startTime },
      thing5: { value: '感谢用餐，欢迎下次光临！' }, time16: { value: endTime },
    },
  }
  const result = await wxRequest<any>(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, body)
  if (result.errcode && result.errcode !== 0) throw new Error(`订阅消息发送失败: ${result.errmsg} (${result.errcode})`)
}

// ── 推送通知 ──────────────────────────────────────────────────────────────────
function buildPushText(payload: OrderPayload): { title: string; body: string } {
  const lines = payload.items.map(item => {
    const pref = item.preferences?.length ? ` [${item.preferences.join('、')}]` : ''
    return `${item.dish.name} × ${item.quantity}${pref}`
  })
  const title = `🍽️ 新点单 — ${payload.items.length} 道菜`
  const body = [...lines, '', payload.note ? `备注：${payload.note}` : '', `时间：${new Date(payload.submittedAt).toLocaleString('zh-CN')}`].filter(Boolean).join('\n')
  return { title, body }
}
async function sendPush(payload: OrderPayload): Promise<void> {
  if (!PUSH_KEY) return
  const { title, body } = buildPushText(payload)
  const isSCT = PUSH_KEY.startsWith('SCT') || PUSH_KEY.startsWith('sct') || PUSH_KEY.includes('sctapi.ftqq.com') || PUSH_KEY.includes('sc.ftqq.com')
  if (isSCT) {
    const key = PUSH_KEY.startsWith('http') ? PUSH_KEY.split('/').pop()?.replace('.send', '') || PUSH_KEY : PUSH_KEY
    await scSend(key, title, body, { tags: '厨房订单|新点单' })
  } else {
    const base = PUSH_KEY.startsWith('http') ? PUSH_KEY : `https://api.day.app/${PUSH_KEY}`
    const url = `${base}/${encodeURIComponent(title)}/${encodeURIComponent(body)}?sound=minuet`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Bark 推送失败 (${res.status})`)
  }
}

// ── Express 应用 ──────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// 头像本地存储
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const AVATARS_DIR = join(__dirname, 'avatars')
if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true })
app.use('/avatars', express.static(AVATARS_DIR))

// 健康检查（含就绪检查）
app.get('/health', (_req, res) => res.json({ ok: true, ready: _ready }))

// ── 中间件：等待数据就绪 ──────────────────────────────────────────────────────
app.use((_req, res, next) => {
  if (!_ready) { res.status(503).json({ error: '服务启动中，请稍后' }); return }
  next()
})

// ── 工单 API（全部操作内存，异步刷 COS）─────────────────────────────────────

// POST /sessions — 创建
app.post('/sessions', async (req, res) => {
  try {
    const name: string = req.body?.name?.trim()
    if (!name) { res.status(400).json({ error: '缺少工单名称' }); return }
    const now = new Date().toISOString()
    const newSession: OrderSession = { id: `s${Date.now()}`, name, status: 'active', items: [], createdAt: now, updatedAt: now }
    _sessions.push(newSession)
    _flushCOS()
    console.log(`[sessions] 创建: ${newSession.id} name=${name}`)
    res.json(newSession)
  } catch (e) { console.error('[POST sessions]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /sessions/active — 最新的活跃工单
app.get('/sessions/active', (_req, res) => {
  try {
    const active = _sessions.filter(s => s.status === 'active').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!active) { res.json({ found: false }); return }
    res.json({ found: true, sid: active.id, name: active.name })
  } catch (e) { console.error('[GET sessions/active]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /session/:sid — 工单详情 + 菜单
app.get('/session/:sid', (req, res) => {
  try {
    const session = findSession(req.params.sid)
    if (!session || session.status === 'closed') { res.json({ valid: false }); return }
    res.json({
      valid: true, session,
      dishes: _dishes,
      participantCount: session.participants?.length ?? 1,
      participantInfos: session.participantInfos ?? [],
    })
  } catch (e) { console.error('[GET session]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /avatar — 头像上传
app.post('/avatar', async (req, res) => {
  try {
    const { deviceId, base64 } = req.body
    if (!deviceId || !base64) { res.status(400).json({ error: '缺少 deviceId 或 base64' }); return }
    const buffer = Buffer.from(base64 as string, 'base64')
    if (buffer.length > 1_500_000) { res.status(413).json({ error: '头像文件过大' }); return }
    writeFileSync(join(AVATARS_DIR, `${deviceId}.jpg`), buffer)
    console.log(`[avatar] 保存 deviceId=${deviceId} size=${buffer.length}`)
    res.json({ ok: true, url: `/api/kitchen/avatars/${deviceId}.jpg` })
  } catch (e) { console.error('[POST avatar]', e); res.status(500).json({ error: '头像上传失败' }) }
})

// PUT /session/:sid/participant — 注册参与者
app.put('/session/:sid/participant', (req, res) => {
  try {
    const { deviceId, avatarUrl, nickName } = req.body
    if (!deviceId) { res.status(400).json({ error: '缺少 deviceId' }); return }
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }

    const infos = _sessions[idx].participantInfos ?? []
    const existingIdx = infos.findIndex(p => p.deviceId === deviceId)
    const info: ParticipantInfo = { deviceId, avatarUrl: avatarUrl || '', nickName: nickName || '', updatedAt: new Date().toISOString() }
    if (existingIdx >= 0) infos[existingIdx] = info
    else infos.push(info)

    const participants = _sessions[idx].participants ?? []
    if (!participants.includes(deviceId)) participants.push(deviceId)
    _sessions[idx].participantInfos = infos
    _sessions[idx].participants = participants
    _sessions[idx].updatedAt = new Date().toISOString()
    _flushCOS()
    res.json({ ok: true })
  } catch (e) { console.error('[PUT participant]', e); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /session/:sid/cart — 同步购物车
app.put('/session/:sid/cart', (req, res) => {
  try {
    const items: CartItem[] = req.body?.items
    const deviceId: string = req.body?.deviceId || ''
    if (!Array.isArray(items)) { res.status(400).json({ error: '参数错误' }); return }

    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }

    const participants = _sessions[idx].participants ?? []
    if (deviceId && !participants.includes(deviceId)) participants.push(deviceId)

    // 按设备合并：保留其他设备的条目，替换本设备的
    const existing = _sessions[idx].items ?? []
    const othersItems = deviceId ? existing.filter(i => i.deviceId && i.deviceId !== deviceId) : []
    const myItems: CartItem[] = items.map(i => ({ ...i, deviceId: deviceId || undefined }))
    _sessions[idx].items = [...othersItems, ...myItems]
    _sessions[idx].participants = participants
    _sessions[idx].updatedAt = new Date().toISOString()
    _flushCOS()
    res.json({ ok: true, participantCount: participants.length })
  } catch (e) { console.error('[PUT cart]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /session/:sid/subscribe — 微信订阅
app.post('/session/:sid/subscribe', async (req, res) => {
  if (!WX_APP_ID || !WX_SECRET) { res.json({ ok: true, note: '未配置 WX_APP_SECRET，已跳过' }); return }
  try {
    const { code } = req.body
    if (!code) { res.status(400).json({ error: '缺少 code' }); return }
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    let openid: string
    try { openid = await code2openid(code); console.log(`[Subscribe] openid=${openid.slice(0, 8)}...`) }
    catch { res.json({ ok: true, note: 'openid 获取失败，已跳过' }); return }
    const subscribers = _sessions[idx].subscribers ?? []
    if (!subscribers.includes(openid)) subscribers.push(openid)
    _sessions[idx].subscribers = subscribers
    _sessions[idx].updatedAt = new Date().toISOString()
    _flushCOS()
    console.log(`[Subscribe] 已存储 sid=${req.params.sid} 共${subscribers.length}人`)
    res.json({ ok: true })
  } catch (e) { console.error('[POST subscribe]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /session/:sid/order — 提交点单
app.post('/session/:sid/order', async (req, res) => {
  try {
    const payload: OrderPayload = req.body
    if (!payload?.items?.length) { res.status(400).json({ error: '点单为空' }); return }
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }

    sendPush(payload).catch(e => console.warn('[Push]', e))

    const existing = _sessions[idx].items
    payload.items.forEach(submitted => {
      const found = existing.find(i => i.dish.id === submitted.dish.id)
      if (found) found.submittedQty = (found.submittedQty ?? 0) + submitted.quantity
      else existing.push({ ...submitted, submittedQty: submitted.quantity })
    })
    _sessions[idx].updatedAt = new Date().toISOString()

    // 提交点单时同步到 COS（等待完成，保证数据不丢）
    await cosPut(SESSIONS_KEY, _sessions)
    console.log(`[order] 提交成功 sid=${req.params.sid} items=${payload.items.length}`)
    res.json({ ok: true })
  } catch (e) { console.error('[POST order]', e); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /session/:sid/close — 关闭工单
app.put('/session/:sid/close', async (req, res) => {
  try {
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.json({ ok: true, note: '工单已是关闭状态' }); return }

    _sessions[idx].status = 'closed'
    _sessions[idx].updatedAt = new Date().toISOString()
    await cosPut(SESSIONS_KEY, _sessions)

    const subscribers = _sessions[idx].subscribers ?? []
    if (subscribers.length) {
      Promise.all(subscribers.map(openid =>
        sendSubscribeMsg(openid, _sessions[idx]).catch(e => console.warn(`[Subscribe] 发送失败 openid=${openid}`, e))
      )).then(() => console.log(`[Subscribe] 已向 ${subscribers.length} 位用户发送通知`))
    }
    console.log(`[close] 关闭 sid=${req.params.sid}`)
    res.json({ ok: true, notified: subscribers.length })
  } catch (e) { console.error('[PUT close]', e); res.status(500).json({ error: '服务器错误' }) }
})

// ── 启动 ──────────────────────────────────────────────────────────────────────
initFromCOS().then(() => {
  app.listen(PORT, () => console.log(`[kitchen-api] 就绪，监听 :${PORT}`))
})
