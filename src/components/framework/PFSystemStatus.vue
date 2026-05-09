<template>
  <div class="flex flex-col gap-3">

    <!-- 状态指标网格 -->
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div
        v-for="card in statusCards"
        :key="card.key"
        class="flex flex-col gap-1 rounded-lg border glass-bg px-4 py-3
               transition-transform duration-200 hover:-translate-y-px"
      >
        <span class="text-[10px] uppercase tracking-widest text-[#484f58] font-mono">{{ card.label }}</span>
        <span class="text-sm font-bold font-mono" :class="card.colorClass">
          <span v-if="loading" class="text-[#484f58]">--</span>
          <span v-else>{{ card.value }}</span>
        </span>
      </div>
    </div>

    <!-- 操作按钮行 -->
    <div class="flex flex-wrap gap-2">
      <button
        class="pf-btn"
        :disabled="actionLoading.refresh"
        @click="handleRefresh"
      >
        <span class="pf-btn-icon" :class="{ 'animate-spin': actionLoading.refresh }">↻</span>
        刷新状态
      </button>

      <button
        class="pf-btn pf-btn-green"
        :disabled="actionLoading.health"
        @click="handleHealthCheck"
      >
        <span class="pf-btn-icon">❤</span>
        健康检查
      </button>

      <button
        class="pf-btn pf-btn-yellow"
        :disabled="actionLoading.diag"
        @click="handleDiagnostics"
      >
        <span class="pf-btn-icon">⚙</span>
        系统诊断
      </button>
    </div>

    <!-- 诊断输出（仅在有内容时显示）-->
    <transition name="slide-down">
      <div
        v-if="diagMessage"
        class="rounded-md border border-[#21262d] glass-bg px-4 py-2
               font-mono text-xs text-[#7d8590] leading-relaxed"
      >
        <span class="text-terminal-green mr-2">›</span>{{ diagMessage }}
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { pfSystemService } from '@/services/openclawService'
import type { SystemStatus } from '@/services/openclawService'

// ── Props ──────────────────────────────────────────────────────────────────────
const props = defineProps<{
  /** 外部传入的 WebSocket 连接状态（由 PFMonitorConsole 上报） */
  wsConnected: boolean
}>()

// ── 状态 ───────────────────────────────────────────────────────────────────────
const loading  = ref(true)
const status   = ref<SystemStatus | null>(null)
const diagMessage = ref('')

const actionLoading = ref({ refresh: false, health: false, diag: false })

// ── 派生数据 ───────────────────────────────────────────────────────────────────
const statusCards = computed(() => {
  const s = status.value
  return [
    {
      key: 'sys',
      label: '核心服务',
      value: s ? statusLabel(s.system.status) : '--',
      colorClass: s ? statusColor(s.system.status) : 'text-[#484f58]',
    },
    {
      key: 'kb',
      label: '知识库引擎',
      value: s ? healthLabel(s.knowledgeBase.status) : '--',
      colorClass: s ? healthColor(s.knowledgeBase.status) : 'text-[#484f58]',
    },
    {
      key: 'docs',
      label: '索引文档数',
      value: s ? String(s.knowledgeBase.documentCount) : '0',
      colorClass: 'text-[#e6edf3]',
    },
    {
      key: 'mon',
      label: '后台监控',
      value: s ? monitorLabel(s.monitoring.status) : '--',
      colorClass: s ? monitorColor(s.monitoring.status) : 'text-[#484f58]',
    },
  ]
})

// ── 标签/颜色映射 ──────────────────────────────────────────────────────────────
function statusLabel(v: string) {
  return v === 'running' ? '运行正常' : v === 'stopped' ? '已停止' : '异常'
}
function statusColor(v: string) {
  return v === 'running' ? 'text-terminal-green' : v === 'error' ? 'text-terminal-red' : 'text-[#484f58]'
}
function healthLabel(v: string) {
  return v === 'healthy' ? '健康' : v === 'warning' ? '警告' : '错误'
}
function healthColor(v: string) {
  return v === 'healthy' ? 'text-terminal-green' : v === 'warning' ? 'text-terminal-yellow' : 'text-terminal-red'
}
function monitorLabel(v: string) {
  return v === 'active' ? '守护进程活跃' : v === 'paused' ? '已暂停' : '已停止'
}
function monitorColor(v: string) {
  return v === 'active' ? 'text-terminal-green' : v === 'paused' ? 'text-terminal-yellow' : 'text-[#484f58]'
}

// ── API 调用 ───────────────────────────────────────────────────────────────────
async function fetchStatus() {
  loading.value = true
  try {
    status.value = await pfSystemService.getStatus()
  } catch {
    // 离线时不强制报错，卡片显示 '--'
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  actionLoading.value.refresh = true
  diagMessage.value = ''
  try {
    status.value = await pfSystemService.refreshStatus()
  } catch (e) {
    diagMessage.value = `刷新失败: ${(e as Error).message}`
  } finally {
    actionLoading.value.refresh = false
  }
}

async function handleHealthCheck() {
  actionLoading.value.health = true
  diagMessage.value = ''
  try {
    const res = await pfSystemService.healthCheck()
    const ok = res.status === 'healthy'
    diagMessage.value = ok
      ? `健康检查通过：数据库 ${(res.checks?.database as { latency?: number } | undefined)?.latency ?? '?'}ms，磁盘和网络均正常`
      : `健康检查发现问题：${res.status}`
  } catch (e) {
    diagMessage.value = `健康检查失败: ${(e as Error).message}`
  } finally {
    actionLoading.value.health = false
  }
}

async function handleDiagnostics() {
  actionLoading.value.diag = true
  diagMessage.value = ''
  try {
    const res = await pfSystemService.getDiagnostics()
    const issueCount = res.issues?.length ?? 0
    diagMessage.value = issueCount === 0
      ? `诊断完成，未发现异常。平台 ${res.system?.platform ?? '?'}, Node ${res.system?.nodeVersion ?? '?'}`
      : `发现 ${issueCount} 个问题: ${res.issues.map(i => i.message).join('；')}`
  } catch (e) {
    diagMessage.value = `诊断请求失败: ${(e as Error).message}`
  } finally {
    actionLoading.value.diag = false
  }
}

// ── 生命周期 ───────────────────────────────────────────────────────────────────
onMounted(fetchStatus)

// 当 WS 连接后自动刷新一次
watch(() => props.wsConnected, (connected) => {
  if (connected) handleRefresh()
})
</script>

<style scoped>
/* 通用操作按钮 */
.pf-btn {
  display: flex; align-items: center; gap: 0.375rem;
  border-radius: 0.375rem; border: 1px solid #30363d;
  background: var(--glass-bg);
  padding: 0.25rem 0.5rem;
  font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #7d8590;
  transition: all 0.15s ease; cursor: pointer;
}
.pf-btn:hover { border-color: rgba(57, 211, 83, 0.4); color: #c9d1d9; }
.pf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pf-btn-green:hover { border-color: rgba(57, 211, 83, 0.6); color: #39d353; }
.pf-btn-yellow:hover { border-color: rgba(227, 179, 65, 0.6); color: #e3b341; }
.pf-btn-icon { font-size: 0.75rem; }

/* 诊断结果展开动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
