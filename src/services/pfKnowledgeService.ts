/**
 * pfKnowledgeService.ts
 * PF.AutoFramework 知识库系统 — 服务层
 *
 * 包含：
 *   - 完整 TypeScript 接口定义
 *   - 基于 fetch 的 HTTP 服务封装（pfSystemService / pfKnowledgeService /
 *     pfMonitoringService / pfGitHubService / pfConfigService）
 *   - WebSocket 实时监控 Composable（usePFMonitor），含断线指数退避重连
 */

import { ref, onUnmounted } from 'vue'

// ─── 环境配置 ─────────────────────────────────────────────────────────────────
//
// HTTP：
//   dev  → Vite proxy /api/v1  →  OpenClaw 适配器 http://localhost:3001/api/v1
//   prod → IIS rewrite /api/v1 →  OpenClaw 适配器（同源，无 CORS）
//
// WebSocket：
//   dev  → Vite proxy /api/v1/ws  →  ws://localhost:3002
//   prod → IIS rewrite /api/v1/ws →  ws://localhost:3002（同源，无 CORS）
//
// 可在 .env 文件中通过 VITE_PF_API_URL / VITE_PF_WS_URL 完全覆盖默认值。

/** HTTP REST 基础地址（相对路径，走 Vite proxy / IIS rewrite） */
const BASE_URL = (import.meta.env.VITE_PF_API_URL as string | undefined) ?? '/api/v1'

/**
 * WebSocket 地址。
 * WS URL 必须是绝对地址，运行时根据当前页面协议动态构建，
 * 确保 HTTPS 页面自动使用 wss://，HTTP 页面使用 ws://。
 */
function buildWsUrl(): string {
  const override = import.meta.env.VITE_PF_WS_URL as string | undefined
  if (override) return override
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProto}//${window.location.host}/api/v1/ws`
}

const WS_URL = buildWsUrl()

// ─── 通用响应结构 ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  code: number
  message: string
  data?: T
  timestamp: string
  requestId: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: Pagination
}

// ─── 系统状态接口 ─────────────────────────────────────────────────────────────

export interface SystemInfo {
  name: string
  version: string
  status: 'running' | 'stopped' | 'error'
  uptime: number        // 秒
  memoryUsage: number   // 百分比
  cpuUsage: number      // 百分比
}

export interface KnowledgeBaseInfo {
  status: 'healthy' | 'warning' | 'error'
  documentCount: number
  totalSize: number     // 字节
  lastUpdated: string   // ISO 8601
}

export interface MonitoringInfo {
  status: 'active' | 'paused' | 'stopped'
  lastCheck: string
  nextCheck: string
  errorCount: number
}

export interface SystemStatus {
  system: SystemInfo
  knowledgeBase: KnowledgeBaseInfo
  monitoring: MonitoringInfo
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database?: { status: string; latency: number }
    filesystem?: { status: string; freeSpace: number }
    network?: { status: string; github: boolean; local: boolean }
  }
}

export interface DiagnosticsResult {
  system: {
    platform: string
    arch: string
    nodeVersion: string
    memory: { total: number; free: number; used: number }
  }
  services: Record<string, string>
  issues: Array<{ level: string; message: string; suggestion: string }>
}

// ─── 知识库文件接口 ───────────────────────────────────────────────────────────

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

export interface FileContentMeta {
  title: string
  author: string
  created: string
  modified: string
  wordCount: number
  readingTime: string
}

export interface FileContent {
  file: {
    name: string
    path: string
    size: number
    lines: number
    encoding: string
  }
  content: string
  metadata: FileContentMeta
}

export interface SearchResult {
  file: string
  path: string
  lineNumber: number
  lineContent: string
  score: number
  context: { before: string; after: string }
}

export interface SearchResponse {
  query: string
  totalResults: number
  results: SearchResult[]
}

// ─── 监控日志接口 ─────────────────────────────────────────────────────────────

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
  pid?: number
  checks?: string[]
  duration?: number
}

// ─── GitHub 接口 ──────────────────────────────────────────────────────────────

export interface GitCommit {
  sha: string
  message: string
  author: string
  date: string
}

export interface GitHubStatus {
  repository: {
    name: string
    owner: string
    url: string
    description: string
    stars: number
    forks: number
    watchers: number
  }
  branch: {
    name: string
    commit: GitCommit
    behind: number
    ahead: number
  }
  lastChecked: string
  isUpToDate: boolean
}

export interface GitHubUpdateCheck {
  hasUpdates: boolean
  latestCommit: GitCommit
  changes: unknown[]
  lastChecked: string
}

export interface GitHubPullResult {
  success: boolean
  operation: string
  changes: Array<{ file: string; action: string; diff?: string }>
  summary: { added: number; modified: number; deleted: number }
}

// ─── WebSocket 消息接口 ───────────────────────────────────────────────────────

