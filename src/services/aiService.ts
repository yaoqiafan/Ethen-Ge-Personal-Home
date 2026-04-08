// AI 服务层 — 本地多服务商配置，OpenAI 兼容协议，支持多模态（图片/文件）

// ── 服务商预设 ────────────────────────────────────────────────────────────────

export interface ModelOption {
  id: string
  name: string
  vision: boolean  // 是否支持图片输入
}

export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  models: ModelOption[]
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat',     name: 'DeepSeek V3',   vision: false },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1',   vision: false },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus',    name: 'GLM-4 Plus',          vision: false },
      { id: 'glm-4',         name: 'GLM-4',               vision: false },
      { id: 'glm-4-air',     name: 'GLM-4 Air',           vision: false },
      { id: 'glm-4-flash',   name: 'GLM-4 Flash',         vision: false },
      { id: 'glm-4v',        name: 'GLM-4V（视觉）',       vision: true  },
      { id: 'glm-4v-flash',  name: 'GLM-4V Flash（视觉）', vision: true  },
      { id: 'glm-z1-flash',  name: 'GLM-Z1 Flash',        vision: false },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o',       name: 'GPT-4o',       vision: true  },
      { id: 'gpt-4o-mini',  name: 'GPT-4o Mini',  vision: true  },
      { id: 'gpt-4-turbo',  name: 'GPT-4 Turbo',  vision: true  },
      { id: 'o1',           name: 'o1',            vision: false },
      { id: 'o1-mini',      name: 'o1 Mini',       vision: false },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    models: [],
  },
]

// ── 类型定义 ──────────────────────────────────────────────────────────────────

/** 附件元数据（持久化至 localStorage） */
export interface AttachmentMeta {
  name: string
  mimeType: string
  size: number
  isImage: boolean
}

/** 持久化的消息（localStorage） */
export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string        // 纯文本；图片以 [图片: name] 占位，文件内容内联
  timestamp: string
  attachmentMeta?: AttachmentMeta[]
}

export interface Conversation {
  id: string
  title: string
  model: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

/** 发送给 API 的多模态内容格式（OpenAI 兼容） */
export type ApiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

export type ApiMessageContent = string | ApiContentPart[]

export interface ApiMessage {
  role: 'user' | 'assistant' | 'system'
  content: ApiMessageContent
}

// ── 配置管理（每服务商独立存储 key/url）────────────────────────────────────────

const K_PROVIDER  = 'ai_current_provider'
const K_KEY       = (id: string) => `ai_key_${id}`
const K_URL       = (id: string) => `ai_url_${id}`
const K_CONVS     = 'ai_conversations'
const K_ACTIVE    = 'ai_active_conversation'

export function getCurrentProviderId(): string {
  return localStorage.getItem(K_PROVIDER) ?? 'deepseek'
}

export function setCurrentProviderId(id: string): void {
  localStorage.setItem(K_PROVIDER, id)
}

export function getProviderKey(providerId: string): string {
  return localStorage.getItem(K_KEY(providerId)) ?? ''
}

export function saveProviderKey(providerId: string, key: string): void {
  localStorage.setItem(K_KEY(providerId), key.trim())
}

export function getProviderUrl(providerId: string): string {
  const saved = localStorage.getItem(K_URL(providerId))
  if (saved) return saved
  return PROVIDER_PRESETS.find(p => p.id === providerId)?.baseUrl ?? ''
}

export function saveProviderUrl(providerId: string, url: string): void {
  localStorage.setItem(K_URL(providerId), url.trim())
}

/** 获取当前生效的 apiKey 和 baseUrl */
export function getActiveConfig(): { providerId: string; apiKey: string; baseUrl: string } {
  const providerId = getCurrentProviderId()
  return {
    providerId,
    apiKey:  getProviderKey(providerId),
    baseUrl: getProviderUrl(providerId),
  }
}

// ── 模型 ──────────────────────────────────────────────────────────────────────

export function getPresetModels(providerId: string): ModelOption[] {
  return PROVIDER_PRESETS.find(p => p.id === providerId)?.models ?? []
}

export function modelSupportsVision(providerId: string, modelId: string): boolean {
  return PROVIDER_PRESETS.find(p => p.id === providerId)
    ?.models.find(m => m.id === modelId)?.vision ?? false
}

/** 尝试从 API /models 拉取模型，失败时降级到 fallback */
export async function fetchModels(
  apiKey: string,
  baseUrl: string,
  fallback: ModelOption[],
): Promise<ModelOption[]> {
  if (!apiKey) return fallback
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const list: ModelOption[] = (data.data ?? [])
      .map((m: any) => ({ id: m.id as string, name: m.id as string, vision: false }))
      .sort((a: ModelOption, b: ModelOption) => a.id.localeCompare(b.id))
    return list.length ? list : fallback
  } catch {
    return fallback
  }
}

// ── 流式对话（SSE，支持多模态内容）──────────────────────────────────────────────

export function chatStream(
  apiKey: string,
  baseUrl: string,
  messages: ApiMessage[],
  model: string,
  onChunk: (text: string) => void,
  onDone:  () => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body:   JSON.stringify({ model, messages, stream: true }),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`API ${res.status}: ${txt || res.statusText}`)
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          const s = line.trim()
          if (!s.startsWith('data: ')) continue
          const json = s.slice(6)
          if (json === '[DONE]') { onDone(); return }
          try {
            const delta = JSON.parse(json).choices?.[0]?.delta?.content
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
  try { return JSON.parse(localStorage.getItem(K_CONVS) ?? '[]') }
  catch { return [] }
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(K_CONVS, JSON.stringify(conversations))
}

export function getActiveConversationId(): string {
  return localStorage.getItem(K_ACTIVE) ?? ''
}

export function setActiveConversationId(id: string): void {
  localStorage.setItem(K_ACTIVE, id)
}

export function createConversation(model: string): Conversation {
  const now = new Date().toISOString()
  return { id: `conv-${Date.now()}`, title: '新对话', model, messages: [], createdAt: now, updatedAt: now }
}
