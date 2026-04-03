// AI BFF 服务层
// 基础路径 /api/ai → dev proxy → http://localhost:5000
// 前端无需携带任何 Token，鉴权由 BFF 统一处理

const BASE = '/api/ai'

// ── 类型定义 ─────────────────────────────────────────────────────────────────

export interface AIModel {
  id: string
  name: string
  provider: string
  online: boolean
  latency: number    // ms，-1 表示不可达
  color: string      // 展示用的主题色
}

export interface NodeInfo {
  id: string
  name: string
  status: 'online' | 'offline' | 'degraded'
  region?: string
}

export interface SystemStatus {
  nodeCount: number
  sessionCount: number
  nodes: NodeInfo[]
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ApprovalRequest {
  requestId: string
  description: string
  risk: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  metadata?: Record<string, unknown>
}

// ── API 方法 ──────────────────────────────────────────────────────────────────

/** 获取可用模型列表 */
export async function getModels(): Promise<AIModel[]> {
  const res = await fetch(`${BASE}/models`)
  if (!res.ok) throw new Error(`getModels 失败 (${res.status})`)
  return res.json()
}

/** 获取 OpenClaw 节点在线状态 */
export async function getSystemStatus(): Promise<SystemStatus> {
  const res = await fetch(`${BASE}/status`)
  if (!res.ok) throw new Error(`getSystemStatus 失败 (${res.status})`)
  return res.json()
}

/**
 * SSE 流式对话
 * @returns abort 函数，调用后中断流
 */
export function chatStream(
  messages: ChatMessage[],
  model: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const ctrl = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`${BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`BFF ${res.status}: ${text || res.statusText}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) { onDone(); break }

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''   // 保留未完成的尾行

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') { onDone(); break outer }
          try {
            const obj = JSON.parse(payload)
            // 兼容 OpenAI delta 格式 和直接 text/content 字段
            const text: string =
              obj.choices?.[0]?.delta?.content ??
              obj.content ??
              obj.text ??
              ''
            if (text) onChunk(text)
          } catch { /* 忽略非 JSON 行（注释、心跳等） */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') onError(e as Error)
    }
  })()

  return () => ctrl.abort()
}

/** 处理高危审批拦截（允许 / 拒绝） */
export async function resolveApproval(
  requestId: string,
  decision: 'allow' | 'deny',
): Promise<void> {
  const res = await fetch(`${BASE}/approvals/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision }),
  })
  if (!res.ok) throw new Error(`resolveApproval 失败 (${res.status})`)
}

/** 查询待处理审批（用于轮询） */
export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  const res = await fetch(`${BASE}/approvals/pending`)
  if (!res.ok) throw new Error(`getPendingApprovals 失败 (${res.status})`)
  return res.json()
}
