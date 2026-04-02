import { ref, computed } from 'vue'
import type { Dish, CartItem, OrderPayload } from '@/types/kitchen'
import { sendOrderPush } from '@/services/push'

const items = ref<CartItem[]>([])
const isCartOpen = ref(false)
const isSubmitting = ref(false)
const lastError = ref('')

// ── 计算属性 ──────────────────────────────────────────────────────────────────
export const cartItems = computed(() => items.value)

export const cartCount = computed(() =>
  items.value.reduce((sum, item) => sum + item.quantity, 0)
)

export const cartIsEmpty = computed(() => items.value.length === 0)

// ── 操作方法 ──────────────────────────────────────────────────────────────────
export function addToCart(dish: Dish): void {
  if (!dish.available) return
  const existing = items.value.find(i => i.dish.id === dish.id)
  if (existing) {
    existing.quantity++
  } else {
    items.value.push({ dish, quantity: 1 })
  }
}

export function removeFromCart(dishId: string): void {
  items.value = items.value.filter(i => i.dish.id !== dishId)
}

export function setQuantity(dishId: string, qty: number): void {
  if (qty <= 0) { removeFromCart(dishId); return }
  const item = items.value.find(i => i.dish.id === dishId)
  if (item) item.quantity = qty
}

export function clearCart(): void {
  items.value = []
}

export function openCart(): void  { isCartOpen.value = true }
export function closeCart(): void { isCartOpen.value = false }
export const cartOpen = isCartOpen

// ── 防抖提交（300ms） ─────────────────────────────────────────────────────────
let submitTimer: ReturnType<typeof setTimeout> | null = null

export async function submitOrder(note: string): Promise<boolean> {
  if (isSubmitting.value || cartIsEmpty.value) return false
  if (submitTimer) return false

  isSubmitting.value = true
  lastError.value = ''

  submitTimer = setTimeout(() => { submitTimer = null }, 300)

  try {
    const payload: OrderPayload = {
      items: items.value.map(i => ({ ...i })),
      note: note.trim(),
      submittedAt: new Date().toISOString(),
    }
    await sendOrderPush(payload)
    clearCart()
    isCartOpen.value = false
    return true
  } catch (e) {
    lastError.value = e instanceof Error ? e.message : String(e)
    return false
  } finally {
    isSubmitting.value = false
  }
}

export const submitting = computed(() => isSubmitting.value)
export const submitError = computed(() => lastError.value)
