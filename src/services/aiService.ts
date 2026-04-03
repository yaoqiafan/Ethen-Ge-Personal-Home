// AI BFF 服务层
// 基础路径 /api/ai → IIS proxy → http://127.0.0.1:18789/v1
// OpenClaw Gateway HTTP API (Bearer Token)

const BASE = '/api/ai'
const AUTH_TOKEN = 'Bearer d6b3b76d798363c11793033e60a71ccc819242716b002149'

// 通用请求头
const headers = {
  'Authorization': AUTH_TOKEN,
  'Content-Type': 'application/json',
}

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
  const res = await fetch(`${BASE}/models`, { headers })
  if (!res.ok) throw new Error(`getModels 失败 (${res.status})`)
  const data = await res.json()
  // OpenClaw 返回格式: { object: "list", data: [{id: "openclaw/default", ...}] }
  return data.data?.map((m: any) => ({
    id: m.id,
    name: m.id.replace('openclaw/', ''),
    provider: 'OpenClaw',
    online: true,
    latency: 0,
    color: '#4F46E5',
  })) ?? []
}

/** 获取 OpenClaw 节点在线状态 */
export async function getSystemStatus(): Promise<SystemStatus> {
  // OpenClaw HTTP API 没有 /status 端点，返回模拟数据
  // 如需真实数据，需通过 WebSocket API 获取
  return {
    nodeCount: 1,
    sessionCount: 1,
    nodes: [{ id: 'main', name: 'Main Agent', status: 'online', region: 'local' }],
  }
}

/**
 * 对话（非流式，OpenClaw HTTP API 临时方案）
 * @returns abort 函数（暂不支持中断）
 */
export function chatStream(
  messages: ChatMessage[],
  model: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  // OpenClaw HTTP API 使用 /v1/chat/completions
  fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'openclaw/default',
      messages,
      stream: false,  // 暂时不支持流式
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`BFF ${res.status}: ${text || res.statusText}`)
      }
      const data = await res.json()
      // OpenAI 格式: { choices: [{ message: { content: "..." } }] }
      const text = data.choices?.[0]?.message?.content ?? ''
      if (text) onChunk(text)
      onDone()
    })
    .catch((e) => {
      if ((e as Error).name !== 'AbortError') onError(e as Error)
    })

  return () => {}  // 暂不支持中断
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
