import 'dotenv/config'
import { createHmac, createHash } from 'crypto'
import { request as httpsRequest } from 'https'
import { Agent, setGlobalDispatcher } from 'undici'
import express from 'express'
import cors from 'cors'
import { scSend } from 'serverchan-sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'

// COS 走 undici fetch，强制 IPv4
setGlobalDispatcher(new Agent({ connect: { family: 4 } }))

// 微信 API 用原生 https 模块（undici 与微信 TLS 握手不兼容）
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
        res.on('data', (c) => { raw += c })
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
const PORT       = Number(process.env.PORT)             || 3004
const SECRET_ID  = process.env.COS_SECRET_ID            || ''
const SECRET_KEY = process.env.COS_SECRET_KEY           || ''
const BUCKET     = process.env.COS_BUCKET               || ''
const REGION     = process.env.COS_REGION               || ''
const PUSH_KEY   = process.env.PUSH_KEY                 || ''
const WX_APP_ID  = process.env.WX_APP_ID                || ''
const WX_SECRET  = process.env.WX_APP_SECRET            || ''
const WX_TMPL_ID = process.env.WX_SUBSCRIBE_TEMPLATE_ID || ''

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

// ── 本地文件路径 ──────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dir = dirname(__filename)
const DATA_DIR    = join(__dir, 'data')
const AVATARS_DIR = join(__dir, 'avatars')
if (!existsSync(DATA_DIR))    mkdirSync(DATA_DIR,    { recursive: true })
if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true })
const LOCAL_SESSIONS = join(DATA_DIR, 'sessions.json')
const LOCAL_DISHES   = join(DATA_DIR, 'dishes.json')

// ── COS 工具（只做备份，失败仅警告）──────────────────────────────────────────
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

