<template>
  <!-- 遮罩 -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="cartOpen" class="cart-overlay" @click="closeCart" />
    </Transition>

    <!-- 抽屉 -->
    <Transition name="drawer">
      <div v-if="cartOpen" class="cart-drawer">
        <!-- 头部 -->
        <div class="cart-header">
          <div class="cart-title">
            <span class="cart-icon">◫</span>
            <span>点菜单</span>
            <span class="cart-badge">{{ cartCount }}</span>
          </div>
          <button class="cart-close" @click="closeCart">✕</button>
        </div>

        <!-- 空状态 -->
        <div v-if="cartIsEmpty" class="cart-empty">
          <span class="empty-icon">🍽️</span>
          <p class="empty-text">还没有选择任何菜品</p>
          <p class="empty-sub">去左边点菜吧～</p>
        </div>

        <!-- 菜品列表 -->
        <div v-else class="cart-list">
          <div
            v-for="item in cartItems"
            :key="item.dish.id"
            class="cart-item"
            :class="{ 'cart-item--submitted': (item.submittedQty ?? 0) > 0, 'cart-item--custom': item.dish.isCustom }"
          >
            <div class="ci-img-wrap">
              <span v-if="item.dish.isCustom" class="ci-emoji">✏️</span>
              <img v-else-if="item.dish.imageUrl" :src="item.dish.imageUrl" :alt="item.dish.name" class="ci-img" @error="(e) => ((e.target as HTMLImageElement).style.display='none')" />
              <span v-else class="ci-emoji">{{ CATEGORY_ICONS[item.dish.category] }}</span>
            </div>
            <div class="ci-info">
              <div class="ci-name">{{ item.dish.name }}</div>
              <!-- 已下单提示 -->
              <div v-if="(item.submittedQty ?? 0) > 0" class="ci-submitted-tag">
                ✓ 已下单 {{ item.submittedQty }} 份
                <span v-if="item.quantity > (item.submittedQty ?? 0)" class="ci-new-tag">
                  +{{ item.quantity - (item.submittedQty ?? 0) }} 待提交
                </span>
              </div>
              <div v-else class="ci-cat">
                <span v-if="item.dish.isCustom" class="ci-custom-badge">自定义</span>
                <span v-else>{{ item.dish.category }}</span>
              </div>
            </div>
            <div class="ci-qty">
              <button class="qty-btn" @click="setQuantity(item.dish.id, item.quantity - 1)">−</button>
              <span class="qty-num">{{ item.quantity }}</span>
              <button class="qty-btn" @click="setQuantity(item.dish.id, item.quantity + 1)">＋</button>
            </div>
            <button class="ci-remove" @click="removeFromCart(item.dish.id)">✕</button>
          </div>
        </div>

        <!-- 自定义点菜区 -->
        <div class="custom-dish-box">
          <div class="custom-dish-label">✏ 菜单里没有？自己写</div>
          <div class="custom-dish-row">
            <input
              v-model="customDishInput"
              class="custom-dish-input"
              placeholder="填写想吃的菜名…"
              maxlength="30"
              @keydown.enter.prevent="handleAddCustom"
            />
            <button class="btn-add-custom" :disabled="!customDishInput.trim()" @click="handleAddCustom">添加</button>
          </div>
        </div>

        <!-- 底部提交区 -->
        <div v-if="!cartIsEmpty" class="cart-footer">
          <textarea
            v-model="note"
            class="cart-note"
            placeholder="备注（口味、忌口等）..."
            rows="2"
          />
          <div class="cart-summary">
            <div class="summary-info">
              <span class="summary-count">共 {{ cartCount }} 份</span>
              <span v-if="newItemsCount > 0" class="summary-new">待提交 {{ newItemsCount }} 道</span>
            </div>
            <button
              class="submit-btn"
              :class="{ 'submit-btn--all-done': !hasNewItems && !submitting }"
              :disabled="submitting || !hasNewItems"
              @click="handleSubmit"
            >
              <span v-if="submitting" class="submit-loading">发送中…</span>
              <span v-else-if="!hasNewItems">✓ 已全部下单</span>
              <span v-else>🍳 提交点单</span>
            </button>
          </div>
          <div v-if="submitError" class="submit-error">{{ submitError }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CATEGORY_ICONS } from '@/types/kitchen'
