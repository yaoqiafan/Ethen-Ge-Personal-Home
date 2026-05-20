import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import COS from 'cos-nodejs-sdk-v5'
import { scSend } from 'serverchan-sdk'

// ── 环境变量 ──────────────────────────────────────────────────────────────────
const PORT       = Number(process.env.PORT)       || 3004
const SECRET_ID  = process.env.COS_SECRET_ID      || ''
const SECRET_KEY = process.env.COS_SECRET_KEY     || ''
const BUCKET     = process.env.COS_BUCKET         || ''
const REGION     = process.env.COS_REGION         || ''
const PUSH_KEY   = process.env.PUSH_KEY           || ''

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
  items: CartItem[]; createdAt: string; updatedAt: string
}

// ── COS 实例 ──────────────────────────────────────────────────────────────────
const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY })

const DISHES_KEY   = 'kitchen/dishes.json'
const SESSIONS_KEY = 'kitchen/sessions.json'

function cosGet<T>(key: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, data) => {
      if (err) { resolve(fallback); return }
      try {
        const text = typeof data.Body === 'string'
          ? data.Body
          : Buffer.from(data.Body as ArrayBuffer).toString('utf-8')
        resolve(JSON.parse(text) as T)
      } catch {
        resolve(fallback)
      }
    })
  })
}

function cosPut(key: string, body: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    cos.putObject(
      { Bucket: BUCKET, Region: REGION, Key: key,
        Body: JSON.stringify(body, null, 2), ContentType: 'application/json' },
      (err) => err ? reject(new Error(err.message)) : resolve()
    )
  })
}

// ── 推送通知 ──────────────────────────────────────────────────────────────────
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
    const active = sessions.filter(s => s.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!active) { res.json({ found: false }); return }
    res.json({ found: true, sid: active.id, name: active.name })
  } catch (e) {
    console.error('[GET sessions/active]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

// GET /session/:sid — 验证工单并返回菜单
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
    res.json({ valid: true, session, dishes })
  } catch (e) {
    console.error('[GET session]', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

// PUT /session/:sid/cart — 同步购物车到 COS
app.put('/session/:sid/cart', async (req, res) => {
  try {
    const items: CartItem[] = req.body?.items
    if (!Array.isArray(items)) { res.status(400).json({ error: '参数错误' }); return }

    const sessions = await cosGet<OrderSession[]>(SESSIONS_KEY, [])
    const idx = sessions.findIndex(s => s.id === req.params.sid)
    if (idx === -1) { res.status(404).json({ error: '工单不存在' }); return }
    if (sessions[idx].status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }

    sessions[idx] = { ...sessions[idx], items, updatedAt: new Date().toISOString() }
    await cosPut(SESSIONS_KEY, sessions)
    res.json({ ok: true })
  } catch (e) {
    console.error('[PUT cart]', e)
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

    // 推送通知（失败不阻塞响应）
    sendPush(payload).catch(e => console.warn('[Push]', e))

    // 将增量 items 的 submittedQty 更新到 session cart
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

app.listen(PORT, () => console.log(`[kitchen-api] 监听 :${PORT}`))
