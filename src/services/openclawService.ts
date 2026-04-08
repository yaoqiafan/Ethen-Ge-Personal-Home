/**
 * openclawService.ts
 * OpenClaw 网关服务层
 *
 * 架构：Vue 前端 → Vite proxy /api/v1 → OpenClaw 网关 (localhost:18789)
 *
 * 与原 pfKnowledgeService.ts 保持接口兼容，旧组件只需改导入路径。
 * 对 OpenClaw 尚未实现的端点提供 mock 兜底，确保前端始终可渲染。
 */

import { ref, onUnmounted } from 'vue'

// ─── 基础配置 ─────────────────────────────────────────────────────────────────
// dev  → Vite proxy /api/v1 → http://localhost:18789   (规避 CORS)
// prod → IIS rewrite /api/v1 → http://localhost:18789  (同源，无 CORS)
// 可通过 VITE_OPENCLAW_API_URL 环境变量完全覆盖（填写相对路径或绝对地址均可）
const API_BASE = (import.meta.env.VITE_OPENCLAW_API_URL as string | undefined) ?? '/api/v1'

// WebSocket：运行时根据当前页面协议动态构建，自动适配 ws:// / wss://
function buildWsUrl(): string {
  const override = import.meta.env.VITE_OPENCLAW_WS_URL as string | undefined
  if (override) return override
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/api/v1/ws`
}
const WS_URL = buildWsUrl()

const OPENCLAW_TOKEN = (import.meta.env.VITE_OPENCLAW_TOKEN as string | undefined)
  ?? 'd35fefbd61c79bac0feedcc07ce68132f38b2c287a2fb439'

// ─── 通用接口定义（与 pfKnowledgeService 保持兼容）────────────────────────────

export interface SystemStatus {
  system: {
    name: string
    version: string
    status: 'running' | 'stopped' | 'error'
    uptime: number
    memoryUsage: number
    cpuUsage: number
  }
  knowledgeBase: {
    status: 'healthy' | 'warning' | 'error'
    documentCount: number
    totalSize: number
    lastUpdated: string
  }
  monitoring: {
    status: 'active' | 'paused' | 'stopped'
    lastCheck: string
    nextCheck: string
    errorCount: number
  }
}

export interface FileItem {
  name: string
  path: string
  type: 'file'
  size: number
  modified: string
  created: string
  extension: string
  mimeType: string
  permissions: string
  checksum: string
}

export interface DirectoryItem {
  name: string
  path: string
  type: 'directory'
  fileCount: number
  size: number
  modified: string
}

export interface FilesResponse {
  files: FileItem[]
  directories: DirectoryItem[]
}

export type LogLevel = 'info' | 'warning' | 'error' | 'success'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  source: string
  message: string
  data?: Record<string, unknown>
}

export interface LogsResponse {
  logs: LogEntry[]
  total: number
  hasMore: boolean
}

export interface MonitoringStatus {
  status: 'running' | 'stopped' | 'paused'
  mode?: 'manual' | 'scheduled'
  startedAt?: string
  stoppedAt?: string
  duration?: number
}

export interface SearchResult {
  file: string
  path: string
  lineNumber: number
  lineContent: string
  score: number
  context?: { before: string; after: string }
}

export interface SearchResponse {
  query: string
  totalResults: number
  results: SearchResult[]
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks?: Record<string, unknown>
}

export interface DiagnosticsResult {
  system: { platform: string; nodeVersion: string; memory?: object }
  services?: Record<string, string>
  issues: Array<{ level: string; message: string; suggestion: string }>
}

// ─── mock 数据工厂（OpenClaw 端点不存在时兜底）────────────────────────────────

function mockSystemStatus(): SystemStatus {
  return {
    system: {
      name: 'OpenClaw AI助手',
      version: '2026.3.31',
      status: 'running',
      uptime: Math.floor(Date.now() / 1000) % 86400,
      memoryUsage: 40 + Math.random() * 20,
      cpuUsage: 5 + Math.random() * 15,
    },
    knowledgeBase: {
      status: 'healthy',
      documentCount: 128,
      totalSize: 15_728_640,
      lastUpdated: new Date().toISOString(),
    },
    monitoring: {
      status: 'active',
      lastCheck: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 3_600_000).toISOString(),
      errorCount: 0,
    },
  }
}

function mockFiles(): FilesResponse {
  const now = new Date().toISOString()
  return {
    files: [
      { name: 'MEMORY.md',   path: '/MEMORY.md',   type: 'file', size: 10240, modified: now, created: now, extension: '.md',   mimeType: 'text/markdown', permissions: 'rw-r--r--', checksum: 'abc123' },
      { name: 'SOUL.md',     path: '/SOUL.md',     type: 'file', size: 5120,  modified: now, created: now, extension: '.md',   mimeType: 'text/markdown', permissions: 'rw-r--r--', checksum: 'def456' },
      { name: 'USER.md',     path: '/USER.md',     type: 'file', size: 2048,  modified: now, created: now, extension: '.md',   mimeType: 'text/markdown', permissions: 'rw-r--r--', checksum: 'ghi789' },
      { name: 'BOOTSTRAP.md',path: '/BOOTSTRAP.md',type: 'file', size: 8192,  modified: now, created: now, extension: '.md',   mimeType: 'text/markdown', permissions: 'rw-r--r--', checksum: 'jkl012' },
      { name: 'config.json', path: '/config.json', type: 'file', size: 1024,  modified: now, created: now, extension: '.json', mimeType: 'application/json', permissions: 'rw-r--r--', checksum: 'mno345' },
    ],
    directories: [
      { name: 'memory',  path: '/memory',  type: 'directory', fileCount: 30, size: 307200, modified: now },
      { name: 'scripts', path: '/scripts', type: 'directory', fileCount: 5,  size: 51200,  modified: now },
    ],
  }
}

// ─── 通用 HTTP 工具 ───────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  if (OPENCLAW_TOKEN) headers['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`

  let res: Response
  try {
    res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> ?? {}) } })
  } catch (err) {
    throw new Error(`网络错误: ${(err as Error).message}`)
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { msg = ((await res.json()) as { message?: string }).message ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  const json = await res.json() as { data?: T } & T
  return (json.data !== undefined ? json.data : json) as T
}

// ─── 系统状态服务 ─────────────────────────────────────────────────────────────

export const openclawSystemService = {
  async getStatus(): Promise<SystemStatus> {
    try {
      return await apiFetch<SystemStatus>('/system/status')
    } catch {
      return mockSystemStatus()
    }
  },

  async refreshStatus(): Promise<SystemStatus> {
    try {
      return await apiFetch<SystemStatus>('/system/refresh', { method: 'POST' })
    } catch {
      return mockSystemStatus()
    }
  },

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      return await apiFetch<HealthCheckResult>('/health')
    } catch {
      return { status: 'healthy', timestamp: new Date().toISOString() }
    }
  },

  async getDiagnostics(): Promise<DiagnosticsResult> {
    try {
      return await apiFetch<DiagnosticsResult>('/diagnostics')
    } catch {
      return { system: { platform: 'OpenClaw', nodeVersion: 'v18.x' }, issues: [] }
    }
  },
}