export interface WsMessage<T = Record<string, unknown>> {
  type: string
  id?: string
  timestamp: string
  data: T
  metadata?: Record<string, unknown>
}

// ─── HTTP 通用请求函数 ────────────────────────────────────────────────────────

function buildHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

/**
 * 通用 fetch 封装。
 * 后端响应格式为 { success, code, message, data }，自动拆箱 data 字段返回。
 * 若后端直接返回业务对象（无包装层），则原样返回。
 */
async function httpRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...buildHeaders(token), ...(options.headers as Record<string, string> ?? {}) },
    })
  } catch (err) {
    throw new Error(`网络错误: ${(err as Error).message}`)
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const errBody = await res.json() as ApiResponse
      msg = errBody.message ?? msg
    } catch { /* json 解析失败时沿用 HTTP 状态码信息 */ }
    throw new Error(msg)
  }

  const json = await res.json() as ApiResponse<T>
  // 拆箱：若存在 data 字段则返回 data，否则将整体视为业务数据
  return (json.data !== undefined ? json.data : json) as T
}

// ─── 系统状态服务 ─────────────────────────────────────────────────────────────

export const pfSystemService = {
  /** 获取系统整体状态 */
  getStatus: () =>
    httpRequest<SystemStatus>('/system/status'),

  /** 强制刷新系统状态 */
  refreshStatus: () =>
    httpRequest<SystemStatus>('/system/refresh', { method: 'POST' }),

  /** 轻量健康检查（适合轮询） */
  healthCheck: () =>
    httpRequest<HealthCheckResult>('/health'),

  /** 详细系统诊断 */
  getDiagnostics: () =>
    httpRequest<DiagnosticsResult>('/diagnostics'),
}

// ─── 知识库文件服务 ───────────────────────────────────────────────────────────

export interface FileListOptions {
  path?: string
  type?: 'all' | 'md' | 'json' | 'script'
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'size' | 'modified'
  order?: 'asc' | 'desc'
}

export interface FileContentOptions {
  encoding?: 'utf8' | 'base64'
  lineStart?: number
  lineEnd?: number
  highlight?: boolean
}

export interface SearchOptions {
  scope?: 'all' | 'filename' | 'content'
  caseSensitive?: boolean
  regex?: boolean
  limit?: number
}

export const pfKnowledgeService = {
  /** 获取知识库文件/目录列表 */
  getFiles: (options: FileListOptions = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(options).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    )
    return httpRequest<FilesResponse>(`/knowledge/files?${params}`)
  },

  /** 获取单个文件内容 */
  getFileContent: (filePath: string, options: FileContentOptions = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(options).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    )
    return httpRequest<FileContent>(
      `/knowledge/files/${encodeURIComponent(filePath)}/content?${params}`
    )
  },

  /** 全文搜索 */
  search: (query: string, options: SearchOptions = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries([
        ['query', query],
        ...Object.entries(options).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
      ])
    )
    return httpRequest<SearchResponse>(`/knowledge/search?${params}`)
  },
}

// ─── 监控服务 ─────────────────────────────────────────────────────────────────

export interface StartMonitoringOptions {
  mode?: 'manual' | 'scheduled'
  interval?: number   // 秒，仅 scheduled 模式
  notify?: boolean
  checks?: ('file' | 'git' | 'system')[]
}

export interface LogsOptions {
  level?: 'all' | 'info' | 'warning' | 'error'
  startTime?: string  // ISO 8601
  endTime?: string
  limit?: number
  offset?: number
}

export const pfMonitoringService = {
  /** 启动监控守护进程 */
  start: (options: StartMonitoringOptions = {}) =>
    httpRequest<{ monitoring: MonitoringStatus }>('/monitoring/start', {
      method: 'POST',
      body: JSON.stringify(options),
    }),

  /** 停止监控守护进程 */
  stop: () =>
    httpRequest<{ monitoring: MonitoringStatus }>('/monitoring/stop', { method: 'POST' }),

  /** 查询历史监控日志 */
  getLogs: (options: LogsOptions = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(options).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    )
    return httpRequest<LogsResponse>(`/monitoring/logs?${params}`)
  },
}

// ─── GitHub 服务 ──────────────────────────────────────────────────────────────

export interface GitHubPullOptions {
  force?: boolean
  clean?: boolean
}

export const pfGitHubService = {
  /** 查询仓库/分支实时状态 */
  getStatus: (repo = 'yaoqiafan/PF.AutoFramework', branch = 'main') => {
    const params = new URLSearchParams({ repo, branch })
    return httpRequest<GitHubStatus>(`/github/status?${params}`)
  },

  /** 检查是否有新提交 */
  checkUpdates: () =>
    httpRequest<GitHubUpdateCheck>('/github/check-updates', { method: 'POST' }),

  /** 执行 git pull */
  pull: (options: GitHubPullOptions = {}) =>
    httpRequest<GitHubPullResult>('/github/pull', {
      method: 'POST',
      body: JSON.stringify(options),
    }),
}

