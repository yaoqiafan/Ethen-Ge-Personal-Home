<template>
  <div class="card garage-card">
    <div class="card-header">
      <span class="header-dot red"></span>
      模块 C — 数字车库
    </div>

    <!-- Bike header -->
    <div class="bike-header">
      <div class="bike-title-group">
        <div class="bike-brand">KAWASAKI</div>
        <div class="bike-model">
          <span class="model-h">H</span><span class="model-2">2</span>
          <span class="model-sub">SUPERCHARGED</span>
        </div>
      </div>
      <div class="bike-stats-mini">
        <div class="mini-stat">
          <span class="mini-val">998</span><span class="mini-unit">cc</span>
        </div>
        <div class="mini-divider"></div>
        <div class="mini-stat">
          <span class="mini-val">200+</span><span class="mini-unit">hp</span>
        </div>
        <div class="mini-divider"></div>
        <div class="mini-stat">
          <span class="mini-val">400</span><span class="mini-unit">km/h</span>
        </div>
      </div>
    </div>

    <!-- Progress section -->
    <div class="h2-progress">
      <div class="progress-header">
        <div class="progress-title">H2 提车基金</div>
        <div class="progress-pct-badge">{{ progressPct }}%</div>
      </div>

      <!-- Custom progress bar -->
      <div class="h2-progress-track">
        <div class="h2-progress-fill" :style="{ width: `${progressPct}%` }">
          <span class="progress-glow"></span>
        </div>
        <!-- Milestones -->
        <div
          v-for="ms in h2.milestones"
          :key="ms.label"
          class="milestone-marker"
          :class="{ reached: ms.reached }"
          :style="{ left: `${(ms.amount / h2.target) * 100}%` }"
          :title="ms.label"
        >
          <span class="ms-line"></span>
        </div>
      </div>

      <!-- Amount display -->
      <div class="amount-row">
        <div class="amount-current">
          <span class="amount-label">已攒</span>
          <span class="amount-value green">¥{{ formatAmount(h2.current) }}</span>
        </div>
        <div class="amount-gap">
          <span class="amount-label">还差</span>
          <span class="amount-value yellow">¥{{ formatAmount(h2.target - h2.current) }}</span>
        </div>
        <div class="amount-target">
          <span class="amount-label">目标</span>
          <span class="amount-value muted">¥{{ formatAmount(h2.target) }}</span>
        </div>
      </div>

      <!-- Milestones legend -->
      <div class="milestones-row">
        <div
          v-for="ms in h2.milestones"
          :key="ms.label"
          class="milestone-pill"
          :class="{ reached: ms.reached }"
        >
          <span class="ms-check">{{ ms.reached ? '✓' : '○' }}</span>
          {{ ms.label }}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="garage-footer">
      <div class="eta-row">
        <span class="eta-label">预计提车</span>
        <span class="eta-date">{{ h2.targetDate }}</span>
      </div>
      <RouterLink to="/garage" class="btn-garage">
        进入车库 →
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { H2Progress } from '@/types'

const h2: H2Progress = {
  target: 220000,
  current: 96800,
  currency: '¥',
  startDate: '2024-01',
  targetDate: '2026-Q4',
  milestones: [
    { label: '保险 & 税费', amount: 30000, reached: true },
    { label: '首付 50%',    amount: 110000, reached: false },
    { label: '全款到手',    amount: 220000, reached: false },
  ],
}

const progressPct = computed(() =>
  Math.min(100, Math.round((h2.current / h2.target) * 100))
)

function formatAmount(n: number): string {
  return n.toLocaleString('zh-CN')
}
</script>

<style scoped>
.garage-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

.header-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.header-dot.red {
  background: #f85149;
  box-shadow: 0 0 6px rgba(248, 81, 73, 0.7);
}

/* Bike header */
.bike-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bike-brand {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: #39d353;
  text-shadow: 0 0 8px rgba(57, 211, 83, 0.5);
}
.bike-model {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 2px;
}
.model-h {
  font-size: 28px;
  font-weight: 900;
  color: #e6edf3;
  line-height: 1;
  letter-spacing: -0.02em;
}
.model-2 {
  font-size: 28px;
  font-weight: 900;
  color: #f85149;
  line-height: 1;
  text-shadow: 0 0 12px rgba(248, 81, 73, 0.6);
  letter-spacing: -0.02em;
}
.model-sub {
  font-size: 9px;
  letter-spacing: 0.12em;
  color: #484f58;
  font-weight: 700;
  text-transform: uppercase;
  align-self: flex-end;
  padding-bottom: 4px;
}

.bike-stats-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #21262d;
  border-radius: 6px;
  background: rgba(248, 81, 73, 0.04);
}
.mini-stat {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.mini-val {
  font-size: 15px;
  font-weight: 700;
  color: #f85149;
}
.mini-unit {
  font-size: 10px;
  color: #484f58;
}
.mini-divider {
  width: 1px;
  height: 14px;
  background: #21262d;
}

/* Progress section */
.h2-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.progress-title {
  font-size: 12px;
  font-weight: 600;
  color: #c9d1d9;
}
.progress-pct-badge {
  font-size: 13px;
  font-weight: 800;
  color: #39d353;
  text-shadow: 0 0 8px rgba(57, 211, 83, 0.5);
}

/* H2 progress bar */
.h2-progress-track {
  position: relative;
  width: 100%;
  height: 10px;
  background: #21262d;
  border-radius: 5px;
  overflow: visible;
}
.h2-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #39d353 0%, #58a6ff 60%, #f85149 100%);
  box-shadow: 0 0 10px rgba(57, 211, 83, 0.5);
  transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
.progress-glow {
  position: absolute;
  right: 0;
  top: -3px;
  width: 12px;
  height: 16px;
  background: rgba(255, 255, 255, 0.5);
  filter: blur(4px);
  border-radius: 50%;
}

.milestone-marker {
  position: absolute;
  top: -3px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ms-line {
  display: block;
  width: 2px;
  height: 16px;
  background: #30363d;
  border-radius: 1px;
}
.milestone-marker.reached .ms-line {
  background: rgba(57, 211, 83, 0.5);
}

/* Amount row */
.amount-row {
  display: flex;
  gap: 1.5rem;
}
.amount-current, .amount-gap, .amount-target {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.amount-label {
  font-size: 10px;
  color: #484f58;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.amount-value {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.amount-value.green  { color: #39d353; }
.amount-value.yellow { color: #e3b341; }
.amount-value.muted  { color: #7d8590; }

/* Milestones */
.milestones-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.milestone-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #484f58;
}
.milestone-pill.reached {
  background: rgba(57, 211, 83, 0.08);
  border-color: rgba(57, 211, 83, 0.25);
  color: #7d8590;
}
.ms-check { color: #39d353; }

/* Footer */
.garage-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid #21262d;
}
.eta-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eta-label {
  font-size: 10px;
  color: #484f58;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.eta-date {
  font-size: 13px;
  font-weight: 600;
  color: #e3b341;
}

.btn-garage {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 6px;
  text-decoration: none;
  background: rgba(248, 81, 73, 0.08);
  border: 1px solid rgba(248, 81, 73, 0.25);
  color: #f85149;
  transition: all 0.2s ease;
  font-family: 'JetBrains Mono', monospace;
}
.btn-garage:hover {
  background: rgba(248, 81, 73, 0.15);
  border-color: #f85149;
  box-shadow: 0 0 12px rgba(248, 81, 73, 0.2);
}
</style>
