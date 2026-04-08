<template>
  <div class="flex flex-col gap-3">

    <!-- 连接状态栏 -->
    <div class="flex items-center gap-3 flex-wrap">
      <!-- 呼吸灯 -->
      <span class="relative flex h-2.5 w-2.5 shrink-0">
        <span
          v-if="isConnected"
          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-green opacity-60"
        />
        <span
          class="relative inline-flex rounded-full h-2.5 w-2.5"
          :class="isConnected ? 'bg-terminal-green shadow-[0_0_6px_#39d353]' : 'bg-[#484f58]'"
        />
      </span>

      <span class="font-mono text-xs" :class="isConnected ? 'text-terminal-green' : 'text-[#484f58]'">
        {{ isConnected ? 'WS 已连接' : reconnectCount > 0 ? `重连中 (${reconnectCount}/${MAX_RETRIES})` : 'WS 未连接' }}
      </span>

      <div class="ml-auto flex flex-wrap gap-2">
        <button class="pf-btn pf-btn-green" :disabled="isConnected" @click="connect">
          <span>▶ 连接</span>
        </button>
        <button class="pf-btn pf-btn-red" :disabled="!isConnected" @click="disconnect">
          <span>■ 断开</span>
        </button>
      </div>
    </div>

    <!-- 监控控制行 -->
    <div class="flex flex-wrap gap-2">
      <button
        class="pf-btn pf-btn-green"
        :disabled="!isConnected || monitorRunning || actionLoading.start"
        @click="handleStartMonitor"
      >
        <span :class="{ 'animate-spin inline-block': actionLoading.start }">▶</span>
        启动监控
      </button>

      <button
        class="pf-btn pf-btn-red"
        :disabled="!monitorRunning || actionLoading.stop"
        @click="handleStopMonitor"
      >
        <span>■</span>
        停止监控
      </button>

      <button class="pf-btn" :disabled="!isConnected || !monitorRunning" @click="pushTestLogs">
        <span>⬡</span>
        推送测试日志
      </button>

      <button class="pf-btn pf-btn-yellow" :disabled="!isConnected" @click="handleGitPull">
        <span>⇅</span>
        拉取 GitHub
      </button>

      <div class="ml-auto flex gap-2">
        <button class="pf-btn" @click="clearLogs">
          <span>✕</span>
          清空日志
        </button>
        <button class="pf-btn" :disabled="!logs.length" @click="exportLogs">
          <span>↓</span>
          导出
        </button>
      </div>
    </div>

    <!-- 日志输出窗口 -->
    <div
      ref="logEl"
      class="relative rounded-md border border-[#21262d] bg-[#0d1117]
             h-64 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed
             scroll-smooth"
    >
      <!-- 初始提示行 -->
      <div v-if="!displayLogs.length" class="text-[#484f58]">
        <div class="log-line info">系统就绪，等待连接后端 API ...</div>
      </div>

      <div
        v-for="entry in displayLogs"
        :key="entry.id"
        class="log-line mb-0.5 border-l-2 pl-2 leading-5"
        :class="levelClass(entry.level)"
      >
        <span class="text-[#484f58]">[{{ formatTime(entry.timestamp) }}]</span>
        <span class="ml-1.5 uppercase text-[9px] tracking-wider opacity-70">{{ entry.level }}</span>
        <span class="ml-1.5">{{ entry.message }}</span>
      </div>
    </div>

    <!-- 底部元信息 -->
    <div class="flex items-center justify-between font-mono text-[10px] text-[#484f58]">
      <span>{{ displayLogs.length }} 条日志</span>
      <span v-if="lastEventTime">最后事件 {{ lastEventTime }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useOpenClawMonitor as usePFMonitor, pfMonitoringService, pfGitHubService } from '@/services/openclawService'
import type { LogEntry } from '@/services/openclawService'

// 环境变量检查
console.log('=== PFMonitorConsole 环境变量 ===')
console.log('VITE_PF_WS_URL:', import.meta.env.VITE_PF_WS_URL)
console.log('VITE_PF_API_URL:', import.meta.env.VITE_PF_API_URL)
console.log('MODE:', import.meta.env.MODE)
console.log('当前页面:', window.location.href)

// ── Emits ──────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  /** 连接状态变化时向父组件上报，用于 PFSystemStatus 的 wsConnected prop */
  (e: 'connection-change', connected: boolean): void
}>()

// ── WebSocket Composable ───────────────────────────────────────────────────────
const MAX_RETRIES = 5

const {
  isConnected,
  reconnectCount,
  logs,
  connect,
  disconnect,
  send,
  clearLogs: clearWsLogs,
} = usePFMonitor()

// ── 本地状态 ───────────────────────────────────────────────────────────────────
const monitorRunning  = ref(false)
const logEl           = ref<HTMLElement | null>(null)
const lastEventTime   = ref('')
const localLogs       = ref<LogEntry[]>([])   // 本地追加的日志（操作反馈等）

const actionLoading = ref({ start: false, stop: false })

// ── 合并日志：WS 推送 + 本地追加 ──────────────────────────────────────────────
const displayLogs = computed<LogEntry[]>(() => {
  // 合并后按时间升序，保留最新 200 条
  const merged = [...logs.value, ...localLogs.value]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-200)
  return merged
})

