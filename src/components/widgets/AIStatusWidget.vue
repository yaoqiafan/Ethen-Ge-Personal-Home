<template>
  <div class="card ai-card">
    <div class="card-header">
      <span class="header-dot cyan"></span>
      模块 B — AI 百宝箱
    </div>

    <div class="ai-title">AI 模型</div>
    <div class="ai-subtitle">
      <template v-if="loading">加载中…</template>
      <template v-else-if="error">连接失败</template>
      <template v-else>{{ onlineCount }}/{{ models.length }} 在线</template>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="model-list">
      <div v-for="i in 4" :key="i" class="model-row skeleton-row">
        <div class="skel skel-dot"></div>
        <div class="skel skel-name"></div>
        <div class="skel skel-lat"></div>
      </div>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error" class="error-state">
      <span class="err-icon">⚡</span>
      <span class="err-text">{{ error }}</span>
      <button class="err-retry" @click="load">重试</button>
    </div>

    <!-- 数据态 -->
    <div v-else class="model-list">
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

    <!-- 节点状态小条 -->
    <div v-if="!loading && !error && nodeCount > 0" class="node-strip">
      <span class="node-label">节点</span>
      <span class="node-val">{{ onlineNodeCount }}/{{ nodeCount }} 活跃</span>
    </div>

    <!-- Action -->
    <div class="ai-footer">
      <RouterLink to="/ai-toolbox" class="btn-open">
        <span class="btn-icon">✦</span>
        打开 AI 百宝箱
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { getModels, getSystemStatus } from '@/services/aiService'
import type { AIModel, SystemStatus } from '@/services/aiService'

const models   = ref<AIModel[]>([])
const status   = ref<SystemStatus | null>(null)
const loading  = ref(true)
const error    = ref('')

const onlineCount     = computed(() => models.value.filter(m => m.online).length)
const nodeCount       = computed(() => status.value?.nodeCount ?? 0)
const onlineNodeCount = computed(() =>
  status.value?.nodes.filter(n => n.status === 'online').length ?? 0
)

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const [m, s] = await Promise.all([getModels(), getSystemStatus()])
    models.value = m
    status.value = s
  } catch (e) {
    error.value = e instanceof Error ? e.message : '未知错误'
  } finally {
    loading.value = false
  }
}

function latencyClass(ms: number): string {
  if (ms < 250) return 'lat-fast'
  if (ms < 400) return 'lat-ok'
  return 'lat-slow'
}

onMounted(load)
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
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #58a6ff;
  box-shadow: 0 0 6px rgba(88,166,255,.7);
}

.ai-title    { font-size: 15px; font-weight: 700; color: #e6edf3; }
.ai-subtitle { font-size: 11px; color: #7d8590; margin-top: -0.5rem; }

/* ── 模型列表 ─────────────────────────────────────────────────── */
.model-list { display: flex; flex-direction: column; gap: 2px; flex: 1; }

.model-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 8px; border-radius: 5px;
  border: 1px solid transparent; transition: all .15s;
}
.model-row:hover { background: rgba(255,255,255,.03); border-color: #21262d; }

.model-left  { display: flex; align-items: center; gap: 8px; }
.model-info  { display: flex; flex-direction: column; gap: 1px; }
.model-name  { font-size: 12px; font-weight: 600; color: #c9d1d9; }
.model-provider { font-size: 10px; color: #484f58; }

.model-latency { font-size: 11px; font-variant-numeric: tabular-nums; }
.lat-fast  { color: #39d353; }
.lat-ok    { color: #e3b341; }
.lat-slow  { color: #f85149; }

.status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online  { background: #39d353; box-shadow: 0 0 5px rgba(57,211,83,.8); }
.status-dot.offline { background: #484f58; }

/* ── 骨架屏 ───────────────────────────────────────────────────── */
.skeleton-row { cursor: default; }
.skel {
  background: #21262d;
  border-radius: 3px;
  animation: shimmer 1.4s ease-in-out infinite;
}
.skel-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.skel-name { width: 80px; height: 10px; }
.skel-lat  { width: 36px; height: 10px; }
@keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* ── 错误态 ───────────────────────────────────────────────────── */
.error-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 1rem 0; flex: 1;
}
.err-icon { font-size: 18px; color: #f85149; }
.err-text { font-size: 11px; color: #7d8590; text-align: center; }
.err-retry {
  font-size: 11px; padding: 3px 12px; border-radius: 4px; cursor: pointer;
  background: rgba(248,81,73,.08); border: 1px solid rgba(248,81,73,.3);
  color: #f85149; transition: all .15s;
}
.err-retry:hover { background: rgba(248,81,73,.18); }

/* ── 节点小条 ─────────────────────────────────────────────────── */
.node-strip {
  display: flex; justify-content: space-between;
  padding: 5px 8px; border-radius: 4px;
  background: rgba(88,166,255,.04); border: 1px solid rgba(88,166,255,.12);
  font-size: 11px;
}
.node-label { color: #484f58; }
.node-val   { color: #58a6ff; font-variant-numeric: tabular-nums; }

/* ── 底部按钮 ─────────────────────────────────────────────────── */
.ai-footer { padding-top: 0.75rem; border-top: 1px solid #21262d; }
.btn-open {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 7px 12px; border-radius: 6px;
  font-size: 12px; font-weight: 600; text-decoration: none;
  background: rgba(88,166,255,.08); border: 1px solid rgba(88,166,255,.25);
  color: #58a6ff; transition: all .2s;
  font-family: 'JetBrains Mono', monospace;
}
.btn-open:hover {
  background: rgba(88,166,255,.15); border-color: #58a6ff;
  box-shadow: 0 0 12px rgba(88,166,255,.2);
}
.btn-icon { font-size: 11px; }
</style>
