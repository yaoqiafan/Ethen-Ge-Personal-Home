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
import Database from 'better-sqlite3'

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
interface OrderPayload { items: CartItem[]; note: string; submittedAt: string; subscribeCode?: string }
interface ParticipantInfo { deviceId: string; avatarUrl: string; nickName: string; updatedAt: string }
interface OrderSession {
  id: string; name: string; status: SessionStatus; items: CartItem[]
  participants?: string[]; participantInfos?: ParticipantInfo[]
  createdAt: string; updatedAt: string
}

// ── 目录 ──────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dir      = dirname(__filename)
const DATA_DIR    = join(__dir, 'data')
const AVATARS_DIR = join(__dir, 'avatars')
if (!existsSync(DATA_DIR))    mkdirSync(DATA_DIR,    { recursive: true })
if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true })

// ── SQLite 初始化 ─────────────────────────────────────────────────────────────
const db = new Database(join(DATA_DIR, 'kitchen.db'))
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS dishes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT '荤菜',
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT NOT NULL DEFAULT '',
    available   INTEGER NOT NULL DEFAULT 1,
    price       REAL NOT NULL DEFAULT 0,
    is_custom   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS participants (
    session_id TEXT NOT NULL,
    device_id  TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    nick_name  TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (session_id, device_id)
  );
  CREATE TABLE IF NOT EXISTS cart_items (
    session_id    TEXT NOT NULL,
    device_id     TEXT NOT NULL DEFAULT '',
    dish_id       TEXT NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 0,
    submitted_qty INTEGER NOT NULL DEFAULT 0,
    preferences   TEXT NOT NULL DEFAULT '[]',
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (session_id, device_id, dish_id)
  );
