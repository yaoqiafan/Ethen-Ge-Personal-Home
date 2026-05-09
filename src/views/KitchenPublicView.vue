<template>
  <div class="menu-page">

    <!-- 顶部 Banner -->
    <header class="menu-header">
      <div class="menu-header-inner">
        <div class="menu-brand">
          <span class="menu-icon">🍳</span>
          <div>
            <div class="menu-title">家庭厨房</div>
            <div class="menu-tagline">Family Kitchen · {{ tagline }}</div>
          </div>
        </div>
        <!-- 悬浮购物车按钮 -->
        <button v-if="hasSession" class="cart-fab" @click="openCart">
          <span>◫ 点菜单</span>
          <span v-if="cartCount > 0" class="cart-count">{{ cartCount }}</span>
        </button>
      </div>
      <div class="menu-meta">
        <template v-if="hasSession">{{ availableCount }} 道菜可选 · {{ soldOutCount }} 道今日估清</template>
        <template v-else>请向大厨索要点菜链接</template>
      </div>
    </header>

    <!-- 无工单提示 -->
    <div v-if="!hasSession" class="no-session">
      <span class="no-session-icon">🔗</span>
      <p class="no-session-title">尚未选择工单</p>
      <p class="no-session-sub">请向大厨索要点菜链接，通过链接进入即可开始点菜。</p>
    </div>

    <template v-else>
      <!-- 分类 Tabs -->
      <CategoryTabs v-model="selectedCategory" :dishes="allDishes" />

      <!-- 加载骨架 -->
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
    </template>

    <!-- 底部合规信息 -->
    <SiteFooter />

    <!-- 点菜单抽屉（只在有工单时渲染） -->
    <OrderCart v-if="hasSession" @submitted="handleSubmitted" @error="handleError" />

    <!-- Toast -->
    <KitchenToast ref="toastRef" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import type { Dish, DishCategory } from '@/types/kitchen'
import * as kitchenSvc from '@/services/kitchenService'
import {
  cartCount, cartItems, sessionName,
  addToCart as _addToCart,
  removeFromCart, setQuantity,
  openCart, initSession, stopSession,
} from '@/composables/useKitchenCart'
import CategoryTabs  from '@/components/kitchen/CategoryTabs.vue'
import DishCard      from '@/components/kitchen/DishCard.vue'
import OrderCart     from '@/components/kitchen/OrderCart.vue'
import KitchenToast  from '@/components/kitchen/KitchenToast.vue'
import SiteFooter    from '@/components/layout/SiteFooter.vue'

// ── 状态 ──────────────────────────────────────────────────────────────────────
const allDishes        = ref<Dish[]>([])
const loading          = ref(true)
const selectedCategory = ref<DishCategory | null>(null)
const toastRef         = ref<InstanceType<typeof KitchenToast> | null>(null)
const currentSid       = ref<string | null>(null)

const route = useRoute()

// ── 计算 ──────────────────────────────────────────────────────────────────────
const hasSession = computed(() => !!currentSid.value)

const tagline = computed(() =>
  sessionName.value ? sessionName.value : '今日菜单'
)

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

// ── 生命周期 ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  const sid = route.query.sid as string | undefined
  if (sid) {
    currentSid.value = sid
    await Promise.all([loadDishes(), initSession(sid)])
  }
})

onBeforeUnmount(() => {
  stopSession()
})

// ── 提交回调 ───────────────────────────────────────────────────────────────────
function handleSubmitted() {
  // 工单由大厨在后台手动结束，前端只发推送通知、保持购物车和工单 active
  toastRef.value?.show('点单已发送给大厨！🍳', 'success')
}

function handleError() {
  toastRef.value?.show('发送失败，请稍后再试', 'error')
}
</script>

<style scoped>
.menu-page {
  min-height: 100vh;
  background: var(--glass-bg); 
  color: #e6edf3;
  font-family: 'JetBrains Mono', 'PingFang SC', 'Microsoft YaHei', monospace;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 0 env(safe-area-inset-bottom);
}

/* ── 头部 ─────────────────────────────────────────────────────────────────── */
.menu-header {
  background: var(--glass-bg); 
  border-bottom: 1px solid #21262d;
  border-bottom-color: rgba(249,115,22,.25);
  padding: 16px 16px 10px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.menu-header-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
}
.menu-brand { display: flex; align-items: center; gap: 12px; }
.menu-icon { font-size: 28px; line-height: 1; }
.menu-title { font-size: 18px; font-weight: 800; color: #e6edf3; }
.menu-tagline { font-size: 11px; color: #484f58; margin-top: 1px; }
.menu-meta { font-size: 11px; color: #484f58; margin-top: 6px; }

/* 购物车 */
.cart-fab {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 8px; cursor: pointer;
  background: rgba(249,115,22,.12); border: 1px solid rgba(249,115,22,.35);
  color: #f97316; font-size: 13px; font-family: inherit;
  font-weight: 700; transition: all .2s; position: relative;
  white-space: nowrap;
}
.cart-fab:hover { background: rgba(249,115,22,.22); box-shadow: 0 0 14px rgba(249,115,22,.25); }
.cart-count {
  position: absolute; top: -7px; right: -7px;
  min-width: 19px; height: 19px; border-radius: 10px; padding: 0 4px;
  background: #f97316; color: #0a0e14; font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  animation: pop-in .2s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes pop-in { from { transform: scale(0); } to { transform: scale(1); } }

/* ── 无工单提示 ───────────────────────────────────────────────────────────── */
.no-session {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; padding: 4rem 2rem; text-align: center;
}
.no-session-icon { font-size: 52px; opacity: .5; }
.no-session-title { font-size: 16px; font-weight: 700; color: #7d8590; margin: 0; }
.no-session-sub { font-size: 12px; color: #484f58; margin: 0; max-width: 280px; line-height: 1.6; }

/* ── 菜品网格 ─────────────────────────────────────────────────────────────── */
.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 0 16px;
}

/* ── 骨架屏 ───────────────────────────────────────────────────────────────── */
.dish-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 0 16px;
}
.dish-skeleton {
  height: 200px; border-radius: 10px;
  background: var(--glass-bg); border: 1px solid #21262d;
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

/* ── 移动端适配 ────────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .dish-grid, .dish-loading {
    grid-template-columns: repeat(2, 1fr);
    padding: 0 12px;
  }
  .menu-header { padding: 12px 12px 8px; }
}
</style>
