<template>
  <header class="app-header">
    <!-- Breadcrumb / Page title -->
    <div class="header-left">
      <span class="header-path">~/</span>
      <span class="header-separator">›</span>
      <span class="header-page">{{ routeMeta.title }}</span>
      <span v-if="routeMeta.titleCN" class="header-page-cn">{{ routeMeta.titleCN }}</span>
    </div>

    <!-- Right status bar -->
    <div class="header-right">
      <!-- Mini terminal status -->
      <div class="status-chip">
        <span class="status-dot online"></span>
        <span class="chip-text">All systems online</span>
      </div>

      <div class="divider"></div>

      <!-- Stack badges -->
      <div class="stack-chips">
        <span class="stack-chip">C#</span>
        <span class="stack-chip cyan">.NET 8</span>
        <span class="stack-chip purple">Vue 3</span>
      </div>

      <div class="divider"></div>

      <span class="header-time">{{ currentTime }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const routeMeta = computed(() => ({
  title: (route.meta?.title as string) ?? 'Dashboard',
  titleCN: (route.meta?.titleCN as string) ?? '',
}))

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 48px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  min-width: 0;
}
.header-path {
  color: #7d8590;
  font-size: 12px;
}
.header-separator {
  color: #30363d;
  font-size: 12px;
}
.header-page {
  color: #e6edf3;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-page-cn {
  font-size: 11px;
  color: #484f58;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 5px;
}
.chip-text {
  font-size: 11px;
  color: #7d8590;
  white-space: nowrap;
}

.divider {
  width: 1px;
  height: 16px;
  background: #21262d;
}

.stack-chips {
  display: flex;
  align-items: center;
  gap: 4px;
}
.stack-chip {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(57, 211, 83, 0.08);
  border: 1px solid rgba(57, 211, 83, 0.2);
  color: #39d353;
  letter-spacing: 0.04em;
}
.stack-chip.cyan {
  background: rgba(88, 166, 255, 0.08);
  border-color: rgba(88, 166, 255, 0.2);
  color: #58a6ff;
}
.stack-chip.purple {
  background: rgba(188, 140, 255, 0.08);
  border-color: rgba(188, 140, 255, 0.2);
  color: #bc8cff;
}

.header-time {
  font-size: 12px;
  color: #484f58;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.online {
  background: #39d353;
  box-shadow: 0 0 5px rgba(57, 211, 83, 0.8);
}

@media (max-width: 640px) {
  .stack-chips, .divider, .status-chip { display: none; }
}
</style>
