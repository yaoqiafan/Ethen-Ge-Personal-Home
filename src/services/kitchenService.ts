import type { Dish, DishCategory } from '@/types/kitchen'

const STORAGE_KEY = 'kitchen_dishes'

// ── 预置演示菜品 ──────────────────────────────────────────────────────────────
const DEMO_DISHES: Dish[] = [
  { id: 'd1', name: '红烧肉', category: '荤菜', description: '秘制酱汁慢炖，肥而不腻，入口即化', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
  { id: 'd2', name: '糖醋排骨', category: '荤菜', description: '酥脆鲜嫩，酸甜适口，老少皆宜', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
  { id: 'd3', name: '清炒小白菜', category: '素菜', description: '清爽时令蔬菜，保留本味', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
  { id: 'd4', name: '炒土豆丝', category: '素菜', description: '爽脆开胃，简单的幸福', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
  { id: 'd5', name: '番茄蛋花汤', category: '汤羹', description: '酸甜爽口，营养丰富，暖胃首选', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
  { id: 'd6', name: '紫菜蛋花汤', category: '汤羹', description: '清淡鲜美，碘元素丰富', imageUrl: '', available: false, price: 0, createdAt: new Date().toISOString() },
  { id: 'd7', name: '白米饭', category: '主食', description: '新米现煮，香软弹牙', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
  { id: 'd8', name: '蛋炒饭', category: '主食', description: '粒粒分明，蛋香浓郁，经典不败', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
  { id: 'd9', name: '春卷', category: '小吃', description: '外脆里嫩，馅料丰富', imageUrl: '', available: true, price: 0, createdAt: new Date().toISOString() },
]

function load(): Dish[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Dish[]
  } catch { /* ignore */ }
  // 首次初始化预置数据
  save(DEMO_DISHES)
  return DEMO_DISHES
}

function save(dishes: Dish[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes))
}

// ── 公开 API（预留异步签名，便于后续接入真实后端）──────────────────────────────
export async function getAll(): Promise<Dish[]> {
  return load()
}

export async function getByCategory(category: DishCategory): Promise<Dish[]> {
  return load().filter(d => d.category === category)
}

export async function create(dish: Omit<Dish, 'id' | 'createdAt'>): Promise<Dish> {
  const dishes = load()
  const newDish: Dish = {
    ...dish,
    id: `d${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  save([...dishes, newDish])
  return newDish
}

export async function update(id: string, patch: Partial<Omit<Dish, 'id' | 'createdAt'>>): Promise<Dish> {
  const dishes = load()
  const idx = dishes.findIndex(d => d.id === id)
  if (idx === -1) throw new Error(`菜品 ${id} 不存在`)
  dishes[idx] = { ...dishes[idx], ...patch }
  save(dishes)
  return dishes[idx]
}

export async function remove(id: string): Promise<void> {
  save(load().filter(d => d.id !== id))
}

export async function toggleAvailable(id: string): Promise<Dish> {
  const dishes = load()
  const dish = dishes.find(d => d.id === id)
  if (!dish) throw new Error(`菜品 ${id} 不存在`)
  return update(id, { available: !dish.available })
}