// ── 自动滚底 ───────────────────────────────────────────────────────────────────
watch(displayLogs, async () => {
  await nextTick()
  if (logEl.value) {
    logEl.value.scrollTop = logEl.value.scrollHeight
  }
})

// ── 连接状态上报给父组件 ───────────────────────────────────────────────────────
watch(isConnected, (val) => {
  emit('connection-change', val)
  appendLocal(val ? '握手成功，已接入 PF.AutoFramework' : '连接已断开', val ? 'success' : 'warning')
})

// ── 工具：向本地日志缓冲区追加一条 ───────────────────────────────────────────
function appendLocal(message: string, level: LogEntry['level'] = 'info') {
  const entry: LogEntry = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    level,
    source: 'console',
    message,
  }
  localLogs.value.push(entry)
  if (localLogs.value.length > 200) localLogs.value.splice(0, 50)
  lastEventTime.value = formatTime(entry.timestamp)
}

// ── 监控控制 ───────────────────────────────────────────────────────────────────
async function handleStartMonitor() {
  actionLoading.value.start = true
  appendLocal('挂载文件系统 Watcher ...', 'info')
  try {
    await pfMonitoringService.start({ mode: 'manual', checks: ['file', 'git', 'system'] })
    monitorRunning.value = true
    appendLocal('目录变动监控已生效', 'success')
    // 订阅 WS 监控事件
    send({ type: 'subscribe', topics: ['file.change', 'log.entry', 'monitoring.*'] })
  } catch (e) {
    appendLocal(`启动监控失败: ${(e as Error).message}`, 'error')
  } finally {
    actionLoading.value.start = false
  }
}

async function handleStopMonitor() {
  actionLoading.value.stop = true
  try {
    await pfMonitoringService.stop()
    monitorRunning.value = false
    appendLocal('文件系统 Watcher 已卸载', 'warning')
  } catch (e) {
    appendLocal(`停止监控失败: ${(e as Error).message}`, 'error')
  } finally {
    actionLoading.value.stop = false
  }
}

// ── 推送测试日志（模拟文件变更事件流）────────────────────────────────────────
function pushTestLogs() {
  const mockFiles = ['BOOTSTRAP.md', 'IDENTITY.md', 'PF知识库.md']
  mockFiles.forEach((file, i) => {
    setTimeout(() => {
      appendLocal(`文件 ${file} 发生变更，重新触发索引 ...`, 'warning')
    }, i * 600)
  })
  setTimeout(() => {
    appendLocal('测试流推送完毕', 'success')
  }, mockFiles.length * 600)
}

// ── GitHub 拉取 ────────────────────────────────────────────────────────────────
async function handleGitPull() {
  appendLocal('Fetching remote origin ...', 'info')
  try {
    const res = await pfGitHubService.checkUpdates()
    if (res.hasUpdates) {
      const pull = await pfGitHubService.pull()
      appendLocal(
        `已拉取更新：+${pull.summary.added} ~${pull.summary.modified} -${pull.summary.deleted}`,
        'success',
      )
    } else {
      appendLocal('当前分支 main 已是最新 (Already up to date)', 'success')
    }
  } catch (e) {
    appendLocal(`GitHub 操作失败: ${(e as Error).message}`, 'error')
  }
}

// ── 清空 & 导出日志 ────────────────────────────────────────────────────────────
function clearLogs() {
  clearWsLogs()
  localLogs.value = []
  appendLocal('日志缓冲区已刷新', 'info')
}

function exportLogs() {
  const lines = displayLogs.value
    .map(e => `[${e.timestamp}] [${e.level.toUpperCase().padEnd(7)}] [${e.source}] ${e.message}`)
    .join('\n')
  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `pf_kb_logs_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  appendLocal('日志切片已下载至本地', 'success')
}

// ── 格式化 ─────────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false })
}

function levelClass(level: string): string {
  const map: Record<string, string> = {
    info:    'border-terminal-cyan   text-[#9cdcfe]',
    success: 'border-terminal-green  text-[#b5cea8]',
    warning: 'border-terminal-yellow text-[#ce9178]',
    error:   'border-terminal-red    text-[#f48771]',
  }
  return map[level] ?? 'border-[#484f58] text-[#7d8590]'
}

// ── 初始化：加载历史日志 ───────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await pfMonitoringService.getLogs({ limit: 50 })
    if (res.logs?.length) {
      // 将历史日志写入本地缓冲（WS 未连接时也可展示）
      localLogs.value = [...res.logs].reverse()
      lastEventTime.value = formatTime(localLogs.value.at(-1)!.timestamp)
    }
  } catch {
    appendLocal('历史日志加载失败（后端离线）', 'warning')
  }
})
</script>

<style scoped>
.pf-btn {
  @apply flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d]
         px-3 py-1.5 font-mono text-xs text-[#7d8590]
         transition-all duration-150 cursor-pointer
         hover:border-[#39d353]/40 hover:text-[#c9d1d9]
         disabled:opacity-40 disabled:cursor-not-allowed;
}
.pf-btn-green { @apply hover:border-[#39d353]/60 hover:text-terminal-green; }
.pf-btn-red   { @apply hover:border-terminal-red/60 hover:text-terminal-red; }
.pf-btn-yellow{ @apply hover:border-[#e3b341]/60 hover:text-terminal-yellow; }
</style>
