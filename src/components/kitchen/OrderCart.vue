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
          <div v-for="item in cartItems" :key="item.dish.id" class="cart-item">
            <div class="ci-img-wrap">
              <img v-if="item.dish.imageUrl" :src="item.dish.imageUrl" :alt="item.dish.name" class="ci-img" @error="(e) => ((e.target as HTMLImageElement).style.display='none')" />
              <span v-else class="ci-emoji">{{ CATEGORY_ICONS[item.dish.category] }}</span>
            </div>
            <div class="ci-info">
              <div class="ci-name">{{ item.dish.name }}</div>
              <div class="ci-cat">{{ item.dish.category }}</div>
            </div>
            <div class="ci-qty">
              <button class="qty-btn" @click="setQuantity(item.dish.id, item.quantity - 1)">−</button>
              <span class="qty-num">{{ item.quantity }}</span>
              <button class="qty-btn" @click="setQuantity(item.dish.id, item.quantity + 1)">＋</button>
            </div>
            <button class="ci-remove" @click="removeFromCart(item.dish.id)">✕</button>
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
            <span class="summary-count">共 {{ cartCount }} 道菜</span>
            <button
              class="submit-btn"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <span v-if="submitting" class="submit-loading">发送中…</span>
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
import { ref } from 'vue'
import { CATEGORY_ICONS } from '@/types/kitchen'
import {
  cartItems, cartCount, cartIsEmpty, cartOpen,
  closeCart, removeFromCart, setQuantity,
  submitOrder, submitting, submitError,
} from '@/composables/useKitchenCart'

const emit = defineEmits<{ (e: 'submitted'): void; (e: 'error'): void }>()

const note = ref('')

async function handleSubmit() {
  const ok = await submitOrder(note.value)
  if (ok) {
    note.value = ''
    emit('submitted')
  } else {
    emit('error')
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
.ci-img-wrap { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #161b22; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ci-img { width: 100%; height: 100%; object-fit: cover; }
.ci-emoji { font-size: 20px; }
.ci-info { flex: 1; min-width: 0; }
.ci-name { font-size: 12px; font-weight: 600; color: #c9d1d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-cat { font-size: 10px; color: #484f58; margin-top: 2px; }
.ci-qty { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.qty-btn { width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 14px; background: rgba(249,115,22,.08); border: 1px solid rgba(249,115,22,.25); color: #f97316; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.qty-btn:hover { background: rgba(249,115,22,.2); }
.qty-num { font-size: 13px; font-weight: 700; color: #f97316; font-family: 'JetBrains Mono', monospace; min-width: 16px; text-align: center; }
.ci-remove { width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 10px; background: transparent; border: 1px solid #21262d; color: #484f58; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.ci-remove:hover { color: #f85149; border-color: rgba(248,81,73,.3); background: rgba(248,81,73,.06); }

.cart-footer { padding: 12px 14px 18px; border-top: 1px solid #21262d; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
.cart-note {
  width: 100%; background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
  color: #c9d1d9; font-size: 12px; font-family: 'JetBrains Mono', monospace;
  padding: 8px 10px; resize: none; outline: none; transition: border-color .15s;
  box-sizing: border-box;
}
.cart-note:focus { border-color: rgba(249,115,22,.4); }
.cart-note::placeholder { color: #484f58; }

.cart-summary { display: flex; align-items: center; justify-content: space-between; }
.summary-count { font-size: 12px; color: #7d8590; }
.submit-btn {
  padding: 8px 20px; border-radius: 7px; cursor: pointer;
  font-size: 13px; font-family: 'JetBrains Mono', monospace; font-weight: 700;
  background: rgba(249,115,22,.15); border: 1px solid rgba(249,115,22,.4); color: #f97316;
  transition: all .2s;
}
.submit-btn:hover:not(:disabled) { background: rgba(249,115,22,.25); border-color: rgba(249,115,22,.7); box-shadow: 0 0 12px rgba(249,115,22,.2); }
.submit-btn:disabled { opacity: .5; cursor: not-allowed; }
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