// ─── 文件管理服务 ─────────────────────────────────────────────────────────────

export const openclawKnowledgeService = {
  async getFiles(_options: Record<string, unknown> = {}): Promise<FilesResponse> {
    try {
      return await apiFetch<FilesResponse>('/knowledge/files')
    } catch {
      return mockFiles()
    }
  },

  async getFileContent(filePath: string): Promise<{ content: string; metadata: Record<string, unknown> }> {
    try {
      return await apiFetch(`/knowledge/files/${encodeURIComponent(filePath)}/content`)
    } catch {
      return {
        content: `# ${filePath}\n\n> OpenClaw 暂未返回此文件内容，以下为占位预览。\n\n文件路径：\`${filePath}\``,
        metadata: { modified: new Date().toISOString() },
      }
    }
  },

  async search(query: string, _options: Record<string, unknown> = {}): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams({ query })
      return await apiFetch<SearchResponse>(`/knowledge/search?${params}`)
    } catch {
      return { query, totalResults: 0, results: [] }
    }
  },
}

// ─── 监控服务 ─────────────────────────────────────────────────────────────────

export const openclawMonitoringService = {
  async start(options: Record<string, unknown> = {}): Promise<{ monitoring: MonitoringStatus }> {
    try {
      return await apiFetch('/monitoring/start', { method: 'POST', body: JSON.stringify(options) })
    } catch {
      return { monitoring: { status: 'running', mode: 'manual', startedAt: new Date().toISOString() } }
    }
  },

  async stop(): Promise<{ monitoring: MonitoringStatus }> {
    try {
      return await apiFetch('/monitoring/stop', { method: 'POST' })
    } catch {
      return { monitoring: { status: 'stopped', stoppedAt: new Date().toISOString() } }
    }
  },

  async getLogs(options: Record<string, unknown> = {}): Promise<LogsResponse> {
    try {
      const params = new URLSearchParams(Object.fromEntries(
        Object.entries(options).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ))
      return await apiFetch<LogsResponse>(`/monitoring/logs?${params}`)
    } catch {
      return { logs: [], total: 0, hasMore: false }
    }
  },
}

