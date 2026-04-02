<template>
  <div class="dish-card" :class="{ 'dish-card--unavailable': !dish.available }">
    <!-- 图片区域 -->
    <div class="dish-img-wrap">
      <img
        v-if="dish.imageUrl && !imgError"
        :src="dish.imageUrl"
        :alt="dish.name"
        class="dish-img"
        @error="imgError = true"
      />
      <div v-else class="dish-img-placeholder">
        <span class="placeholder-icon">{{ CATEGORY_ICONS[dish.category] }}</span>
      </div>
      <!-- 估清遮罩 -->
      <div v-if="!dish.available" class="sold-out-mask">
        <span class="sold-out-text">今日估清</span>
      </div>
      <!-- 分类徽章 -->
      <span class="cat-badge">{{ dish.category }}</span>
    </div>

    <!-- 信息区域 -->
    <div class="dish-info">
      <div class="dish-name">{{ dish.name }}</div>
      <div class="dish-desc">{{ dish.description }}</div>
    </div>

    <!-- 操作区域 -->
    <div class="dish-actions">
      <span v-if="cartQty > 0" class="cart-qty">
        <button class="qty-btn" @click.stop="$emit('decrement', dish)">−</button>
        <span class="qty-num">{{ cartQty }}</span>
        <button class="qty-btn" @click.stop="$emit('increment', dish)">＋</button>
      </span>
      <button
        v-else
        class="add-btn"
        :disabled="!dish.available"
        @click.stop="$emit('add', dish)"
      >
        <span>{{ dish.available ? '＋ 加入点菜单' : '已估清' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Dish } from '@/types/kitchen'
import { CATEGORY_ICONS } from '@/types/kitchen'

defineProps<{ dish: Dish; cartQty: number }>()
defineEmits<{
  (e: 'add', dish: Dish): void
  (e: 'increment', dish: Dish): void
  (e: 'decrement', dish: Dish): void
}>()

const imgError = ref(false)
</script>

<style scoped>
.dish-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  overflow: hidden;
  transition: all .2s;
  display: flex;
  flex-direction: column;
}
.dish-card:hover { border-color: rgba(249,115,22,.35); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,.3); }
.dish-card--unavailable { opacity: .65; }
.dish-card--unavailable:hover { transform: none; box-shadow: none; }

.dish-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #0d1117;
}
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #161b22, #0d1117);
}
.placeholder-icon { font-size: 42px; opacity: .6; }

.sold-out-mask {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(2px);
}
.sold-out-text {
  font-size: 13px; color: #f85149; font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid rgba(248,81,73,.4); padding: 3px 10px; border-radius: 4px;
  background: rgba(248,81,73,.1);
}
.cat-badge {
  position: absolute; top: 8px; left: 8px;
  font-size: 10px; padding: 2px 7px; border-radius: 4px;
  background: rgba(0,0,0,.6); color: #e6edf3;
  backdrop-filter: blur(4px);
  font-family: 'JetBrains Mono', monospace;
}

.dish-info { padding: 10px 12px 6px; flex: 1; }
.dish-name { font-size: 14px; font-weight: 700; color: #e6edf3; margin-bottom: 4px; }
.dish-desc { font-size: 11px; color: #7d8590; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.dish-actions { padding: 8px 12px 12px; }
.add-btn {
  width: 100%; padding: 7px; border-radius: 6px; cursor: pointer;
  font-size: 12px; font-family: 'JetBrains Mono', monospace;
  background: rgba(249,115,22,.1); border: 1px solid rgba(249,115,22,.3);
  color: #f97316; transition: all .18s;
}
.add-btn:hover:not(:disabled) { background: rgba(249,115,22,.2); border-color: rgba(249,115,22,.6); }
.add-btn:disabled { opacity: .5; cursor: not-allowed; color: #484f58; border-color: #21262d; background: transparent; }

.cart-qty {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; width: 100%;
}
.qty-btn {
  width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
  font-size: 16px; line-height: 1;
  background: rgba(249,115,22,.1); border: 1px solid rgba(249,115,22,.3);
  color: #f97316; transition: all .15s; display: flex; align-items: center; justify-content: center;
}
.qty-btn:hover { background: rgba(249,115,22,.25); }
.qty-num { font-size: 15px; font-weight: 700; color: #f97316; font-family: 'JetBrains Mono', monospace; min-width: 20px; text-align: center; }
</style>
