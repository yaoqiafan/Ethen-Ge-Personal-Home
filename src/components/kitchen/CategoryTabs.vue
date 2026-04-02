<template>
  <div class="cat-tabs">
    <button
      class="cat-tab"
      :class="{ active: modelValue === null }"
      @click="$emit('update:modelValue', null)"
    >
      <span class="cat-icon">🍽️</span>
      <span class="cat-label">全部</span>
      <span class="cat-count">{{ total }}</span>
    </button>
    <button
      v-for="cat in DISH_CATEGORIES"
      :key="cat"
      class="cat-tab"
      :class="{ active: modelValue === cat }"
      @click="$emit('update:modelValue', cat)"
    >
      <span class="cat-icon">{{ CATEGORY_ICONS[cat] }}</span>
      <span class="cat-label">{{ cat }}</span>
      <span class="cat-count">{{ counts[cat] ?? 0 }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { DISH_CATEGORIES, CATEGORY_ICONS, type DishCategory, type Dish } from '@/types/kitchen'

const props = defineProps<{
  modelValue: DishCategory | null
  dishes: Dish[]
}>()
defineEmits<{ (e: 'update:modelValue', v: DishCategory | null): void }>()

import { computed } from 'vue'
const total = computed(() => props.dishes.length)
const counts = computed(() => {
  const m: Partial<Record<DishCategory, number>> = {}
  for (const d of props.dishes) m[d.category] = (m[d.category] ?? 0) + 1
  return m
})
</script>

<style scoped>
.cat-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 0;
}
.cat-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid #21262d;
  color: #7d8590;
  font-size: 12px;
  cursor: pointer;
  transition: all .18s;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}
.cat-tab:hover { border-color: #30363d; color: #c9d1d9; background: rgba(255,255,255,.03); }
.cat-tab.active {
  color: #f97316;
  background: rgba(249,115,22,.08);
  border-color: rgba(249,115,22,.35);
}
.cat-icon { font-size: 13px; }
.cat-label { font-size: 12px; }
.cat-count {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  color: #484f58;
  min-width: 18px;
  text-align: center;
}
.cat-tab.active .cat-count { background: rgba(249,115,22,.15); color: #f97316; }
</style>