import {
  cartItems, cartCount, cartIsEmpty, cartOpen, hasNewItems,
  closeCart, removeFromCart, setQuantity,
  submitOrder, submitting, submitError,
  addCustomDish,
} from '@/composables/useKitchenCart'

const emit = defineEmits<{ (e: 'submitted'): void; (e: 'error'): void }>()

const note = ref('')
const customDishInput = ref('')

function handleAddCustom() {
  if (!customDishInput.value.trim()) return
  addCustomDish(customDishInput.value)
  customDishInput.value = ''
}

/** 待提交的菜品道数（去重按 dish，非份数） */
const newItemsCount = computed(() =>
  cartItems.value.filter(i => i.quantity > (i.submittedQty ?? 0)).length
)

async function handleSubmit() {
  const ok = await submitOrder(note.value)
  if (ok) {
    note.value = ''
    emit('submitted')
  } else {
    // submitError 由 composable 写入，已在模板里展示；只在真实错误时 emit
    if (submitError.value && submitError.value !== '没有新增菜品，请先加菜再提交') {
      emit('error')
    }
  }
}
</script>

<style scoped>
.cart-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(2px);
  z-index: 200;
}
.cart-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(360px, 92vw);
  background: #161b22;
  border-left: 1px solid #21262d;
  z-index: 201;
  display: flex; flex-direction: column;
  box-shadow: -8px 0 40px rgba(0,0,0,.4);
}

