<template>
  <div class="dashboard animate-fade-in-up">
    <!-- Welcome -->
    <WelcomeCard class="dashboard-welcome" />

    <!-- Stat row -->
    <div class="stat-row">
      <div
        v-for="(stat, i) in statCards"
        :key="stat.id"
        class="stat-card glass-card"
        :style="{ animationDelay: `${0.1 + i * 0.06}s` }"
      >
        <div class="stat-icon" :style="{ color: stat.color }">{{ stat.icon }}</div>
        <div class="stat-body">
          <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-sub">{{ stat.sub }}</div>
        </div>
      </div>
    </div>

    <!-- Widget grid -->
    <div class="widget-grid">
      <div class="widget-fw">
        <FrameworkWidget />
      </div>
      <div class="widget-ai">
        <AIStatusWidget />
      </div>
    </div>

    <!-- Garage -->
    <GarageWidget />
  </div>
</template>

<script setup lang="ts">
import WelcomeCard from '@/components/widgets/WelcomeCard.vue'
import FrameworkWidget from '@/components/widgets/FrameworkWidget.vue'
import AIStatusWidget from '@/components/widgets/AIStatusWidget.vue'
import GarageWidget from '@/components/widgets/GarageWidget.vue'
import type { StatCard } from '@/types'

const statCards: StatCard[] = [
  {
    id: 'framework',
    label: 'PF.AutoFramework',
    value: '35%',
    sub: 'v0.3.0-alpha · 开发中',
    color: '#02AD8B',
    icon: '◈',
  },
  {
    id: 'ai-models',
    label: 'AI 模型在线',
    value: '4/4',
    sub: 'GPT-4o · Claude · Kimi · DeepSeek',
    color: '#58a6ff',
    icon: '✦',
  },
  {
    id: 'h2-fund',
    label: 'H2 提车基金',
    value: '44%',
    sub: '¥96,800 / ¥220,000',
    color: '#f85149',
    icon: '◎',
  },
  {
    id: 'experience',
    label: '开发经验',
    value: '5+ 年',
    sub: 'C# · .NET · WPF · Prism',
    color: '#bc8cff',
    icon: '⬡',
  },
]
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-welcome {
  width: 100%;
}

/* Stat row */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.stat-card {
  padding: 1.15rem;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  opacity: 1;
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s ease,
              box-shadow 0.3s ease;
}
.stat-card:hover {
  transform: translateY(-4px);
  background: var(--glass-bg-hover);
  border-color: rgba(2, 173, 139, 0.4);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 16px rgba(2, 173, 139, 0.08);
}

.stat-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
  line-height: 1;
}
.stat-body { min-width: 0; }
.stat-value {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.stat-label {
  font-size: 11px;
  color: #c9d1d9;
  font-weight: 600;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-sub {
  font-size: 10px;
  color: #484f58;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Widget grid */
.widget-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.75rem;
}
.widget-fw, .widget-ai {
  display: flex;
  flex-direction: column;
}
.widget-fw > *, .widget-ai > * { flex: 1; }

@keyframes fadeInUp {
  from { opacity: 1; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .stat-row { grid-template-columns: repeat(2, 1fr); }
  .widget-grid { grid-template-columns: 1fr; }
}
@media (max-width: 540px) {
  .stat-row { grid-template-columns: 1fr; }
}
</style>
