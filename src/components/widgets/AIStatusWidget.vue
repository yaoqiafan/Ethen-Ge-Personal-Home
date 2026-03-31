<template>
  <div class="card ai-card">
    <div class="card-header">
      <span class="header-dot cyan"></span>
      Module B — AI Toolbox
    </div>

    <div class="ai-title">AI Models</div>
    <div class="ai-subtitle">{{ onlineCount }}/{{ models.length }} online</div>

    <!-- Model list -->
    <div class="model-list">
      <div v-for="model in models" :key="model.id" class="model-row">
        <div class="model-left">
          <span class="status-dot" :class="model.online ? 'online' : 'offline'"></span>
          <div class="model-info">
            <span class="model-name">{{ model.name }}</span>
            <span class="model-provider">{{ model.provider }}</span>
          </div>
        </div>
        <div class="model-right">
          <span class="model-latency" :class="latencyClass(model.latency)">
            {{ model.online ? `${model.latency}ms` : '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Action -->
    <div class="ai-footer">
      <RouterLink to="/ai-toolbox" class="btn-open">
        <span class="btn-icon">✦</span>
        Open AI Toolbox
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { AIModel } from '@/types'

const models: AIModel[] = [
  { id: 'gpt4o',      name: 'GPT-4o',       provider: 'OpenAI',     online: true,  latency: 320, color: '#39d353' },
  { id: 'claude35',   name: 'Claude 3.5',   provider: 'Anthropic',  online: true,  latency: 280, color: '#bc8cff' },
  { id: 'deepseek',   name: 'DeepSeek V3',  provider: 'DeepSeek',   online: true,  latency: 190, color: '#58a6ff' },
  { id: 'kimi',       name: 'Kimi k1.5',    provider: 'Moonshot',   online: true,  latency: 210, color: '#e3b341' },
]

const onlineCount = computed(() => models.filter(m => m.online).length)

function latencyClass(ms: number): string {
  if (ms < 250) return 'lat-fast'
  if (ms < 400) return 'lat-ok'
  return 'lat-slow'
}
</script>

<style scoped>
.ai-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
}

.header-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #58a6ff;
  box-shadow: 0 0 6px rgba(88, 166, 255, 0.7);
}

.ai-title {
  font-size: 15px;
  font-weight: 700;
  color: #e6edf3;
}
.ai-subtitle {
  font-size: 11px;
  color: #7d8590;
  margin-top: -0.5rem;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}
.model-row:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: #21262d;
}

.model-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.model-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.model-name {
  font-size: 12px;
  font-weight: 600;
  color: #c9d1d9;
}
.model-provider {
  font-size: 10px;
  color: #484f58;
}

.model-right {}
.model-latency {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.lat-fast  { color: #39d353; }
.lat-ok    { color: #e3b341; }
.lat-slow  { color: #f85149; }

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
.status-dot.offline {
  background: #484f58;
}

.ai-footer {
  padding-top: 0.75rem;
  border-top: 1px solid #21262d;
}
.btn-open {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  background: rgba(88, 166, 255, 0.08);
  border: 1px solid rgba(88, 166, 255, 0.25);
  color: #58a6ff;
  transition: all 0.2s ease;
  font-family: 'JetBrains Mono', monospace;
}
.btn-open:hover {
  background: rgba(88, 166, 255, 0.15);
  border-color: #58a6ff;
  box-shadow: 0 0 12px rgba(88, 166, 255, 0.2);
}
.btn-icon {
  font-size: 11px;
}
</style>
