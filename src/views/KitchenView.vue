<template>
  <div class="kitchen-view animate-fade-in">

    <!-- 页面头部 -->
    <div class="kitchen-header">
      <div class="kh-left">
        <div class="kh-badge">Family Kitchen</div>
        <div>
          <div class="kh-title">
            <span>家庭厨房</span>
            <span class="kh-subtitle-inline">今日菜单</span>
          </div>
          <div class="kh-meta">{{ availableCount }} 道菜可选 · {{ soldOutCount }} 道今日估清</div>
        </div>
      </div>
      <div class="kh-right">
        <!-- 购物车按钮 -->
        <button class="cart-fab" @click="openCart">
          <span class="cart-fab-icon">◫</span>
          <span class="cart-fab-label">点菜单</span>
          <span v-if="cartCount > 0" class="cart-fab-count">{{ cartCount }}</span>
        </button>
        <!-- 管理入口（低调按钮） -->
        <button class="admin-entry" :title="'后台管理'" @click="showAdmin = true">
          <span>⚙</span>
        </button>
      </div>
    </div>

    <!-- 分类标签 -->
    <CategoryTabs v-model="selectedCategory" :dishes="allDishes" />

    <!-- 加载状态 -->
    <div v-if="loading" class="dish-loading">
      <div v-for="i in 6" :key="i" class="dish-skeleton" />
    </div>

    <!-- 菜品网格 -->
    <div v-else-if="filteredDishes.length" class="dish-grid">
      <DishCard
        v-for="dish in filteredDishes"
        :key="dish.id"
        :dish="dish"
        :cart-qty="getCartQty(dish.id)"
        @add="addToCart"
        @increment="addToCart"
        @decrement="decrementCart"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="dish-empty">
      <span class="empty-icon">🥢</span>
      <p>该分类暂无菜品</p>
    </div>

    <!-- 点菜单抽屉 -->
    <OrderCart @submitted="handleOrderSubmitted" @error="handleOrderError" />

    <!-- 后台管理面板 -->
    <AdminPanel v-model="showAdmin" :dishes="allDishes" @refresh="loadDishes" />

    <!-- Toast 通知 -->
    <KitchenToast ref="toastRef" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Dish, DishCategory } from '@/types/kitchen'
import * as kitchenSvc from '@/services/kitchenService'
import {
  cartCount, cartItems,
  addToCart as _addToCart,
  removeFromCart, setQuantity,
  openCart,
} from '@/composables/useKitchenCart'
import CategoryTabs from '@/components/kitchen/CategoryTabs.vue'
import DishCard     from '@/components/kitchen/DishCard.vue'
import OrderCart    from '@/components/kitchen/OrderCart.vue'
import AdminPanel   from '@/components/kitchen/AdminPanel.vue'
import KitchenToast from '@/components/kitchen/KitchenToast.vue'

// ── 状态 ──────────────────────────────────────────────────────────────────────
const allDishes       = ref<Dish[]>([])
const loading         = ref(true)
const selectedCategory = ref<DishCategory | null>(null)
const showAdmin       = ref(false)
const toastRef        = ref<InstanceType<typeof KitchenToast> | null>(null)

// ── 计算 ──────────────────────────────────────────────────────────────────────
const filteredDishes = computed(() =>
  selectedCategory.value
    ? allDishes.value.filter(d => d.category === selectedCategory.value)
    : allDishes.value
)
const availableCount = computed(() => allDishes.value.filter(d => d.available).length)
const soldOutCount   = computed(() => allDishes.value.filter(d => !d.available).length)

// ── 购物车辅助 ─────────────────────────────────────────────────────────────────
function getCartQty(dishId: string): number {
  return cartItems.value.find(i => i.dish.id === dishId)?.quantity ?? 0
}

function addToCart(dish: Dish) {
  _addToCart(dish)
}

function decrementCart(dish: Dish) {
  const qty = getCartQty(dish.id)
  if (qty <= 1) removeFromCart(dish.id)
  else setQuantity(dish.id, qty - 1)
}

// ── 数据加载 ───────────────────────────────────────────────────────────────────
async function loadDishes() {
  loading.value = true
  try {
    allDishes.value = await kitchenSvc.getAll()
  } finally {
    loading.value = false
  }
}

onMounted(loadDishes)

// ── 提交回调 ───────────────────────────────────────────────────────────────────
function handleOrderSubmitted() {
  toastRef.value?.show('点单已发送给大厨！🍳', 'success')
}

function handleOrderError() {
  toastRef.value?.show('发送失败，请检查推送配置', 'error')
}
</script>

<style scoped>
.kitchen-view { display: flex; flex-direction: column; gap: 16px; }

/* ── 头部 ─────────────────────────────────────────────────────────────────── */
.kitchen-header {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
  padding: 14px 16px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  border-top: 2px solid rgba(249,115,22,.4);
}
.kh-left  { display: flex; align-items: center; gap: 12px; }
.kh-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 4px;
  background: rgba(249,115,22,.1); border: 1px solid rgba(249,115,22,.25);
  color: #f97316; letter-spacing: .06em;
  font-family: 'JetBrains Mono', monospace; white-space: nowrap;
}
.kh-title { font-size: 17px; font-weight: 800; color: #e6edf3; display: flex; align-items: baseline; gap: 10px; }
.kh-subtitle-inline { font-size: 11px; font-weight: 400; color: #484f58; }
.kh-meta { font-size: 11px; color: #484f58; margin-top: 2px; }

.kh-right { display: flex; align-items: center; gap: 8px; }

.cart-fab {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 14px; border-radius: 7px; cursor: pointer;
  background: rgba(249,115,22,.1); border: 1px solid rgba(249,115,22,.3);
  color: #f97316; font-size: 13px; font-family: 'JetBrains Mono', monospace;
  transition: all .2s; position: relative;
}
.cart-fab:hover { background: rgba(249,115,22,.2); box-shadow: 0 0 12px rgba(249,115,22,.2); }
.cart-fab-icon  { font-size: 15px; }
.cart-fab-count {
  position: absolute; top: -6px; right: -6px;
  min-width: 18px; height: 18px; border-radius: 9px; padding: 0 4px;
  background: #f97316; color: #0a0e14; font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  animation: pop-in .2s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes pop-in { from { transform: scale(0); } to { transform: scale(1); } }

.admin-entry {
  width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
  background: transparent; border: 1px solid #21262d;
  color: #484f58; font-size: 14px; transition: all .2s;
  display: flex; align-items: center; justify-content: center;
}
.admin-entry:hover { color: #e3b341; border-color: rgba(227,179,65,.3); background: rgba(227,179,65,.06); }

/* ── 菜品网格 ─────────────────────────────────────────────────────────────── */
.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

/* ── 骨架屏 ───────────────────────────────────────────────────────────────── */
.dish-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.dish-skeleton {
  height: 220px; border-radius: 10px;
  background: #161b22; border: 1px solid #21262d;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:.45; } }

/* ── 空状态 ───────────────────────────────────────────────────────────────── */
.dish-empty {
  text-align: center; padding: 4rem 2rem;
  color: #484f58; font-size: 13px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.empty-icon { font-size: 48px; opacity: .6; }
</style>