`)

// ── SQLite 数据层 ─────────────────────────────────────────────────────────────

function rowToDish(row: any): Dish {
  return {
    id: row.id, name: row.name, category: row.category as DishCategory,
    description: row.description, imageUrl: row.image_url,
    available: row.available === 1, price: row.price,
    createdAt: row.created_at,
    ...(row.is_custom ? { isCustom: true } : {}),
  }
}

function getAllDishes(): Dish[] {
  return (db.prepare('SELECT * FROM dishes WHERE is_custom = 0 ORDER BY created_at').all() as any[]).map(rowToDish)
}

function getDish(id: string): Dish | undefined {
  const row = db.prepare('SELECT * FROM dishes WHERE id = ?').get(id) as any
  return row ? rowToDish(row) : undefined
}

function upsertDish(dish: Dish): void {
  db.prepare(`
    INSERT INTO dishes (id,name,category,description,image_url,available,price,is_custom,created_at)
    VALUES (@id,@name,@category,@description,@imageUrl,@available,@price,@isCustom,@createdAt)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, category=excluded.category, description=excluded.description,
      image_url=excluded.image_url, available=excluded.available, price=excluded.price
  `).run({
    id: dish.id, name: dish.name, category: dish.category,
    description: dish.description || '', imageUrl: dish.imageUrl || '',
    available: dish.available ? 1 : 0, price: dish.price || 0,
    isCustom: dish.isCustom ? 1 : 0, createdAt: dish.createdAt,
  })
}

function buildSessionItems(sessionId: string): CartItem[] {
  const rows = db.prepare('SELECT * FROM cart_items WHERE session_id = ?').all(sessionId) as any[]
  const result: CartItem[] = []
  for (const ci of rows) {
    const dish = getDish(ci.dish_id)
    if (!dish) continue
    result.push({
      dish, quantity: ci.quantity, submittedQty: ci.submitted_qty || 0,
      preferences: JSON.parse(ci.preferences || '[]'),
      deviceId: ci.device_id || undefined,
    })
  }
  return result
}

function buildParticipants(sessionId: string): { ids: string[]; infos: ParticipantInfo[] } {
  const rows = db.prepare('SELECT * FROM participants WHERE session_id = ?').all(sessionId) as any[]
  return {
    ids:   rows.map(r => r.device_id as string),
    infos: rows.map(r => ({
      deviceId: r.device_id as string, avatarUrl: r.avatar_url as string,
      nickName: r.nick_name as string, updatedAt: r.updated_at as string,
    })),
  }
}

function buildFullSession(sessionId: string): OrderSession | undefined {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any
  if (!row) return undefined
  const { ids, infos } = buildParticipants(sessionId)
  return {
    id: row.id, name: row.name, status: row.status as SessionStatus,
    items: buildSessionItems(sessionId),
    participants: ids, participantInfos: infos,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

// ── JSON → SQLite 一次性迁移（首次启动自动执行）────────────────────────────
function migrateIfNeeded(): void {
  const dishCount    = (db.prepare('SELECT COUNT(*) as c FROM dishes').get()   as any).c
  const sessionCount = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as any).c
  if (dishCount > 0 || sessionCount > 0) return

  const DISHES_FILE   = join(DATA_DIR, 'dishes.json')
  const SESSIONS_FILE = join(DATA_DIR, 'sessions.json')
  if (!existsSync(DISHES_FILE) && !existsSync(SESSIONS_FILE)) return

  console.log('[migrate] 检测到旧 JSON 数据，开始迁移到 SQLite...')
  const tx = db.transaction(() => {
    if (existsSync(DISHES_FILE)) {
      try {
        const dishes: Dish[] = JSON.parse(readFileSync(DISHES_FILE, 'utf8'))
        for (const d of dishes) upsertDish(d)
        console.log(`[migrate] 菜品: ${dishes.length} 条`)
      } catch (e) { console.warn('[migrate] dishes 失败:', e) }
    }
    if (existsSync(SESSIONS_FILE)) {
      try {
        const sessions: OrderSession[] = JSON.parse(readFileSync(SESSIONS_FILE, 'utf8'))
        for (const s of sessions) {
          db.prepare('INSERT OR IGNORE INTO sessions (id,name,status,created_at,updated_at) VALUES (?,?,?,?,?)').run(s.id, s.name, s.status, s.createdAt, s.updatedAt)
          for (const p of s.participantInfos ?? []) {
            db.prepare('INSERT OR REPLACE INTO participants (session_id,device_id,avatar_url,nick_name,updated_at) VALUES (?,?,?,?,?)').run(s.id, p.deviceId, p.avatarUrl, p.nickName, p.updatedAt)
          }
          for (const item of s.items ?? []) {
            upsertDish(item.dish)
            db.prepare('INSERT OR REPLACE INTO cart_items (session_id,device_id,dish_id,quantity,submitted_qty,preferences,updated_at) VALUES (?,?,?,?,?,?,?)').run(s.id, item.deviceId || '', item.dish.id, item.quantity, item.submittedQty || 0, JSON.stringify(item.preferences || []), new Date().toISOString())
          }
        }
        console.log(`[migrate] 工单: ${sessions.length} 条`)
      } catch (e) { console.warn('[migrate] sessions 失败:', e) }
    }
  })
  tx()
  console.log('[migrate] 迁移完成')
}

// ── COS 工具（仅用于图片上传）────────────────────────────────────────────────
function _cosAuth(method: string, urlPath: string): string {
  const now     = Math.floor(Date.now() / 1000)
  const keyTime = `${now};${now + 3600}`
  const signKey = createHmac('sha1', SECRET_KEY).update(keyTime).digest('hex')
  const httpStr = `${method.toLowerCase()}\n${urlPath}\n\n\n`
  const strToSign = `sha1\n${keyTime}\n${createHash('sha1').update(httpStr).digest('hex')}\n`
  const sig = createHmac('sha1', signKey).update(strToSign).digest('hex')
  return `q-sign-algorithm=sha1&q-ak=${SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=&q-url-param-list=&q-signature=${sig}`
}
const _cosBase = () => `https://${BUCKET}.cos.${REGION}.myqcloud.com`

async function cosUploadImage(key: string, buf: Buffer, contentType = 'image/jpeg'): Promise<string> {
  const path = `/${key}`
  const res = await fetch(`${_cosBase()}${path}`, {
    method: 'PUT',
    headers: { Authorization: _cosAuth('PUT', path), 'Content-Type': contentType, 'Content-Length': String(buf.length) },
    body: buf,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`COS upload failed: HTTP ${res.status}`)
  return `${_cosBase()}${path}`
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

async function sendSubscribeMsgByCode(code: string, payload: OrderPayload, sessionName: string): Promise<void> {
  if (!WX_TMPL_ID || !WX_APP_ID || !WX_SECRET) return
  let openid: string
  try { openid = await code2openid(code) } catch (e: any) { console.warn('[Subscribe] code2openid 失败:', e.message); return }
  const token = await getWxToken()
  const fmt = (d: string) => new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const dishList = payload.items.map(i => `${i.dish.name}×${i.quantity - (i.submittedQty ?? 0)}`).join('、').slice(0, 20)
  const result = await wxRequest<any>(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
    touser: openid, template_id: WX_TMPL_ID, page: 'pages/order/order', miniprogram_state: 'formal', lang: 'zh_CN',
    data: {
      thing1:  { value: `${sessionName.slice(0, 10)}：${dishList}` },
      phrase2: { value: '已收到' },
      date3:   { value: fmt(payload.submittedAt) },
      thing5:  { value: '大厨正在为您准备，请耐心等候' },
      time16:  { value: fmt(new Date().toISOString()) },
    },
  })
  if (result.errcode && result.errcode !== 0) console.warn(`[Subscribe] 发送失败: ${result.errmsg} (${result.errcode})`)
  else console.log(`[Subscribe] 通知已发送 openid=${openid.slice(0, 8)}...`)
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
app.use(express.json({ limit: '5mb' }))
app.use('/avatars', express.static(AVATARS_DIR))

app.get('/health', (_req, res) => res.json({ ok: true }))

// POST /sessions — 创建工单
app.post('/sessions', (req, res) => {
  try {
    const name: string = req.body?.name?.trim()
    if (!name) { res.status(400).json({ error: '缺少工单名称' }); return }
    const now = new Date().toISOString()
    const id  = `s${Date.now()}`
    db.prepare('INSERT INTO sessions (id,name,status,created_at,updated_at) VALUES (?,?,?,?,?)').run(id, name, 'active', now, now)
    console.log(`[sessions] 创建: ${id} name=${name}`)
    res.json({ id, name, status: 'active', items: [], createdAt: now, updatedAt: now })
  } catch (e) { console.error('[POST sessions]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /sessions/active
app.get('/sessions/active', (_req, res) => {
  try {
    const row = db.prepare("SELECT * FROM sessions WHERE status='active' ORDER BY created_at DESC LIMIT 1").get() as any
    res.json(row ? { found: true, sid: row.id, name: row.name } : { found: false })
  } catch (e) { console.error('[GET sessions/active]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /session/:sid
app.get('/session/:sid', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sid) as any
    if (!row || row.status === 'closed') { res.json({ valid: false }); return }
    const session = buildFullSession(req.params.sid)!
    const dishes  = getAllDishes()
    res.json({ valid: true, session, dishes, participantCount: session.participants?.length ?? 0, participantInfos: session.participantInfos ?? [] })
  } catch (e) { console.error('[GET session]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /avatar — 保存参与者头像到本地
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
    const row = db.prepare('SELECT status FROM sessions WHERE id = ?').get(req.params.sid) as any
    if (!row) { res.status(404).json({ error: '工单不存在' }); return }
    if (row.status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }
    const now = new Date().toISOString()
    db.prepare('INSERT OR REPLACE INTO participants (session_id,device_id,avatar_url,nick_name,updated_at) VALUES (?,?,?,?,?)').run(req.params.sid, deviceId, avatarUrl || '', nickName || '', now)
    db.prepare('UPDATE sessions SET updated_at=? WHERE id=?').run(now, req.params.sid)
    res.json({ ok: true })
  } catch (e) { console.error('[PUT participant]', e); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /session/:sid/cart
app.put('/session/:sid/cart', (req, res) => {
  try {
    const items: CartItem[] = req.body?.items
    const deviceId: string  = req.body?.deviceId || ''
    if (!Array.isArray(items)) { res.status(400).json({ error: '参数错误' }); return }
    const row = db.prepare('SELECT status FROM sessions WHERE id = ?').get(req.params.sid) as any
    if (!row) { res.status(404).json({ error: '工单不存在' }); return }
    if (row.status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }
    const now = new Date().toISOString()

    db.transaction(() => {
      // 清空该设备旧条目，重新写入
      db.prepare('DELETE FROM cart_items WHERE session_id=? AND device_id=?').run(req.params.sid, deviceId)
      for (const item of items) {
        upsertDish(item.dish)  // 自定义菜也一并写入 dishes 表
        db.prepare('INSERT INTO cart_items (session_id,device_id,dish_id,quantity,submitted_qty,preferences,updated_at) VALUES (?,?,?,?,?,?,?)').run(req.params.sid, deviceId, item.dish.id, item.quantity, item.submittedQty || 0, JSON.stringify(item.preferences || []), now)
      }
      // 确保参与者记录存在（不覆盖头像/昵称）
      if (deviceId) {
        db.prepare('INSERT OR IGNORE INTO participants (session_id,device_id,avatar_url,nick_name,updated_at) VALUES (?,?,?,?,?)').run(req.params.sid, deviceId, '', '', now)
      }
      db.prepare('UPDATE sessions SET updated_at=? WHERE id=?').run(now, req.params.sid)
    })()

    const participantCount = (db.prepare('SELECT COUNT(*) as c FROM participants WHERE session_id=?').get(req.params.sid) as any).c
    res.json({ ok: true, participantCount })
  } catch (e) { console.error('[PUT cart]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /session/:sid/subscribe — 已废弃，保留兼容旧客户端
app.post('/session/:sid/subscribe', (_req, res) => { res.json({ ok: true }) })

// POST /session/:sid/order
app.post('/session/:sid/order', async (req, res) => {
  try {
    const payload: OrderPayload = req.body
    if (!payload?.items?.length) { res.status(400).json({ error: '点单为空' }); return }
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sid) as any
    if (!row) { res.status(404).json({ error: '工单不存在' }); return }
    if (row.status === 'closed') { res.status(409).json({ error: '工单已结束' }); return }

    sendPush(payload).catch(e => console.warn('[Push]', e))
    if (payload.subscribeCode) {
      sendSubscribeMsgByCode(payload.subscribeCode, payload, row.name).catch(e => console.warn('[Subscribe]', e))
    }

    const now = new Date().toISOString()
    db.transaction(() => {
      for (const sub of payload.items) {
        const devId = sub.deviceId || ''
        const existing = db.prepare('SELECT submitted_qty FROM cart_items WHERE session_id=? AND device_id=? AND dish_id=?').get(req.params.sid, devId, sub.dish.id) as any
        if (existing) {
          db.prepare('UPDATE cart_items SET submitted_qty=submitted_qty+?, updated_at=? WHERE session_id=? AND device_id=? AND dish_id=?').run(sub.quantity, now, req.params.sid, devId, sub.dish.id)
        } else {
          upsertDish(sub.dish)
          db.prepare('INSERT INTO cart_items (session_id,device_id,dish_id,quantity,submitted_qty,preferences,updated_at) VALUES (?,?,?,?,?,?,?)').run(req.params.sid, devId, sub.dish.id, sub.quantity, sub.quantity, JSON.stringify(sub.preferences || []), now)
        }
      }
      db.prepare('UPDATE sessions SET updated_at=? WHERE id=?').run(now, req.params.sid)
    })()

    console.log(`[order] 提交成功 sid=${req.params.sid} items=${payload.items.length}`)
    res.json({ ok: true })
  } catch (e) { console.error('[POST order]', e); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /session/:sid/close
app.put('/session/:sid/close', (req, res) => {
  try {
    const row = db.prepare('SELECT status FROM sessions WHERE id = ?').get(req.params.sid) as any
    if (!row) { res.status(404).json({ error: '工单不存在' }); return }
    if (row.status === 'closed') { res.json({ ok: true, note: '工单已是关闭状态' }); return }
    const now = new Date().toISOString()
    db.prepare("UPDATE sessions SET status='closed', updated_at=? WHERE id=?").run(now, req.params.sid)
    console.log(`[close] 关闭 sid=${req.params.sid}`)
    res.json({ ok: true })
  } catch (e) { console.error('[PUT close]', e); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /session/:sid
app.delete('/session/:sid', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.sid)
    if (info.changes === 0) { res.status(404).json({ error: '工单不存在' }); return }
    db.prepare('DELETE FROM participants WHERE session_id=?').run(req.params.sid)
    db.prepare('DELETE FROM cart_items WHERE session_id=?').run(req.params.sid)
    console.log(`[session] 删除 sid=${req.params.sid}`)
    res.json({ ok: true })
  } catch (e) { console.error('[DELETE session]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /sessions — 所有工单列表（管理后台用）
app.get('/sessions', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all() as any[]
    res.json(rows.map(r => buildFullSession(r.id)).filter(Boolean))
  } catch (e) { console.error('[GET sessions]', e); res.status(500).json({ error: '服务器错误' }) }
})

// GET /dishes
app.get('/dishes', (_req, res) => {
  try { res.json(getAllDishes()) }
  catch (e) { console.error('[GET dishes]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /dishes — 新增菜品
app.post('/dishes', (req, res) => {
  try {
    const { name, category, description, imageUrl, available, price } = req.body
    if (!name?.trim()) { res.status(400).json({ error: '缺少菜品名称' }); return }
    const dish: Dish = {
      id: `d${Date.now()}`, name: name.trim(), category: category || '荤菜',
      description: description || '', imageUrl: imageUrl || '',
      available: available !== false, price: Number(price) || 0,
      createdAt: new Date().toISOString(),
    }
    upsertDish(dish)
    console.log(`[dishes] 新增: ${dish.id} name=${dish.name}`)
    res.json(dish)
  } catch (e) { console.error('[POST dishes]', e); res.status(500).json({ error: '服务器错误' }) }
})

// POST /dishes/image — 上传菜品图片到 COS
app.post('/dishes/image', async (req, res) => {
  try {
    const { base64, mimeType } = req.body
    if (!base64) { res.status(400).json({ error: '缺少 base64' }); return }
    if (!SECRET_ID || !BUCKET) { res.status(503).json({ error: 'COS 未配置' }); return }
    const buf = Buffer.from(base64 as string, 'base64')
    if (buf.length > 5_000_000) { res.status(413).json({ error: '图片过大（最大 5MB）' }); return }
    const ext = mimeType === 'image/png' ? 'png' : 'jpg'
    const key = `kitchen/dishes/${Date.now()}.${ext}`
    const url = await cosUploadImage(key, buf, mimeType || 'image/jpeg')
    console.log(`[image] 上传 COS: ${key}`)
    res.json({ ok: true, url })
  } catch (e: any) { console.error('[POST dishes/image]', e); res.status(500).json({ error: e.message || '上传失败' }) }
})

// PUT /dish/:id — 更新菜品
app.put('/dish/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM dishes WHERE id=? AND is_custom=0').get(req.params.id) as any
    if (!row) { res.status(404).json({ error: '菜品不存在' }); return }
    const current = rowToDish(row)
    const { name, category, description, imageUrl, available, price } = req.body
    db.prepare('UPDATE dishes SET name=?,category=?,description=?,image_url=?,available=?,price=? WHERE id=?').run(
      name       !== undefined ? name.trim()     : current.name,
      category   !== undefined ? category        : current.category,
      description!== undefined ? description     : current.description,
      imageUrl   !== undefined ? imageUrl        : current.imageUrl,
      available  !== undefined ? (available ? 1 : 0) : (current.available ? 1 : 0),
      price      !== undefined ? Number(price)   : current.price,
      req.params.id
    )
    res.json(rowToDish(db.prepare('SELECT * FROM dishes WHERE id=?').get(req.params.id) as any))
  } catch (e) { console.error('[PUT dish]', e); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /dish/:id/toggle — 切换供应状态
app.put('/dish/:id/toggle', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM dishes WHERE id=? AND is_custom=0').get(req.params.id) as any
    if (!row) { res.status(404).json({ error: '菜品不存在' }); return }
    db.prepare('UPDATE dishes SET available=1-available WHERE id=?').run(req.params.id)
    res.json(rowToDish(db.prepare('SELECT * FROM dishes WHERE id=?').get(req.params.id) as any))
  } catch (e) { console.error('[PUT dish/toggle]', e); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /dish/:id — 删除菜品
app.delete('/dish/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM dishes WHERE id=? AND is_custom=0').run(req.params.id)
    if (info.changes === 0) { res.status(404).json({ error: '菜品不存在' }); return }
    res.json({ ok: true })
  } catch (e) { console.error('[DELETE dish]', e); res.status(500).json({ error: '服务器错误' }) }
})

// ── 启动 ──────────────────────────────────────────────────────────────────────
migrateIfNeeded()
app.listen(PORT, () => console.log(`[kitchen-api] SQLite 就绪，监听 :${PORT}`))
