import 'dotenv/config'
import { createHmac, createHash } from 'crypto'
import { request as httpsRequest } from 'https'
import { Agent, setGlobalDispatcher } from 'undici'
import express from 'express'
import cors from 'cors'
import { scSend } from 'serverchan-sdk'

// COS 调用走 undici fetch，强制 IPv4
setGlobalDispatcher(new Agent({ connect: { family: 4 } }))

// 微信 API 用 Node.js 原生 https 模块（undici/fetch 的 OpenSSL 与微信服务器 TLS 握手不兼容）
// ALPNProtocols 强制只协商 http/1.1，与 curl/Schannel 行为一致，避免 OpenSSL 等待 ALPN 回复挂死
function wxRequest<T>(url: string, postBody?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = postBody ? JSON.stringify(postBody) : undefined
    const req = httpsRequest(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: payload ? 'POST' : 'GET',
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {},
        // 明确只使用 TLS 1.2 + HTTP/1.1，匹配微信服务器实际支持的配置
        minVersion: 'TLSv1.2' as any,
        maxVersion: 'TLSv1.3' as any,
        ALPNProtocols: ['http/1.1'],
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => { raw += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(raw) as T) }
          catch (e) { reject(e) }
        })
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
// 注意：模板字段名需与公众平台实际模板一致，请按需修改 sendSubscribeMsg 中的 data 字段
const WX_TMPL_ID  = process.env.WX_SUBSCRIBE_TEMPLATE_ID      || ''

// ── 类型定义（与 src/types/kitchen.ts 保持同步）────────────────────────────────
type DishCategory = '荤菜' | '素菜' | '汤羹' | '主食' | '小吃'
type SessionStatus = 'active' | 'closed'

interface Dish {
  id: string; name: string; category: DishCategory
  description: string; imageUrl: string
  available: boolean; price: number
  createdAt: string; isCustom?: boolean
}
interface CartItem {
  dish: Dish; quantity: number
  submittedQty?: number
  preferences?: string[]
}
interface OrderPayload {
  items: CartItem[]; note: string; submittedAt: string
}
interface OrderSession {
  id: string; name: string; status: SessionStatus
  items: CartItem[]
  participants?: string[]   // 各设备 ID（用于统计人数）
  subscribers?: string[]   // 同意订阅消息的用户 openid
  createdAt: string; updatedAt: string
}

// ── COS 请求签名（腾讯云 COS v5 签名算法，无需 SDK）────────────────────────────
const DISHES_KEY   = 'kitchen/dishes.json'
const SESSIONS_KEY = 'kitchen/sessions.json'

function _cosAuth(method: string, urlPath: string): string {
  const now   = Math.floor(Date.now() / 1000)
  const keyTime  = `${now};${now + 3600}`
  const signKey  = createHmac('sha1', SECRET_KEY).update(keyTime).digest('hex')
  const httpStr  = `${method.toLowerCase()}\n${urlPath}\n\n\n`
  const strToSign = `sha1\n${keyTime}\n${createHash('sha1').update(httpStr).digest('hex')}\n`
  const sig      = createHmac('sha1', signKey).update(strToSign).digest('hex')
  return `q-sign-algorithm=sha1&q-ak=${SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=&q-url-param-list=&q-signature=${sig}`
}

const _cosBase = () => `https://${BUCKET}.cos.${REGION}.myqcloud.com`

async function cosGet<T>(key: string, fallback: T): Promise<T> {
  const path = `/${key}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${_cosBase()}${path}`, {
        headers: { Authorization: _cosAuth('GET', path) },
      })
      if (!res.ok) return fallback
      return await res.json() as T
    } catch (e) {
      if (attempt === 2) {
        console.warn(`[cosGet] ${key} 第 ${attempt + 1} 次失败，放弃:`, (e as Error).message)
        return fallback
      }
      console.warn(`[cosGet] ${key} 第 ${attempt + 1} 次失败，300ms 后重试:`, (e as Error).message)
      await new Promise(r => setTimeout(r, 300))
    }
  }
  return fallback
}

async function cosPut(key: string, body: unknown): Promise<void> {
  const path    = `/${key}`
  const content = JSON.stringify(body, null, 2)
  const res = await fetch(`${_cosBase()}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: _cosAuth('PUT', path),
      'Content-Type': 'application/json',
    },
    body: content,
  })
  if (!res.ok) throw new Error(`COS PUT failed: ${res.status} ${await res.text()}`)
}

// ── 微信 access_token（内存缓存，提前 5 分钟刷新）──────────────────────────────
let _wxToken = ''
let _wxTokenExp = 0

async function getWxToken(): Promise<string> {
  if (_wxToken && Date.now() < _wxTokenExp) return _wxToken
  if (!WX_APP_ID || !WX_SECRET) throw new Error('未配置 WX_APP_ID / WX_APP_SECRET')
  const d = await wxRequest<any>(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APP_ID}&secret=${WX_SECRET}`)
  if (!d.access_token) throw new Error(`获取 access_token 失败: ${d.errmsg}`)
  _wxToken = d.access_token
  _wxTokenExp = Date.now() + (d.expires_in - 300) * 1000
  return _wxToken
}

