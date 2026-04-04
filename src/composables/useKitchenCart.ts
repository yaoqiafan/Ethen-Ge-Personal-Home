import { ref, computed } from 'vue'
import type { Dish, CartItem, OrderPayload } from '@/types/kitchen'
import { sendOrderPush } from '@/services/push'
import * as kitchenSvc from '@/services/kitchenService'

const items = ref<CartItem[]>([])
const isCartOpen = ref(false)
const isSubmitting = ref(false)
const lastError = ref('')

// ── 工单会话状态 ──────────────────────────────────────────────────────────────
const _currentSessionId   = ref<string | null>(null)
const _currentSessionName = ref<string>('')

// 防抖写远端（500ms）
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
// 轮询定时器（4s）
let pollingTimer: ReturnType<typeof setInterval> | null = null

function scheduleSyncToRemote(): void {
  if (!_currentSessionId.value) return
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(async () => {
    syncDebounceTimer = null
    if (_currentSessionId.value) {
      try {
        await kitchenSvc.updateSessionCart(_currentSessionId.value, items.value)
      } catch (e) {
        console.warn('[KitchenCart] 远端同步失败:', e)
      }
    }
  }, 500)
}

async function pollRemote(): Promise<void> {
  if (!_currentSessionId.value) return
  // 如果有待写入的本地更改，跳过本次拉取，避免覆盖用户操作
  if (syncDebounceTimer) return
  try {
    const session = await kitchenSvc.getSession(_currentSessionId.value)
    if (!session) return
    if (session.status === 'closed') {
      _stopPolling()
      return
    }
    // 只有没有待写入时才覆盖（double-check）
    // 远端数据已包含 submittedQty 字段，直接整体替换即可保留已提交状态
    if (!syncDebounceTimer) {
      items.value = session.items
    }
  } catch { /* 静默忽略轮询错误 */ }
}

function _stopPolling(): void {
  if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null }
}

// ── 计算属性 ──────────────────────────────────────────────────────────────────
export const cartItems = computed(() => items.value)

export const cartCount = computed(() =>
  items.value.reduce((sum, item) => sum + item.quantity, 0)
)

export const cartIsEmpty = computed(() => items.value.length === 0)

/** 是否存在尚未推送给大厨的新增数量 */
export const hasNewItems = computed(() =>
  items.value.some(i => i.quantity > (i.submittedQty ?? 0))
)

export const sessionId   = computed(() => _currentSessionId.value)
export const sessionName = computed(() => _currentSessionName.value)

// ── 操作方法 ──────────────────────────────────────────────────────────────────
export function addToCart(dish: Dish): void {
  if (!dish.available) return
  const existing = items.value.find(i => i.dish.id === dish.id)
  if (existing) {
    existing.quantity++
  } else {
    items.value.push({ dish, quantity: 1, submittedQty: 0 })
  }
  scheduleSyncToRemote()
}

export function removeFromCart(dishId: string): void {
  items.value = items.value.filter(i => i.dish.id !== dishId)
  scheduleSyncToRemote()
}

export function setQuantity(dishId: string, qty: number): void {
  if (qty <= 0) { removeFromCart(dishId); return }
  const item = items.value.find(i => i.dish.id === dishId)
  if (item) {
    item.quantity = qty
    // 如果减量到 submittedQty 以下，同步缩小 submittedQty（大厨以最终后台状态为准）
    if ((item.submittedQty ?? 0) > qty) {
      item.submittedQty = qty
    }
  }
  scheduleSyncToRemote()
}

export function clearCart(): void {
  items.value = []
  scheduleSyncToRemote()
}

export function openCart(): void  { isCartOpen.value = true }
export function closeCart(): void { isCartOpen.value = false }
export const cartOpen = isCartOpen

// ── 工单会话操作 ──────────────────────────────────────────────────────────────
export async function initSession(sessionId: string): Promise<void> {
  _stopPolling()
  if (syncDebounceTimer) { clearTimeout(syncDebounceTimer); syncDebounceTimer = null }

  try {
    const session = await kitchenSvc.getSession(sessionId)
    if (!session || session.status === 'closed') return

    _currentSessionId.value   = session.id
    _currentSessionName.value = session.name
    items.value               = session.items

    pollingTimer = setInterval(pollRemote, 4000)
  } catch (e) {
    console.warn('[KitchenCart] initSession 失败:', e)
  }
}

export function stopSession(): void {
  _stopPolling()
  if (syncDebounceTimer) { clearTimeout(syncDebounceTimer); syncDebounceTimer = null }
  _currentSessionId.value   = null
  _currentSessionName.value = ''
}

// ── 增量提交（不清空购物车、不关闭工单） ─────────────────────────────────────
let submitTimer: ReturnType<typeof setTimeout> | null = null

export async function submitOrder(note: string): Promise<boolean> {
  if (isSubmitting.value) return false
  if (submitTimer) return false

  // 计算本次真正新增的菜品（quantity - submittedQty）
  const incremental = items.value
    .filter(i => i.quantity > (i.submittedQty ?? 0))
    .map(i => ({
      ...i,
      quantity: i.quantity - (i.submittedQty ?? 0),
    }))

  if (incremental.length === 0) {
    lastError.value = '没有新增菜品，请先加菜再提交'
    return false
  }

  isSubmitting.value = true
  lastError.value = ''
  submitTimer = setTimeout(() => { submitTimer = null }, 300)

  // 判断是否是追加提交（已有菜品曾被推送过）
  const isFollowUp = items.value.some(i => (i.submittedQty ?? 0) > 0)
  const notePrefix = isFollowUp ? '[追加] ' : ''

  try {
    const payload: OrderPayload = {
      items: incremental,
      note: (notePrefix + note.trim()).trim(),
      submittedAt: new Date().toISOString(),
    }
    await sendOrderPush(payload)

    // 推送成功后，将所有菜品的 submittedQty 更新为当前 quantity
    items.value.forEach(item => {
      item.submittedQty = item.quantity
    })

    // 同步带有 submittedQty 的最新购物车到远端（不清空、不关单）
    if (_currentSessionId.value) {
      await kitchenSvc.updateSessionCart(_currentSessionId.value, items.value)
    }

    // 取消防抖定时器，避免上面的 updateSessionCart 被重复覆盖
    if (syncDebounceTimer) { clearTimeout(syncDebounceTimer); syncDebounceTimer = null }

    return true
  } catch (e) {
    lastError.value = e instanceof Error ? e.message : String(e)
    return false
  } finally {
    isSubmitting.value = false
  }
}

export const submitting  = computed(() => isSubmitting.value)
export const submitError = computed(() => lastError.value)
