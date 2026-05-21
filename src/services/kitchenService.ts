import type { Dish, DishCategory, CartItem, OrderSession } from '@/types/kitchen'
import { cos, BUCKET, REGION } from './storageUpload'

const DATA_KEY = 'kitchen/dishes.json'

// ── 预置演示菜品（仅首次初始化时使用）────────────────────────────────────────────
const DEMO_DISHES: Dish[] = [
  { id: 'd1', name: '红烧肉',   category: '荤菜', description: '秘制酱汁慢炖，肥而不腻，入口即化', imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
  { id: 'd2', name: '糖醋排骨', category: '荤菜', description: '酥脆鲜嫩，酸甜适口，老少皆宜',     imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
  { id: 'd3', name: '清炒小白菜',category: '素菜', description: '清爽时令蔬菜，保留本味',           imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
  { id: 'd4', name: '炒土豆丝', category: '素菜', description: '爽脆开胃，简单的幸福',             imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
  { id: 'd5', name: '番茄蛋花汤',category: '汤羹', description: '酸甜爽口，营养丰富，暖胃首选',     imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
  { id: 'd6', name: '紫菜蛋花汤',category: '汤羹', description: '清淡鲜美，碘元素丰富',             imageUrl: '', available: false, price: 0, createdAt: new Date().toISOString() },
  { id: 'd7', name: '白米饭',   category: '主食', description: '新米现煮，香软弹牙',               imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
  { id: 'd8', name: '蛋炒饭',   category: '主食', description: '粒粒分明，蛋香浓郁，经典不败',     imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
  { id: 'd9', name: '春卷',     category: '小吃', description: '外脆里嫩，馅料丰富',               imageUrl: '', available: true,  price: 0, createdAt: new Date().toISOString() },
]

// ── COS 读写 ──────────────────────────────────────────────────────────────────
// COS 未配置时降级到 localStorage，保证本地开发可用
const cosAvailable = (): boolean => !!(BUCKET && REGION)

async function loadFromCOS(): Promise<Dish[]> {
  return new Promise((resolve) => {
    cos.getObject(
      { Bucket: BUCKET, Region: REGION, Key: DATA_KEY },
      (err, data) => {
        if (err) {
          // 404 表示首次使用，返回演示数据
          resolve(DEMO_DISHES)
          return
        }
        try {
          const text = typeof data.Body === 'string'
            ? data.Body
            : new TextDecoder().decode(data.Body as ArrayBuffer)
          resolve(JSON.parse(text) as Dish[])
        } catch {
          resolve(DEMO_DISHES)
        }
      }
    )
  })
}

async function saveToCOS(dishes: Dish[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(dishes, null, 2)
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: DATA_KEY,
        Body: body,
        ContentType: 'application/json',
      },
      (err) => {
        if (err) reject(new Error(`菜单保存失败: ${err.message}`))
        else resolve()
      }
    )
  })
}

// localStorage 降级
const LS_KEY = 'kitchen_dishes'
function loadFromLS(): Dish[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as Dish[]
  } catch { /* ignore */ }
  localStorage.setItem(LS_KEY, JSON.stringify(DEMO_DISHES))
  return DEMO_DISHES
}
function saveToLS(dishes: Dish[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(dishes))
}

async function load(): Promise<Dish[]> {
  return cosAvailable() ? loadFromCOS() : loadFromLS()
}

async function save(dishes: Dish[]): Promise<void> {
  if (cosAvailable()) await saveToCOS(dishes)
  else saveToLS(dishes)
}

// ── 公开 API ──────────────────────────────────────────────────────────────────
export async function getAll(): Promise<Dish[]> {
  return load()
}

export async function getByCategory(category: DishCategory): Promise<Dish[]> {
  return (await load()).filter(d => d.category === category)
}

export async function create(dish: Omit<Dish, 'id' | 'createdAt'>): Promise<Dish> {
  const dishes = await load()
  const newDish: Dish = { ...dish, id: `d${Date.now()}`, createdAt: new Date().toISOString() }
  await save([...dishes, newDish])
  return newDish
}

export async function update(id: string, patch: Partial<Omit<Dish, 'id' | 'createdAt'>>): Promise<Dish> {
  const dishes = await load()
  const idx = dishes.findIndex(d => d.id === id)
  if (idx === -1) throw new Error(`菜品 ${id} 不存在`)
  dishes[idx] = { ...dishes[idx], ...patch }
  await save(dishes)
  return dishes[idx]
}

export async function remove(id: string): Promise<void> {
  await save((await load()).filter(d => d.id !== id))
}

export async function toggleAvailable(id: string): Promise<Dish> {
  const dishes = await load()
  const dish = dishes.find(d => d.id === id)
  if (!dish) throw new Error(`菜品 ${id} 不存在`)
  return update(id, { available: !dish.available })
}

// ── 工单（OrderSession）持久化 ────────────────────────────────────────────────
const SESSIONS_DATA_KEY = 'kitchen/sessions.json'
const LS_SESSIONS_KEY   = 'kitchen_sessions'

async function loadSessionsFromCOS(): Promise<OrderSession[]> {
  return new Promise((resolve) => {
    cos.getObject(
      { Bucket: BUCKET, Region: REGION, Key: SESSIONS_DATA_KEY },
      (err, data) => {
        if (err) { resolve([]); return }
        try {
          const text = typeof data.Body === 'string'
            ? data.Body
            : new TextDecoder().decode(data.Body as ArrayBuffer)
          resolve(JSON.parse(text) as OrderSession[])
        } catch {
          resolve([])
        }
      }
    )
  })
}

async function saveSessionsToCOS(sessions: OrderSession[]): Promise<void> {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: SESSIONS_DATA_KEY,
        Body: JSON.stringify(sessions, null, 2),
        ContentType: 'application/json',
      },
      (err) => {
        if (err) reject(new Error(`工单保存失败: ${err.message}`))
        else resolve()
      }
    )
  })
}

function loadSessionsFromLS(): OrderSession[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY)
    if (raw) return JSON.parse(raw) as OrderSession[]
  } catch { /* ignore */ }
  return []
}

function saveSessionsToLS(sessions: OrderSession[]): void {
  localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions))
}

async function loadSessions(): Promise<OrderSession[]> {
  return cosAvailable() ? loadSessionsFromCOS() : loadSessionsFromLS()
}

async function saveSessions(sessions: OrderSession[]): Promise<void> {
  if (cosAvailable()) await saveSessionsToCOS(sessions)
  else saveSessionsToLS(sessions)
}

// ── 工单公开 API ───────────────────────────────────────────────────────────────
export async function getSessions(): Promise<OrderSession[]> {
  return loadSessions()
}

export async function getSession(id: string): Promise<OrderSession | undefined> {
  return (await loadSessions()).find(s => s.id === id)
}

export async function createSession(name: string): Promise<OrderSession> {
  const res = await fetch('https://stoplesslab.com/api/kitchen/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim() }),
  })
  if (!res.ok) throw new Error(`创建工单失败: ${res.status}`)
  return res.json() as Promise<OrderSession>
}

export async function updateSessionCart(id: string, items: CartItem[]): Promise<void> {
  const sessions = await loadSessions()
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], items, updatedAt: new Date().toISOString() }
  await saveSessions(sessions)
}

export async function closeSession(id: string): Promise<void> {
  const sessions = await loadSessions()
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], status: 'closed', updatedAt: new Date().toISOString() }
  await saveSessions(sessions)
}

export async function deleteSession(id: string): Promise<void> {
  await saveSessions((await loadSessions()).filter(s => s.id !== id))
}