// ─── 配置服务 ─────────────────────────────────────────────────────────────────

export const pfConfigService = {
  /** 获取配置（key 为空时返回全量） */
  get: (key?: string) => {
    const qs = key ? `?key=${encodeURIComponent(key)}` : ''
    return httpRequest<Record<string, unknown>>(`/config${qs}`)
  },

  /** 局部更新配置 */
  update: (config: Record<string, unknown>) =>
    httpRequest<Record<string, unknown>>('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  /** 重置配置（section 为空时重置全部） */
  reset: (section?: string) => {
    const qs = section ? `?section=${encodeURIComponent(section)}` : ''
    return httpRequest<Record<string, unknown>>(`/config${qs}`, { method: 'DELETE' })
  },
}

// ─── usePFMonitor — WebSocket 实时监控 Composable ────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY_MS = 1500  // 首次重连等待 1.5s，之后指数退避

type WsEventHandler = (msg: WsMessage) => void

/**
 * usePFMonitor
 *
 * 使用方式：
 * ```ts
 * const { isConnected, logs, connect, disconnect, on } = usePFMonitor()
 * connect()
 *
 * // 监听特定事件
 * on('file.change', (msg) => console.log('文件变更:', msg.data))
 * // 监听所有事件
 * on('*', (msg) => console.log('收到:', msg))
 * ```
 *
 * 组件销毁时会自动调用 disconnect（通过 onUnmounted 钩子）。
 */
export function usePFMonitor(wsUrl = WS_URL, token?: string) {
  // ── 响应式状态 ──
  const isConnected    = ref(false)
  const reconnectCount = ref(0)
  const logs           = ref<LogEntry[]>([])
  const lastMessage    = ref<WsMessage | null>(null)

  // ── 内部变量 ──
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false

  /** 事件监听器注册表，'*' 代表通配符（监听所有事件） */
  const handlers = new Map<string, Set<WsEventHandler>>()

  // ── 事件分发 ──

  /**
   * 注册 WebSocket 消息事件监听器
   * @param eventType  事件类型字符串，或 '*' 监听所有事件
   * @returns 取消注册的函数
   */
  function on(eventType: string, handler: WsEventHandler): () => void {
    if (!handlers.has(eventType)) handlers.set(eventType, new Set())
    handlers.get(eventType)!.add(handler)
    return () => handlers.get(eventType)?.delete(handler)
  }

  function dispatch(msg: WsMessage) {
    lastMessage.value = msg
    handlers.get(msg.type)?.forEach(h => h(msg))
    handlers.get('*')?.forEach(h => h(msg))
  }

  // ── 连接管理 ──

  function connect() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return
    intentionalClose = false

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      isConnected.value = true
      reconnectCount.value = 0

      // 可选：发送认证令牌
      if (token) {
        ws!.send(JSON.stringify({ type: 'auth', token }))
      }

      // 订阅所有监控主题
      ws!.send(JSON.stringify({
        type: 'subscribe',
        topics: [
          'file.change',
          'monitoring.start',
          'monitoring.stop',
          'log.entry',
          'system.alert',
          'status.update',
          'git.update',
        ],
      }))
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage
        if (!msg.timestamp) msg.timestamp = new Date().toISOString()

        // 自动将 log.entry 类型的消息追加到日志缓冲区（最多保留 200 条）
        if (msg.type === 'log.entry') {
          const entry = msg.data as unknown as LogEntry
          logs.value.unshift(entry)
          if (logs.value.length > 200) logs.value.splice(200)
        }

        dispatch(msg)
      } catch {
        // 忽略格式异常的消息帧
      }
    }

    ws.onerror = () => {
      // onerror 之后必然触发 onclose，在 onclose 中统一处理重连
    }

    ws.onclose = () => {
      isConnected.value = false
      ws = null

      if (!intentionalClose && reconnectCount.value < MAX_RECONNECT_ATTEMPTS) {
        // 指数退避：1.5s → 3s → 6s → 12s → 24s
        const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectCount.value)
        reconnectCount.value++
        reconnectTimer = setTimeout(connect, delay)
      }
    }
  }

  /** 主动断开连接，清除重连计时器，停止自动重连 */
  function disconnect() {
    intentionalClose = true
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
  }

  /** 向服务端发送消息（仅在已连接时有效） */
  function send(payload: object) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    }
  }

  /** 清空本地日志缓冲区 */
  function clearLogs() {
    logs.value = []
  }

  // 组件销毁时自动断开，防止内存泄漏
  onUnmounted(disconnect)

  return {
    // 响应式状态
    isConnected,
    reconnectCount,
    logs,
    lastMessage,
    // 方法
    connect,
    disconnect,
    send,
    on,
    clearLogs,
  }
}
