<template>
  <div class="welcome-card card animate-fade-in">
    <!-- Left: identity -->
    <div class="wc-left">
      <div class="wc-avatar">G</div>
      <div class="wc-info">
        <div class="wc-name">葛大大 <span class="wc-name-en">/ Ethen Ge</span></div>
        <div class="wc-title">
          <span class="wc-role">工业软件工程师</span>
          <span class="wc-sep">·</span>
          <span class="wc-status">
            <span class="status-dot online"></span>
            开放合作中
          </span>
        </div>
        <!-- Typewriter tagline -->
        <div class="wc-tagline">
          <span class="tagline-prompt">›</span>
          <span class="tagline-text">{{ typedText }}</span>
          <span class="tagline-cursor animate-blink">▌</span>
        </div>
      </div>
    </div>

    <!-- Right: quick stats -->
    <div class="wc-right">
      <div v-for="stat in stats" :key="stat.label" class="wc-stat">
        <div class="wc-stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
        <div class="wc-stat-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { sleep } from '@/composables/useTypewriter'

const typedText = ref('')

const taglines = [
  '正在构建 PF.AutoFramework — C# + .NET 8 + Prism',
  '攒钱买 Kawasaki H2...',
  '能编译，就发布。',
  '万行代码终入框架，千山万水终达 H2',
]

const stats = [
  { value: '5+', label: 'C# 年限', color: '#39d353' },
  { value: '100k+', label: '代码行数', color: '#58a6ff' },
  { value: '3', label: 'AI 模型接入', color: '#bc8cff' },
  { value: '∞', label: '待写代码行', color: '#e3b341' },
]

async function runTypewriter() {
  let taglineIdx = 0
  while (true) {
    const text = taglines[taglineIdx % taglines.length]
    // type
    for (let i = 0; i <= text.length; i++) {
      typedText.value = text.slice(0, i)
      await sleep(45)
    }
    await sleep(2200)
    // erase
    for (let i = text.length; i >= 0; i--) {
      typedText.value = text.slice(0, i)
      await sleep(20)
    }
    await sleep(400)
    taglineIdx++
  }
}

onMounted(() => {
  runTypewriter()
})
</script>

<style scoped>
.welcome-card {
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  border-radius: 10px;
}

.wc-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.wc-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(57, 211, 83, 0.1);
  border: 1.5px solid rgba(57, 211, 83, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #39d353;
  text-shadow: 0 0 12px rgba(57, 211, 83, 0.7);
  flex-shrink: 0;
}

.wc-info {
  flex: 1;
  min-width: 0;
}
.wc-name {
  font-size: 20px;
  font-weight: 700;
  color: #e6edf3;
  letter-spacing: 0.02em;
}
.wc-name-en {
  font-size: 14px;
  color: #7d8590;
  font-weight: 400;
}
.wc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  flex-wrap: wrap;
}
.wc-role {
  font-size: 12px;
  color: #58a6ff;
}
.wc-sep {
  color: #30363d;
  font-size: 12px;
}
.wc-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #7d8590;
}

.wc-tagline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #c9d1d9;
  min-height: 20px;
}
.tagline-prompt {
  color: #39d353;
  font-weight: 700;
}
.tagline-text {
  color: #c9d1d9;
}
.tagline-cursor {
  color: #39d353;
  line-height: 1;
}

/* Right stats */
.wc-right {
  display: flex;
  gap: 1.5rem;
  flex-shrink: 0;
  padding-left: 1.5rem;
  border-left: 1px solid #21262d;
}
.wc-stat {
  text-align: center;
  min-width: 60px;
}
.wc-stat-value {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.wc-stat-label {
  font-size: 10px;
  color: #484f58;
  margin-top: 3px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.online {
  background: #39d353;
  box-shadow: 0 0 5px rgba(57, 211, 83, 0.8);
}

@media (max-width: 700px) {
  .welcome-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .wc-right { border-left: none; border-top: 1px solid #21262d; padding-left: 0; padding-top: 1rem; width: 100%; }
  .wc-stat { min-width: 0; }
}
</style>
