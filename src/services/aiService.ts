// AI 服务层 — 本地 API Key 配置，OpenAI 兼容协议

// ── 类型定义 ────────────────────────────────────────────────────────────────

export interface AIConfig {
  apiKey: string
  baseUrl: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ModelOption {
  id: string
  name: string
}

export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  model: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

// ── 默认模型列表（API Key 未配置或请求失败时使用）──────────────────────────

export const DEFAULT_MODELS: ModelOption[] = [
  { id: 'gpt-4o',                name: 'GPT-4o'            },
  { id: 'gpt-4o-mini',           name: 'GPT-4o Mini'       },
  { id: 'gpt-4-turbo',           name: 'GPT-4 Turbo'       },
  { id: 'gpt-3.5-turbo',         name: 'GPT-3.5 Turbo'     },
  { id: 'claude-opus-4-6',       name: 'Claude Opus 4.6'   },
  { id: 'claude-sonnet-4-6',     name: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  { id: 'deepseek-chat',         name: 'DeepSeek Chat'     },
  { id: 'deepseek-reasoner',     name: 'DeepSeek R1'       },
]

// ── 配置管理 ─────────────────────────────────────────────────────────────────

const CONFIG_KEY_API_KEY  = 'ai_api_key'
const CONFIG_KEY_BASE_URL = 'ai_base_url'
const CONVERSATIONS_KEY   = 'ai_conversations'
const ACTIVE_CONV_KEY     = 'ai_active_conversation'

export function getConfig(): AIConfig {
  return {
    apiKey:  localStorage.getItem(CONFIG_KEY_API_KEY)  ?? '',
    baseUrl: localStorage.getItem(CONFIG_KEY_BASE_URL) ?? 'https://api.openai.com/v1',
  }
}

export function saveConfig(config: AIConfig): void {
  localStorage.setItem(CONFIG_KEY_API_KEY,  config.apiKey.trim())
  localStorage.setItem(CONFIG_KEY_BASE_URL, config.baseUrl.trim() || 'https://api.openai.com/v1')
}

// ── 模型列表 ──────────────────────────────────────────────────────────────────

export async function fetchModels(config: AIConfig): Promise<ModelOption[]> {
  if (!config.apiKey) return DEFAULT_MODELS
  try {
    const res = await fetch(`${config.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
    })
    if (!res.ok) return DEFAULT_MODELS
    const data = await res.json()
    const list: ModelOption[] = (data.data ?? [])
      .map((m: any) => ({ id: m.id as string, name: (m.id as string) }))
      .sort((a: ModelOption, b: ModelOption) => a.id.localeCompare(b.id))
    return list.length ? list : DEFAULT_MODELS
  } catch {
    return DEFAULT_MODELS
  }
}

// ── 流式对话 ──────────────────────────────────────────────────────────────────

/**
 * 发起流式对话请求（SSE）
 * @returns abort 函数
 */
export function chatStream(
  config: AIConfig,
  messages: ChatMessage[],
  model: string,
  onChunk: (text: string) => void,
  onDone:  () => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type':  'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({ model, messages, stream: true }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API ${res.status}: ${text || res.statusText}`)
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const payload = trimmed.slice(6)
          if (payload === '[DONE]') { onDone(); return }
          try {
            const parsed = JSON.parse(payload)
            const delta  = parsed.choices?.[0]?.delta?.content
            if (delta) onChunk(delta)
          } catch { /* 忽略非 JSON 行 */ }
        }
      }
      onDone()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') onError(e as Error)
    }
  })()

  return () => controller.abort()
}

// ── 对话持久化 ────────────────────────────────────────────────────────────────

export function loadConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
}

export function getActiveConversationId(): string {
  return localStorage.getItem(ACTIVE_CONV_KEY) ?? ''
}

export function setActiveConversationId(id: string): void {
  localStorage.setItem(ACTIVE_CONV_KEY, id)
}

export function createConversation(model: string): Conversation {
  const now = new Date().toISOString()
  return {
    id:        `conv-${Date.now()}`,
    title:     '新对话',
    model,
    messages:  [],
    createdAt: now,
    updatedAt: now,
  }
}