.cart-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}
.cart-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #e6edf3; }
.cart-icon { color: #f97316; font-size: 16px; }
.cart-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: rgba(249,115,22,.15); border: 1px solid rgba(249,115,22,.3); color: #f97316;
  font-family: 'JetBrains Mono', monospace;
}
.cart-close {
  width: 28px; height: 28px; border-radius: 5px; cursor: pointer;
  background: rgba(255,255,255,.04); border: 1px solid #21262d;
  color: #7d8590; font-size: 12px; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.cart-close:hover { color: #f85149; border-color: rgba(248,81,73,.3); }

.cart-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  padding: 2rem;
}
.empty-icon { font-size: 48px; opacity: .5; }
.empty-text { font-size: 13px; color: #7d8590; margin: 0; }
.empty-sub { font-size: 11px; color: #484f58; margin: 0; }

.cart-list { flex: 1; overflow-y: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }

.cart-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 7px;
  background: #0d1117; border: 1px solid #21262d;
  transition: border-color .15s;
}
.cart-item:hover { border-color: rgba(249,115,22,.25); }
/* 已有提交记录的卡片，给一个绿色左侧标记 */
.cart-item--submitted {
  border-left: 2px solid rgba(57,211,83,.35);
}
.ci-img-wrap { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #161b22; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ci-img { width: 100%; height: 100%; object-fit: cover; }
.ci-emoji { font-size: 20px; }
.ci-info { flex: 1; min-width: 0; }
.ci-name { font-size: 12px; font-weight: 600; color: #c9d1d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-cat { font-size: 10px; color: #484f58; margin-top: 2px; }
/* 已下单 / 待提交 标签行 */
.ci-submitted-tag {
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  font-size: 10px; color: #39d353; font-family: 'JetBrains Mono', monospace;
  margin-top: 2px;
}
.ci-new-tag {
  color: #f97316;
}
.ci-qty { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.qty-btn { width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 14px; background: rgba(249,115,22,.08); border: 1px solid rgba(249,115,22,.25); color: #f97316; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.qty-btn:hover { background: rgba(249,115,22,.2); }
.qty-num { font-size: 13px; font-weight: 700; color: #f97316; font-family: 'JetBrains Mono', monospace; min-width: 16px; text-align: center; }
.ci-remove { width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 10px; background: transparent; border: 1px solid #21262d; color: #484f58; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.ci-remove:hover { color: #f85149; border-color: rgba(248,81,73,.3); background: rgba(248,81,73,.06); }

/* 自定义菜品 */
.cart-item--custom { border-left: 2px solid rgba(139,92,246,.4); }
.ci-custom-badge {
  font-size: 9px; padding: 1px 5px; border-radius: 3px;
  background: rgba(139,92,246,.1); border: 1px solid rgba(139,92,246,.3);
  color: #a78bfa; font-family: 'JetBrains Mono', monospace;
}
.custom-dish-box {
  padding: 10px 14px; border-top: 1px solid #21262d; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 7px;
}
.custom-dish-label { font-size: 10px; color: #7d8590; font-family: 'JetBrains Mono', monospace; }
.custom-dish-row { display: flex; gap: 7px; }
.custom-dish-input {
  flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
  color: #c9d1d9; font-size: 12px; font-family: 'JetBrains Mono', monospace;
  padding: 6px 10px; outline: none; transition: border-color .15s;
}
.custom-dish-input:focus { border-color: rgba(139,92,246,.45); }
.custom-dish-input::placeholder { color: #484f58; }
.btn-add-custom {
  padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 11px; white-space: nowrap;
  font-family: 'JetBrains Mono', monospace; font-weight: 600; flex-shrink: 0;
  background: rgba(139,92,246,.1); border: 1px solid rgba(139,92,246,.3); color: #a78bfa;
  transition: all .2s;
}
.btn-add-custom:hover:not(:disabled) { background: rgba(139,92,246,.2); }
.btn-add-custom:disabled { opacity: .4; cursor: not-allowed; }

.cart-footer { padding: 12px 14px 18px; border-top: 1px solid #21262d; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
.cart-note {
  width: 100%; background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
  color: #c9d1d9; font-size: 12px; font-family: 'JetBrains Mono', monospace;
  padding: 8px 10px; resize: none; outline: none; transition: border-color .15s;
  box-sizing: border-box;
}
.cart-note:focus { border-color: rgba(249,115,22,.4); }
.cart-note::placeholder { color: #484f58; }

.cart-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.summary-info { display: flex; flex-direction: column; gap: 2px; }
.summary-count { font-size: 12px; color: #7d8590; }
.summary-new { font-size: 10px; color: #f97316; font-family: 'JetBrains Mono', monospace; }
.submit-btn {
  padding: 8px 20px; border-radius: 7px; cursor: pointer;
  font-size: 13px; font-family: 'JetBrains Mono', monospace; font-weight: 700;
  background: rgba(249,115,22,.15); border: 1px solid rgba(249,115,22,.4); color: #f97316;
  transition: all .2s; white-space: nowrap;
}
.submit-btn:hover:not(:disabled) { background: rgba(249,115,22,.25); border-color: rgba(249,115,22,.7); box-shadow: 0 0 12px rgba(249,115,22,.2); }
.submit-btn:disabled { opacity: .5; cursor: not-allowed; }
/* 全部已下单状态 */
.submit-btn--all-done {
  background: rgba(57,211,83,.08); border-color: rgba(57,211,83,.25); color: #39d353;
}
.submit-loading { animation: pulse-txt 1s ease-in-out infinite; }
@keyframes pulse-txt { 0%,100% { opacity:1; } 50% { opacity:.5; } }
.submit-error { font-size: 11px; color: #f85149; font-family: 'JetBrains Mono', monospace; word-break: break-all; }

/* 过渡动画 */
.overlay-enter-active, .overlay-leave-active { transition: opacity .25s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.drawer-enter-active { transition: transform .3s cubic-bezier(0.34,1.2,0.64,1); }
.drawer-leave-active { transition: transform .22s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
</style>