async function cosGet<T>(key: string): Promise<T | null> {
  const path = `/${key}`
  try {
    const res = await fetch(`${_cosBase()}${path}?_ts=${Date.now()}`, {
      headers: { Authorization: _cosAuth('GET', path), 'Cache-Control': 'no-store' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch { return null }
}

async function cosPut(key: string, body: unknown): Promise<void> {
  const path = `/${key}`
  const res = await fetch(`${_cosBase()}${path}`, {
    method: 'PUT',
    headers: { Authorization: _cosAuth('PUT', path), 'Content-Type': 'application/json' },
    body: JSON.stringify(body, null, 2),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ── 内存 + 本地文件存储（主存储），COS 作为异步备份 ──────────────────────────
let _sessions: OrderSession[] = []
let _dishes: Dish[] = []
let _ready = false
let _cosBackupTimer: ReturnType<typeof setTimeout> | null = null

function _saveLocal(): void {
  try { writeFileSync(LOCAL_SESSIONS, JSON.stringify(_sessions, null, 2)) } catch (e) { console.warn('[local] sessions 写入失败:', e) }
}

function _scheduleCosBackup(): void {
  // 防抖 3 秒，批量合并多次操作只上传一次
  if (_cosBackupTimer) clearTimeout(_cosBackupTimer)
  _cosBackupTimer = setTimeout(() => {
    _cosBackupTimer = null
    cosPut(SESSIONS_KEY, _sessions).catch(e => console.warn('[COS backup] sessions:', e.message))
  }, 3000)
}

function _persist(): void {
  _saveLocal()
  _scheduleCosBackup()
}

async function initData(): Promise<void> {
  // 1. 优先读本地文件（快速启动，无需等 COS）
  let localSessions: OrderSession[] | null = null
  let localDishes: Dish[] | null = null
  try {
    if (existsSync(LOCAL_SESSIONS)) localSessions = JSON.parse(readFileSync(LOCAL_SESSIONS, 'utf8'))
    if (existsSync(LOCAL_DISHES))   localDishes   = JSON.parse(readFileSync(LOCAL_DISHES, 'utf8'))
  } catch { }

  if (localSessions && localDishes) {
    _sessions = localSessions
    _dishes   = localDishes
    _ready    = true
    console.log(`[init] 本地文件加载完成: ${_sessions.length} 工单, ${_dishes.length} 菜品`)
    // 后台从 COS 拉取最新（防止多台服务器场景数据不一致）
    Promise.all([cosGet<OrderSession[]>(SESSIONS_KEY), cosGet<Dish[]>(DISHES_KEY)]).then(([s, d]) => {
      if (s) { _sessions = s; _saveLocal() }
      if (d) { _dishes = d; writeFileSync(LOCAL_DISHES, JSON.stringify(d, null, 2)) }
      if (s || d) console.log('[init] COS 后台同步完成')
    }).catch(() => {})
    return
  }

  // 2. 本地文件不存在（首次启动），等待 COS 加载
  console.log('[init] 首次启动，从 COS 加载数据...')
  for (let i = 0; i < 5; i++) {
    const [s, d] = await Promise.all([cosGet<OrderSession[]>(SESSIONS_KEY), cosGet<Dish[]>(DISHES_KEY)])
    if (s !== null && d !== null) {
      _sessions = s
      _dishes   = d
      _saveLocal()
      writeFileSync(LOCAL_DISHES, JSON.stringify(d, null, 2))
      _ready = true
      console.log(`[init] COS 加载完成: ${_sessions.length} 工单, ${_dishes.length} 菜品`)
      return
    }
    console.warn(`[init] COS 第 ${i + 1} 次加载失败，2s 后重试...`)
    await new Promise(r => setTimeout(r, 2000))
  }
  // 3. COS 也不可用，使用空数据启动
  _sessions = []; _dishes = []; _ready = true
  console.warn('[init] COS 不可用，以空数据启动')
}

function findSession(sid: string)  { return _sessions.find(s => s.id === sid) }
function sessionIndex(sid: string) { return _sessions.findIndex(s => s.id === sid) }

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

// ── 订阅消息 & 推送 ───────────────────────────────────────────────────────────
async function sendSubscribeMsg(openid: string, session: OrderSession): Promise<void> {
  if (!WX_TMPL_ID) return
  const token = await getWxToken()
  const fmt = (d: string) => new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const total = session.items.reduce((s, i) => s + i.quantity, 0)
  const result = await wxRequest<any>(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
    touser: openid, template_id: WX_TMPL_ID, page: 'pages/order/order', miniprogram_state: 'formal', lang: 'zh_CN',
    data: {
      thing1: { value: `${session.name.slice(0, 14)}，共${total}道菜` },
      phrase2: { value: '已完成' }, date3: { value: fmt(session.createdAt) },
      thing5: { value: '感谢用餐，欢迎下次光临！' }, time16: { value: fmt(new Date().toISOString()) },
    },
  })
  if (result.errcode && result.errcode !== 0) throw new Error(`${result.errmsg} (${result.errcode})`)
}

async function sendPush(payload: OrderPayload): Promise<void> {
  if (!PUSH_KEY) return
  const lines = payload.items.map(i => `${i.dish.name} × ${i.quantity}${i.preferences?.length ? ` [${i.preferences.join('、')}]` : ''}`)
  const title = `🍽️ 新点单 — ${payload.items.length} 道菜`
  const body  = [...lines, '', payload.note ? `备注：${payload.note}` : '', `时间：${new Date(payload.submittedAt).toLocaleString('zh-CN')}`].filter(Boolean).join('\n')
  const isSCT = PUSH_KEY.startsWith('SCT') || PUSH_KEY.startsWith('sct') || PUSH_KEY.includes('sctapi.ftqq.com')
  if (isSCT) {
    const key = PUSH_KEY.startsWith('http') ? PUSH_KEY.split('/').pop()?.replace('.send', '') || PUSH_KEY : PUSH_KEY
    await scSend(key, title, body, { tags: '厨房订单|新点单' })
  } else {
    const base = PUSH_KEY.startsWith('http') ? PUSH_KEY : `https://api.day.app/${PUSH_KEY}`
    const res = await fetch(`${base}/${encodeURIComponent(title)}/${encodeURIComponent(body)}?sound=minuet`)
    if (!res.ok) throw new Error(`Bark 推送失败 (${res.status})`)
  }
}

// ── Express ──────────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/avatars', express.static(AVATARS_DIR))

app.get('/health', (_req, res) => res.json({ ok: true, ready: _ready }))

app.use((_req, res, next) => {
  if (!_ready) { res.status(503).json({ error: '服务启动中，请稍后' }); return }
  next()
})

// POST /sessions — 创建工单
app.post('/sessions', (req, res) => {
  try {
    const name: string = req.body?.name?.trim()
    if (!name) { res.status(400).json({ error: '缺少工单名称' }); return }
    const now = new Date().toISOString()
    const s: OrderSession = { id: `s${Date.now()}`, name, status: 'active', items: [], createdAt: now, updatedAt: now }
    _sessions.push(s)
    _persist()
    console.log(`[sessions] 创建: ${s.id} name=${name}`)
    res.json(s)
  } catch (e) { console.error('[POST sessions]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /sessions/active
app.get('/sessions/active', (_req, res) => {
  try {
    const active = _sessions.filter(s => s.status === 'active').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    res.json(active ? { found: true, sid: active.id, name: active.name } : { found: false })
  } catch (e) { console.error('[GET sessions/active]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /session/:sid
app.get('/session/:sid', (req, res) => {
  try {
    const s = findSession(req.params.sid)
    if (!s || s.status === 'closed') { res.json({ valid: false }); return }
    res.json({ valid: true, session: s, dishes: _dishes, participantCount: s.participants?.length ?? 1, participantInfos: s.participantInfos ?? [] })
  } catch (e) { console.error('[GET session]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /avatar
app.post('/avatar', (req, res) => {
  try {
    const { deviceId, base64 } = req.body
    if (!deviceId || !base64) { res.status(400).json({ error: '缺少 deviceId 或 base64' }); return }
    const buf = Buffer.from(base64 as string, 'base64')
    if (buf.length > 1_500_000) { res.status(413).json({ error: '头像文件过大' }); return }
    writeFileSync(join(AVATARS_DIR, `${deviceId}.jpg`), buf)
    console.log(`[avatar] 保存 deviceId=${deviceId} size=${buf.length}`)
    res.json({ ok: true, url: `/api/kitchen/avatars/${deviceId}.jpg` })
  } catch (e) { console.error('[POST avatar]', e); res.status(500).json({ error: '头像上传失败' }) }
})

// PUT /session/:sid/participant
app.put('/session/:sid/participant', (req, res) => {
  try {
    const { deviceId, avatarUrl, nickName } = req.body
    if (!deviceId) { res.status(400).json({ error: '缺少 deviceId' }); return }
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }
    const infos = _sessions[idx].participantInfos ?? []
    const ei = infos.findIndex(p => p.deviceId === deviceId)
    const info: ParticipantInfo = { deviceId, avatarUrl: avatarUrl || '', nickName: nickName || '', updatedAt: new Date().toISOString() }
    if (ei >= 0) infos[ei] = info; else infos.push(info)
    const parts = _sessions[idx].participants ?? []
    if (!parts.includes(deviceId)) parts.push(deviceId)
    _sessions[idx].participantInfos = infos
    _sessions[idx].participants = parts
    _sessions[idx].updatedAt = new Date().toISOString()
    _persist()
    res.json({ ok: true })
  } catch (e) { console.error('[PUT participant]', e); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /session/:sid/cart
app.put('/session/:sid/cart', (req, res) => {
  try {
    const items: CartItem[] = req.body?.items
    const deviceId: string  = req.body?.deviceId || ''
    if (!Array.isArray(items)) { res.status(400).json({ error: '参数错误' }); return }
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }
    const parts = _sessions[idx].participants ?? []
    if (deviceId && !parts.includes(deviceId)) parts.push(deviceId)
    const existing  = _sessions[idx].items ?? []
    const others    = deviceId ? existing.filter(i => i.deviceId && i.deviceId !== deviceId) : []
    const mine: CartItem[] = items.map(i => ({ ...i, deviceId: deviceId || undefined }))
    _sessions[idx].items        = [...others, ...mine]
    _sessions[idx].participants = parts
    _sessions[idx].updatedAt    = new Date().toISOString()
    _persist()
    res.json({ ok: true, participantCount: parts.length })
  } catch (e) { console.error('[PUT cart]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /session/:sid/subscribe
app.post('/session/:sid/subscribe', async (req, res) => {
  if (!WX_APP_ID || !WX_SECRET) { res.json({ ok: true, note: '未配置微信参数，已跳过' }); return }
  try {
    const { code } = req.body
    if (!code) { res.status(400).json({ error: '缺少 code' }); return }
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    let openid: string
    try { openid = await code2openid(code) }
    catch { res.json({ ok: true, note: 'openid 获取失败，已跳过' }); return }
    const subs = _sessions[idx].subscribers ?? []
    if (!subs.includes(openid)) subs.push(openid)
    _sessions[idx].subscribers = subs
    _sessions[idx].updatedAt   = new Date().toISOString()
    _persist()
    console.log(`[Subscribe] 已存储 sid=${req.params.sid} 共${subs.length}人`)
    res.json({ ok: true })
  } catch (e) { console.error('[POST subscribe]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /session/:sid/order
app.post('/session/:sid/order', async (req, res) => {
  try {
    const payload: OrderPayload = req.body
    if (!payload?.items?.length) { res.status(400).json({ error: '点单为空' }); return }
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }
    sendPush(payload).catch(e => console.warn('[Push]', e))
    const existing = _sessions[idx].items
    payload.items.forEach(sub => {
      const found = existing.find(i => i.dish.id === sub.dish.id)
      if (found) found.submittedQty = (found.submittedQty ?? 0) + sub.quantity
      else existing.push({ ...sub, submittedQty: sub.quantity })
    })
    _sessions[idx].updatedAt = new Date().toISOString()
    _saveLocal()  // 立即落盘
    cosPut(SESSIONS_KEY, _sessions).catch(e => console.warn('[COS] order 备份失败:', e.message))
    console.log(`[order] 提交成功 sid=${req.params.sid} items=${payload.items.length}`)
    res.json({ ok: true })
  } catch (e) { console.error('[POST order]', e); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /session/:sid/close
app.put('/session/:sid/close', async (req, res) => {
  try {
    const idx = sessionIndex(req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (_sessions[idx].status === 'closed') { res.json({ ok: true, note: '工单已是关闭状态' }); return }
    _sessions[idx].status    = 'closed'
    _sessions[idx].updatedAt = new Date().toISOString()
    _saveLocal()
    cosPut(SESSIONS_KEY, _sessions).catch(e => console.warn('[COS] close 备份失败:', e.message))
    const subs = _sessions[idx].subscribers ?? []
    if (subs.length) {
      Promise.all(subs.map(o => sendSubscribeMsg(o, _sessions[idx]).catch(e => console.warn(`[Subscribe] 发送失败`, e))))
        .then(() => console.log(`[Subscribe] 已向 ${subs.length} 位用户发送通知`))
    }
    console.log(`[close] 关闭 sid=${req.params.sid}`)
    res.json({ ok: true, notified: subs.length })
  } catch (e) { console.error('[PUT close]', e); res.status(500).json({ error: '服务器错误' }) }
})

// ── 启动 ──────────────────────────────────────────────────────────────────────
initData().then(() => {
  app.listen(PORT, () => console.log(`[kitchen-api] 就绪，监听 :${PORT}`))
})
