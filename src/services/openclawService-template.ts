// OpenClaw服务模板
// 将此文件保存为 openclawService.ts 并替换原有PF服务

import { ref, onUnmounted } from 'vue'

// ==================== 配置 ====================
const OPENCLAW_API = import.meta.env.VITE_OPENCLAW_API_URL 
  || import.meta.env.VITE_PF_API_URL 
  || 'http://localhost:18789/api'

const OPENCLAW_WS = import.meta.env.VITE_OPENCLAW_WS_URL
  || import.meta.env.VITE_PF_WS_URL
  || 'ws://localhost:18789/ws'

const OPENCLAW_TOKEN = 'd35fefbd61c79bac0feedcc07ce68132f38b2c287a2fb439' // 从openclaw.json获取

// ==================== 接口定义 ====================
// 保持与原有PF接口兼容
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

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  source: string
  message: string
  data?: Record<string, unknown>
}

// ==================== 模拟数据 ====================
const mockSystemStatus = (): SystemStatus => ({
  system: {
    name: 'OpenClaw AI助手',
    version: '2026.3.31',
    status: 'running',
    uptime: 86400,
    memoryUsage: 45.2,
    cpuUsage: 12.8
  },
  knowledgeBase: {
    status: 'healthy',
    documentCount: 128,
    totalSize: 15728640,
    lastUpdated: new Date().toISOString()
  },
  monitoring: {
    status: 'active',
    lastCheck: new Date().toISOString(),
    nextCheck: new Date(Date.now() + 3600000).toISOString(),
    errorCount: 0
  }
})

const mockFiles = (): FilesResponse => ({
  files: [
    {
      name: 'MEMORY.md',
      path: '/MEMORY.md',
      type: 'file',
      size: 10240,
      modified: new Date().toISOString(),
      created: new Date().toISOString(),
      extension: '.md',
      mimeType: 'text/markdown',
      permissions: 'rw-r--r--',
      checksum: 'abc123'
    },
    {
      name: 'SOUL.md',
      path: '/SOUL.md',
      type: 'file',
      size: 5120,
      modified: new Date().toISOString(),
      created: new Date().toISOString(),
      extension: '.md',
      mimeType: 'text/markdown',
      permissions: 'rw-r--r--',
      checksum: 'def456'
    }
  ],
  directories: [
    {
      name: 'memory',
      path: '/memory',
      type: 'directory',
      fileCount: 30,
      size: 307200,
      modified: new Date().toISOString()
    }
  ]
})

// ==================== OpenClaw服务 ====================
export const openclawService = {
  // 系统状态
  async getSystemStatus(): Promise<SystemStatus> {
    // TODO: 替换为真实OpenClaw API调用
    return mockSystemStatus()
  },

  async refreshStatus(): Promise<SystemStatus> {
    return mockSystemStatus()
  },

  async healthCheck() {
    try {
      const response = await fetch(`${OPENCLAW_API.replace('/api', '')}/health`)
      return await response.json()
    } catch {
      return { status: 'healthy', timestamp: new Date().toISOString() }
    }
  },

  async getDiagnostics() {
    return {
      system: { platform: 'OpenClaw', nodeVersion: 'v18.x' },
      issues: []
    }
  },

  // 文件管理
  async getFiles(options?: any): Promise<FilesResponse> {
    // TODO: 替换为真实OpenClaw文件API
    return mockFiles()
  },

  async getFileContent(filePath: string) {
    return {
      content: `# ${filePath}\n\n文件内容预览。`,
      metadata: {
        size: 1024,
        modified: new Date().toISOString()
      }
    }
  },

  async search(query: string) {
    return {
      query,
      totalResults: 1,
      results: [
        {
          file: 'MEMORY.md',
          path: '/MEMORY.md',
          lineNumber: 1,
          lineContent: `搜索到: ${query}`,
          score: 0.9
        }
      ]
    }
  }
}

// ==================== WebSocket连接 ====================
export function useOpenClawMonitor() {
  const isConnected = ref(false)
  const reconnectCount = ref(0)
  const logs = ref<LogEntry[]>([])
  const lastMessage = ref<any>(null)
  
  let ws: WebSocket | null = null
  let reconnectTimer: any = null
  const MAX_RETRIES = 5

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return
    
    ws = new WebSocket(OPENCLAW_WS)
    
    ws.onopen = () => {
      isConnected.value = true
      reconnectCount.value = 0
      console.log('✅ 已连接到OpenClaw WebSocket')
      
      // 发送认证
      if (OPENCLAW_TOKEN) {
        ws!.send(JSON.stringify({ type: 'auth', token: OPENCLAW_TOKEN }))
      }
      
      // 订阅主题
      ws!.send(JSON.stringify({
        type: 'subscribe',
        topics: ['log.entry', 'system.*', 'file.*']
      }))
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        lastMessage.value = data
        
        // 自动记录日志
        if (data.type === 'log.entry') {
          logs.value.unshift({
            id: `ws_${Date.now()}`,
            timestamp: new Date().toISOString(),
            level: 'info',
            source: 'openclaw',
            message: data.message || JSON.stringify(data)
          })
          
          if (logs.value.length > 200) {
            logs.value.splice(200)
          }
        }
      } catch (error) {
        console.error('WebSocket消息解析错误:', error)
      }
    }
    
    ws.onerror = () => {
      // 错误处理在onclose中统一处理
    }
    
    ws.onclose = () => {
      isConnected.value = false
      
      // 自动重连
      if (reconnectCount.value < MAX_RETRIES) {
        const delay = 1500 * Math.pow(2, reconnectCount.value)
        reconnectCount.value++
        reconnectTimer = setTimeout(connect, delay)
      }
    }
  }
  
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
  }
  
  function send(payload: any) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    }
  }
  
  function clearLogs() {
    logs.value = []
  }
  
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    isConnected,
    reconnectCount,
    logs,
    lastMessage,
    connect,
    disconnect,
    send,
    clearLogs
  }
}

// ==================== 导出所有服务 ====================
export const pfSystemService = openclawService
export const pfKnowledgeService = openclawService
export const pfMonitoringService = openclawService
export const pfGitHubService = openclawService
export const pfConfigService = openclawService
export const usePFMonitor = useOpenClawMonitor