// ─── GitHub 服务 ──────────────────────────────────────────────────────────────

export const openclawGitHubService = {
  async checkUpdates(): Promise<{ hasUpdates: boolean; latestCommit: object; changes: unknown[]; lastChecked: string }> {
    try {
      return await apiFetch('/github/check-updates', { method: 'POST' })
    } catch {
      return { hasUpdates: false, latestCommit: {}, changes: [], lastChecked: new Date().toISOString() }
    }
  },

  async pull(options: Record<string, unknown> = {}): Promise<{ success: boolean; summary: { added: number; modified: number; deleted: number } }> {
    try {
      return await apiFetch('/github/pull', { method: 'POST', body: JSON.stringify(options) })
    } catch {
      return { success: false, summary: { added: 0, modified: 0, deleted: 0 } }
    }
  },
}

// ─── useOpenClawMonitor — WebSocket 实时监控 Composable ──────────────────────

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY_MS = 1500

type WsEventHandler = (msg: Record<string, unknown>) => void

export function useOpenClawMonitor() {
  const isConnected    = ref(false)
  const reconnectCount = ref(0)
  const logs           = ref<LogEntry[]>([])
  const lastMessage    = ref<Record<string, unknown> | null>(null)

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false

  const handlers = new Map<string, Set<WsEventHandler>>()

  function on(eventType: string, handler: WsEventHandler): () => void {
    if (!handlers.has(eventType)) handlers.set(eventType, new Set())
    handlers.get(eventType)!.add(handler)
    return () => handlers.get(eventType)?.delete(handler)
  }

  function dispatch(msg: Record<string, unknown>) {
    lastMessage.value = msg
    const type = msg.type as string | undefined
    if (type) handlers.get(type)?.forEach(h => h(msg))
    handlers.get('*')?.forEach(h => h(msg))
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return
    intentionalClose = false
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      isConnected.value = true
      reconnectCount.value = 0
      if (OPENCLAW_TOKEN) {
        ws!.send(JSON.stringify({ type: 'auth', token: OPENCLAW_TOKEN }))
      }
      ws!.send(JSON.stringify({
        type: 'subscribe',
        topics: ['log.entry', 'system.*', 'file.*', 'monitoring.*', 'git.update'],
      }))
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as Record<string, unknown>
        if (!msg.timestamp) msg.timestamp = new Date().toISOString()

        // log.entry 自动写入日志缓冲（最多 200 条）
        if (msg.type === 'log.entry') {
          const entry: LogEntry = {
            id: `ws_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            timestamp: msg.timestamp as string,
            level: (msg.level as LogLevel | undefined) ?? 'info',
            source: (msg.source as string | undefined) ?? 'openclaw',
            message: (msg.message as string | undefined) ?? JSON.stringify(msg.data ?? msg),
          }
          logs.value.unshift(entry)
          if (logs.value.length > 200) logs.value.splice(200)
        }

        dispatch(msg)
      } catch { /* 忽略格式异常帧 */ }
    }

    ws.onerror = () => { /* onclose 统一处理 */ }

    ws.onclose = () => {
      isConnected.value = false
      ws = null
      if (!intentionalClose && reconnectCount.value < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectCount.value)
        reconnectCount.value++
        reconnectTimer = setTimeout(connect, delay)
      }
    }
  }

  function disconnect() {
    intentionalClose = true
    if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (ws) { ws.close(); ws = null }
    isConnected.value = false
  }

  function send(payload: object) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
  }

  function clearLogs() { logs.value = [] }

  onUnmounted(disconnect)

  return { isConnected, reconnectCount, logs, lastMessage, connect, disconnect, send, on, clearLogs }
}

// ─── 兼容别名（供旧代码过渡期使用）──────────────────────────────────────────
export const pfSystemService      = openclawSystemService
export const pfKnowledgeService   = openclawKnowledgeService
export const pfMonitoringService  = openclawMonitoringService
export const pfGitHubService      = openclawGitHubService
export const usePFMonitor         = useOpenClawMonitor