// ── 微信 code 换 openid ────────────────────────────────────────────────────────
async function code2openid(code: string): Promise<string> {
  const d = await wxRequest<any>(`https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APP_ID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`)
  if (!d.openid) throw new Error(`code2session 失败: ${d.errmsg}`)
  return d.openid as string
}

// ── 发送订阅消息 ───────────────────────────────────────────────────────────────
async function sendSubscribeMsg(openid: string, session: OrderSession): Promise<void> {
  if (!WX_TMPL_ID) { console.log('[Subscribe] 未配置 WX_SUBSCRIBE_TEMPLATE_ID，跳过'); return }
  const token = await getWxToken()
  const totalDishes = session.items.reduce((s, i) => s + i.quantity, 0)
  const endTime = new Date().toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // 模板「订单状态提醒」(524) 字段：
  //   thing1  → 订单内容
  //   phrase2 → 订单状态（固定短语，如"已完成"）
  //   date3   → 下单时间
  //   thing5  → 备注
  //   time16  → 完成时间
  const startTime = new Date(session.createdAt).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const body = {
    touser: openid,
    template_id: WX_TMPL_ID,
    page: 'pages/order/order',
    miniprogram_state: 'formal',
    lang: 'zh_CN',
    data: {
      thing1:  { value: `${session.name.slice(0, 14)}，共${totalDishes}道菜` },
      phrase2: { value: '已完成' },
      date3:   { value: startTime },
      thing5:  { value: '感谢用餐，欢迎下次光临！' },
      time16:  { value: endTime },
    },
  }

  const result = await wxRequest<any>(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, body)
  if (result.errcode && result.errcode !== 0) {
    throw new Error(`订阅消息发送失败: ${result.errmsg} (${result.errcode})`)
  }
}

// ── 推送通知（Server酱 / Bark）────────────────────────────────────────────────
function buildPushText(payload: OrderPayload): { title: string; body: string } {
  const lines = payload.items.map(item => {
    const pref = item.preferences?.length ? ` [${item.preferences.join('、')}]` : ''
    return `${item.dish.name} × ${item.quantity}${pref}`
  })
  const title = `🍽️ 新点单 — ${payload.items.length} 道菜`
  const body = [
    ...lines,
    '',
    payload.note ? `备注：${payload.note}` : '',
    `时间：${new Date(payload.submittedAt).toLocaleString('zh-CN')}`,
  ].filter(Boolean).join('\n')
  return { title, body }
}

