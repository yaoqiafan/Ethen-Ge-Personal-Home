import { ref, computed } from 'vue'
import type { Dish, CartItem, OrderPayload } from '@/types/kitchen'

const API = 'https://stoplesslab.com/api/kitchen'

// ── 状态 ─────────────────────────────────────────────────────────────────────
const items   = ref<CartItem[]>([])
const dishes  = ref<Dish[]>([])
const isCartOpen   = ref(false)
const isSubmitting = ref(false)
const lastError    = ref('')

const _sid  = ref<string | null>(null)
const _name = ref<string>('')

let _syncTimer:  ReturnType<typeof setTimeout>  | null = null
let _pollTimer:  ReturnType<typeof setInterval> | null = null

// ── 网络工具 ──────────────────────────────────────────────────────────────────
async function _get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

async function _put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

async function _post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function _deviceId(): string {
  try {
    let id = localStorage.getItem('kitchen_device_id') || ''
    if (!id) {
      id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem('kitchen_device_id', id)
    }
    return id
  } catch { return 'web_unknown' }
}

// ── 购物车远端同步（防抖 500ms）────────────────────────────────────────────────
function _scheduleSync(): void {
  if (!_sid.value) return
  if (_syncTimer) clearTimeout(_syncTimer)
  _syncTimer = setTimeout(async () => {
    _syncTimer = null
    if (!_sid.value) return
    try {
      await _put(`/session/${_sid.value}/cart`, { items: items.value, deviceId: _deviceId() })
    } catch (e) {
      console.warn('[KitchenCart] 购物车同步失败:', e)
    }
  }, 500)
}

// ── 轮询远端更新（4s）────────────────────────────────────────────────────────
async function _poll(): Promise<void> {
  if (!_sid.value || _syncTimer) return
  try {
    const res = await _get<{ valid: boolean; session?: { items: CartItem[] }; dishes?: Dish[] }>(`/session/${_sid.value}`)
    if (!res.valid) { _stopPoll(); return }
    if (!_syncTimer && res.session?.items) {
      const myDevId = _deviceId()
      // 只取本设备的条目（服务端按 deviceId 分离存储后的结果）
      const mine = res.session.items.filter((i: any) => !i.deviceId || i.deviceId === myDevId)
      // 只同步服务端更新的 submittedQty，不替换本地 quantity（避免覆盖正在编辑的内容）
      items.value = items.value.map(local => {
        const sv = mine.find(s => s.dish.id === local.dish.id)
        return sv ? { ...local, submittedQty: sv.submittedQty ?? local.submittedQty } : local
      })
      // 服务端有、本地没有的新条目（如另一标签页添加的）也补充进来
      const localIds = new Set(items.value.map(i => i.dish.id))
      const added = mine.filter(i => !localIds.has(i.dish.id))
      if (added.length) items.value = [...items.value, ...added.map(i => ({ ...i, deviceId: undefined }))]
    }
    if (res.dishes) dishes.value = res.dishes
  } catch { /* 静默忽略 */ }
}

function _stopPoll(): void {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null }
}

// ── 计算属性（导出供组件使用）────────────────────────────────────────────────
export const cartItems   = computed(() => items.value)
export const cartDishes  = computed(() => dishes.value)
export const cartCount   = computed(() => items.value.reduce((s, i) => s + i.quantity, 0))
export const cartIsEmpty = computed(() => items.value.length === 0)
export const hasNewItems = computed(() => items.value.some(i => i.quantity > (i.submittedQty ?? 0)))
export const sessionId   = computed(() => _sid.value)
export const sessionName = computed(() => _name.value)
export const submitting  = computed(() => isSubmitting.value)
export const submitError = computed(() => lastError.value)
export const cartOpen    = isCartOpen

// ── 购物车操作 ────────────────────────────────────────────────────────────────
export function addToCart(dish: Dish): void {
  if (!dish.available) return
  const existing = items.value.find(i => i.dish.id === dish.id)
  if (existing) existing.quantity++
  else items.value.push({ dish, quantity: 1, submittedQty: 0 })
  _scheduleSync()
}

export function removeFromCart(dishId: string): void {
  items.value = items.value.filter(i => i.dish.id !== dishId)
  _scheduleSync()
}

export function setQuantity(dishId: string, qty: number): void {
  if (qty <= 0) { removeFromCart(dishId); return }
  const item = items.value.find(i => i.dish.id === dishId)
  if (item) {
    item.quantity = qty
    if ((item.submittedQty ?? 0) > qty) item.submittedQty = qty
  }
  _scheduleSync()
}

export function clearCart(): void {
  items.value = []
  _scheduleSync()
}

export function addCustomDish(name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = items.value.find(i => i.dish.isCustom && i.dish.name === trimmed)
  if (existing) { existing.quantity++; _scheduleSync(); return }
  const customDish: Dish = {
    id: `custom_${Date.now()}`,
    name: trimmed,
    category: '小吃',
    description: '用户自定义',
    imageUrl: '',
    available: true,
    price: 0,
    createdAt: new Date().toISOString(),
    isCustom: true,
  }
  items.value.push({ dish: customDish, quantity: 1, submittedQty: 0 })
  _scheduleSync()
}

export function openCart(): void  { isCartOpen.value = true }
export function closeCart(): void { isCartOpen.value = false }

// ── 工单初始化 ────────────────────────────────────────────────────────────────
export async function initSession(sid: string): Promise<boolean> {
  _stopPoll()
  if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null }

  try {
    const res = await _get<{
      valid: boolean
      session?: { id: string; name: string; items: CartItem[] }
      dishes?: Dish[]
    }>(`/session/${sid}`)

    if (!res.valid || !res.session) return false

    _sid.value  = res.session.id
    _name.value = res.session.name
    // 只加载本设备的购物车条目（服务端以 deviceId 分离存储）
    const myDevId = _deviceId()
    items.value  = (res.session.items ?? [])
      .filter((i: any) => !i.deviceId || i.deviceId === myDevId)
      .map((i: any) => ({ ...i, deviceId: undefined }))
    dishes.value = res.dishes ?? []

    _pollTimer = setInterval(_poll, 4000)
    return true
  } catch (e) {
    console.warn('[KitchenCart] initSession 失败:', e)
    return false
  }
}

export function stopSession(): void {
  _stopPoll()
  if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null }
  _sid.value   = null
  _name.value  = ''
  items.value  = []
  dishes.value = []
}

// ── 提交点单 ──────────────────────────────────────────────────────────────────
export async function submitOrder(note: string): Promise<boolean> {
  if (isSubmitting.value) return false

  const incremental = items.value
    .filter(i => i.quantity > (i.submittedQty ?? 0))
    .map(i => ({ ...i, quantity: i.quantity - (i.submittedQty ?? 0) }))

  if (!incremental.length) {
    lastError.value = '没有新增菜品，请先加菜再提交'
    return false
  }
  if (!_sid.value) { lastError.value = '无效工单'; return false }

  isSubmitting.value = true
  lastError.value = ''

  const isFollowUp = items.value.some(i => (i.submittedQty ?? 0) > 0)
  const noteText = ((isFollowUp ? '[追加] ' : '') + note.trim()).trim()

  try {
    const payload: OrderPayload = {
      items: incremental,
      note: noteText,
      submittedAt: new Date().toISOString(),
    }
    await _post(`/session/${_sid.value}/order`, payload)

    items.value.forEach(item => { item.submittedQty = item.quantity })
    if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null }

    return true
  } catch (e) {
    lastError.value = e instanceof Error ? e.message : '提交失败'
    return false
  } finally {
    isSubmitting.value = false
  }
}