async function sendPush(payload: OrderPayload): Promise<void> {
  if (!PUSH_KEY) {
    console.log('[Push] 未配置 PUSH_KEY，跳过推送')
    return
  }
  const { title, body } = buildPushText(payload)
  const isSCT = PUSH_KEY.startsWith('SCT') || PUSH_KEY.startsWith('sct')
    || PUSH_KEY.includes('sctapi.ftqq.com') || PUSH_KEY.includes('sc.ftqq.com')

  if (isSCT) {
    const key = PUSH_KEY.startsWith('http')
      ? PUSH_KEY.split('/').pop()?.replace('.send', '') || PUSH_KEY
      : PUSH_KEY
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
app.use(express.json())

// 健康检查
app.get('/health', (_req, res) => res.json({ ok: true }))

// GET /sessions/active — 返回最新的活跃工单（无需 sid）
app.get('/sessions/active', async (_req, res) => {
  try {
    const sessions = await cosGet<OrderSession[]>(SESSIONS_KEY, [])
    console.log(`[sessions/active] COS 读取 ${sessions.length} 个工单，active: ${sessions.filter(s=>s.status==='active').length} 个`)
    const active = sessions.filter(s => s.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!active) { res.json({ found: false }); return }
    res.json({ found: true, sid: active.id, name: active.name })
  } catch (e) {
    console.error('[GET sessions/active]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

// GET /session/:sid — 验证工单并返回菜单 + 人数
app.get('/session/:sid', async (req, res) => {
  try {
    const [sessions, dishes] = await Promise.all([
      cosGet<OrderSession[]>(SESSIONS_KEY, []),
      cosGet<Dish[]>(DISHES_KEY, []),
    ])
    const session = sessions.find(s => s.id === req.params.sid)
    if (!session || session.status === 'closed') {
      res.json({ valid: false })
      return
    }
    res.json({
      valid: true,
      session,
      dishes,
      participantCount: session.participants?.length ?? 1,
    })
  } catch (e) {
    console.error('[GET session]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

// PUT /session/:sid/cart — 同步购物车，记录参与设备
app.put('/session/:sid/cart', async (req, res) => {
  try {
    const items: CartItem[] = req.body?.items
    const deviceId: string = req.body?.deviceId || ''
    if (!Array.isArray(items)) { res.status(400).json({ error: '参数错误' }); return }

    const sessions = await cosGet<OrderSession[]>(SESSIONS_KEY, [])
    const idx = sessions.findIndex(s => s.id === req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }

    // 记录参与设备（去重）
    const participants = sessions[idx].participants ?? []
    if (deviceId && !participants.includes(deviceId)) participants.push(deviceId)

    sessions[idx] = {
      ...sessions[idx],
      items,
      participants,
      updatedAt: new Date().toISOString(),
    }
    await cosPut(SESSIONS_KEY, sessions)
    res.json({ ok: true, participantCount: participants.length })
  } catch (e) {
    console.error('[PUT cart]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /session/:sid/subscribe — 用户订阅消息：code 换 openid 并存储
app.post('/session/:sid/subscribe', async (req, res) => {
  console.log(`[Subscribe] 收到请求 sid=${req.params.sid}`)
  if (!WX_APP_ID || !WX_SECRET) {
    console.warn('[Subscribe] 未配置 WX_APP_ID / WX_APP_SECRET，跳过')
    res.json({ ok: true, note: '未配置 WX_APP_SECRET，已跳过' })
    return
  }
  try {
    const { code } = req.body
    if (!code) { res.status(400).json({ error: '缺少 code' }); return }

    const sessions = await cosGet<OrderSession[]>(SESSIONS_KEY, [])
    const idx = sessions.findIndex(s => s.id === req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }

    let openid: string
    try {
      openid = await code2openid(code)
      console.log(`[Subscribe] code2openid 成功 openid=${openid.slice(0, 8)}...`)
    } catch (e: any) {
      console.warn('[Subscribe] code2openid 失败:', e.message)
      res.json({ ok: true, note: 'openid 获取失败，已跳过' })
      return
    }

    const subscribers = sessions[idx].subscribers ?? []
    if (!subscribers.includes(openid)) subscribers.push(openid)
    sessions[idx] = { ...sessions[idx], subscribers, updatedAt: new Date().toISOString() }
    await cosPut(SESSIONS_KEY, sessions)
    console.log(`[Subscribe] openid 已存储 sid=${req.params.sid} 共${subscribers.length}人`)
    res.json({ ok: true })
  } catch (e) {
    console.error('[POST subscribe]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /session/:sid/order — 提交点单并推送通知
app.post('/session/:sid/order', async (req, res) => {
  try {
    const payload: OrderPayload = req.body
    if (!payload?.items?.length) { res.status(400).json({ error: '点单为空' }); return }

    const sessions = await cosGet<OrderSession[]>(SESSIONS_KEY, [])
    const idx = sessions.findIndex(s => s.id === req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }

    sendPush(payload).catch(e => console.warn('[Push]', e))

    const existing = sessions[idx].items
    payload.items.forEach(submitted => {
      const found = existing.find(i => i.dish.id === submitted.dish.id)
      if (found) {
        found.submittedQty = (found.submittedQty ?? 0) + submitted.quantity
      } else {
        existing.push({ ...submitted, submittedQty: submitted.quantity })
      }
    })
    sessions[idx].updatedAt = new Date().toISOString()
    await cosPut(SESSIONS_KEY, sessions)

    res.json({ ok: true })
  } catch (e) {
    console.error('[POST order]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

// PUT /session/:sid/close — 关闭工单并向所有订阅用户推送消息
app.put('/session/:sid/close', async (req, res) => {
  try {
    const sessions = await cosGet<OrderSession[]>(SESSIONS_KEY, [])
    const idx = sessions.findIndex(s => s.id === req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (sessions[idx].status === 'closed') { res.json({ ok: true, note: '工单已是关闭状态' }); return }

    sessions[idx] = { ...sessions[idx], status: 'closed', updatedAt: new Date().toISOString() }
    await cosPut(SESSIONS_KEY, sessions)

    // 向所有订阅用户发送消息（失败不阻塞响应）
    const subscribers = sessions[idx].subscribers ?? []
    if (subscribers.length) {
      Promise.all(subscribers.map(openid =>
        sendSubscribeMsg(openid, sessions[idx]).catch(e =>
          console.warn(`[Subscribe] 发送失败 openid=${openid}`, e)
        )
      )).then(() => console.log(`[Subscribe] 已向 ${subscribers.length} 位用户发送工单结束通知`))
    } else {
      console.log('[Subscribe] 无订阅用户')
    }

    res.json({ ok: true, notified: subscribers.length })
  } catch (e) {
    console.error('[PUT close]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.listen(PORT, () => console.log(`[kitchen-api] 监听 :${PORT}`))
