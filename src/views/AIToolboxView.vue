<template>
  <div class="ai-toolbox animate-fade-in">

    <!-- ── 左侧边栏 ──────────────────────────────────────────────────────────── -->
    <aside class="ai-sidebar">
      <div class="sb-top">
        <button class="btn-new-chat" @click="createNewConversation">
          <span>＋</span> 新建对话
        </button>
      </div>

      <div class="conv-list">
        <div v-if="conversations.length === 0" class="conv-empty">暂无对话记录</div>
        <div
          v-for="conv in sortedConversations"
          :key="conv.id"
          class="conv-item"
          :class="{ 'conv-item--active': conv.id === activeConvId }"
          @click="selectConversation(conv.id)"
        >
          <div class="conv-title">{{ conv.title }}</div>
          <div class="conv-meta">
            <span class="conv-model">{{ shortModelName(conv.model) }}</span>
            <span class="conv-time">{{ formatRelative(conv.updatedAt) }}</span>
          </div>
          <button class="conv-delete" title="删除" @click.stop="deleteConversation(conv.id)">×</button>
        </div>
      </div>

      <div class="sb-bottom">
        <div class="sb-provider">
          <span class="provider-dot"></span>
          <span class="provider-name">{{ currentProviderName }}</span>
        </div>
        <button class="btn-settings" @click="openSettings">
          <span>⚙</span> 设置
          <span v-if="!activeApiKey" class="settings-warn">未配置</span>
        </button>
      </div>
    </aside>

    <!-- ── 右侧主区 ──────────────────────────────────────────────────────────── -->
    <main class="ai-main">
      <!-- 头部 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <span class="chat-icon">◈</span>
          <span class="chat-title">{{ activeConversation?.title ?? 'AI 百宝箱' }}</span>
        </div>
        <div class="chat-header-right">
          <select
            v-if="activeConversation"
            v-model="activeConversation.model"
            class="model-select"
            @change="persistConversations"
          >
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <button
            v-if="activeConversation?.messages.length"
            class="btn-icon-action" title="清空对话"
            @click="clearMessages"
          >⊘</button>
        </div>
      </div>

      <!-- 消息区 -->
      <div ref="messagesRef" class="messages-area">
        <!-- 欢迎态 -->
        <div v-if="!activeConversation || (activeConversation.messages.length === 0 && bubbles.length === 0)" class="welcome-state">
          <div class="welcome-icon">◈</div>
          <div class="welcome-title">AI 百宝箱</div>
          <div v-if="!activeApiKey" class="welcome-warn">
            <span>⚠</span> 请先配置 API Key
            <button class="welcome-config-btn" @click="openSettings">去配置</button>
          </div>
          <div v-else class="welcome-sub">支持文字、图片、文件，开始对话</div>
          <div class="welcome-chips">
            <button v-for="hint in HINT_PROMPTS" :key="hint" class="hint-chip" @click="useHint(hint)">
              {{ hint }}
            </button>
          </div>
        </div>

        <!-- 消息泡泡 -->
        <template v-if="activeConversation">
          <div v-for="msg in bubbles" :key="msg.id" class="message-wrap" :class="msg.role">
            <!-- 附件（图片/文件）显示在气泡上方 -->
            <div v-if="msg.attachments && msg.attachments.length" class="bubble-attachments">
              <div v-for="att in msg.attachments" :key="att.id" class="att-display">
                <template v-if="att.isImage">
                  <img v-if="att.dataUrl" :src="att.dataUrl" class="att-image" :alt="att.name" />
                  <div v-else class="att-placeholder">
                    <span class="att-ph-icon">🖼️</span>
                    <span class="att-ph-name">{{ att.name }}</span>
                    <span class="att-ph-size">{{ formatFileSize(att.size) }}</span>
                  </div>
                </template>
                <div v-else class="att-file-card">
                  <span class="att-file-icon">📄</span>
                  <div class="att-file-info">
                    <span class="att-file-name">{{ att.name }}</span>
                    <span class="att-file-size">{{ formatFileSize(att.size) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 气泡主体 -->
            <div v-if="msg.content || msg.streaming" class="bubble" :class="msg.role">
              <div class="bubble-content">
                <template v-for="(part, i) in parsedContent(msg.content)" :key="i">
                  <span v-if="part.type === 'text'" class="text-part">{{ part.content }}</span>
                  <div v-else class="artifact">
                    <div class="artifact-header">
                      <span class="artifact-lang">{{ part.language || 'code' }}</span>
                      <button class="artifact-copy" @click="copyCode(part.content)">
                        {{ copiedKey === part.content ? '已复制 ✓' : '复制' }}
                      </button>
                    </div>
                    <pre class="artifact-pre"><code>{{ part.content }}</code></pre>
                  </div>
                </template>
                <span v-if="msg.streaming" class="stream-cursor">▋</span>
              </div>
              <div v-if="msg.error" class="bubble-error">{{ msg.error }}</div>
            </div>

            <div class="msg-meta">
              {{ msg.role === 'user' ? '你' : shortModelName(activeConversation.model) }}
              · {{ formatTime(msg.timestamp) }}
            </div>
          </div>
        </template>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <!-- 视觉警告 -->
        <div v-if="hasImageAttachment && !currentModelSupportsVision" class="vision-warn">
          ⚠ 当前模型不支持图片，请切换至视觉模型（如 GLM-4V、GPT-4o）
        </div>

        <!-- 待发附件预览 -->
        <div v-if="pendingAttachments.length" class="pending-attachments">
          <div v-for="att in pendingAttachments" :key="att.id" class="patt-chip">
            <img v-if="att.isImage && att.dataUrl" :src="att.dataUrl" class="patt-thumb" />
            <span v-else class="patt-icon">📄</span>
            <span class="patt-name">{{ att.name }}</span>
            <button class="patt-remove" @click="removeAttachment(att.id)">×</button>
          </div>
        </div>

        <div class="input-row" :class="{ 'input-row--active': inputText.trim() || pendingAttachments.length }">
          <!-- 附件按钮 -->
          <button class="btn-attach" title="上传文件/图片" @click="triggerFileInput">
            <span>📎</span>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            class="file-input-hidden"
            accept="image/*,.txt,.md,.py,.ts,.js,.tsx,.jsx,.vue,.css,.html,.json,.yaml,.yml,.toml,.xml,.csv,.sh,.bash,.log,.conf"
            @change="handleFileSelect"
          />

          <textarea
            ref="inputRef"
            v-model="inputText"
            class="chat-input"
            placeholder="输入消息… (Ctrl+Enter 发送)"
            rows="1"
            :disabled="isStreaming || !activeConversation"
            @keydown.ctrl.enter.prevent="sendMessage"
            @input="autoResize"
          />
          <div class="input-actions">
            <span class="input-hint">Ctrl+Enter</span>
            <button
              class="send-btn"
              :class="{ 'send-btn--active': canSend }"
              :disabled="!canSend"
              @click="sendMessage"
            >
              <span v-if="isStreaming" class="send-loading">…</span>
              <span v-else>▶</span>
            </button>
          </div>
        </div>
        <div v-if="streamError" class="stream-error">⚠ {{ streamError }}</div>
      </div>
    </main>

    <!-- ── 设置弹窗 ──────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings">
        <div class="settings-modal">
          <div class="settings-header">
            <span class="settings-title">⚙ API 设置</span>
            <button class="settings-close" @click="closeSettings">×</button>
          </div>

          <!-- 服务商 Tab -->
          <div class="provider-tabs">
            <button
              v-for="p in PROVIDER_PRESETS"
              :key="p.id"
              class="provider-tab"
              :class="{ 'provider-tab--active': draftProviderId === p.id }"
              @click="selectDraftProvider(p.id)"
            >{{ p.name }}</button>
          </div>

          <div class="settings-body">
            <div class="settings-field">
              <label class="field-label">API Key</label>
              <input
                v-model="draftKey"
                type="password"
                class="field-input"
                :placeholder="draftProviderId === 'deepseek' ? 'sk-...' : draftProviderId === 'zhipu' ? '你的智谱 API Key' : 'sk-...'"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
            <div class="settings-field">
              <label class="field-label">Base URL</label>
              <input
                v-model="draftUrl"
                type="text"
                class="field-input"
                placeholder="https://api.example.com/v1"
                spellcheck="false"
              />
            </div>
            <div class="settings-hint">
              🔒 API Key 仅存储于本地浏览器，不会上传至任何服务器
            </div>
          </div>

          <div class="settings-footer">
            <button class="btn-cancel" @click="closeSettings">取消</button>
            <button class="btn-save" @click="applySettings">保存并切换</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  PROVIDER_PRESETS,
  getActiveConfig, getCurrentProviderId, setCurrentProviderId,
  getProviderKey, saveProviderKey, getProviderUrl, saveProviderUrl,
  getPresetModels, modelSupportsVision, fetchModels, chatStream,
  loadConversations, saveConversations,
  getActiveConversationId, setActiveConversationId, createConversation,
} from '@/services/aiService'
import type { ModelOption, Conversation, StoredMessage, AttachmentMeta, ApiMessage, ApiContentPart } from '@/services/aiService'

// ── 内部类型 ──────────────────────────────────────────────────────────────────
interface ContentPart { type: 'text' | 'code'; content: string; language?: string }

interface Attachment {
  id: string
  name: string
  mimeType: string
  size: number
  isImage: boolean
  dataUrl?: string      // 图片压缩后的 base64 data URL
  textContent?: string  // 文本文件内容
}

interface ChatBubble {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming: boolean
  timestamp: string
  error?: string
  attachments?: Attachment[]
}

// ── 快捷提示词 ────────────────────────────────────────────────────────────────
const HINT_PROMPTS = [
  '帮我写一个 Vue 3 组合式函数',
  '解释 TypeScript 泛型的使用场景',
  '用 Python 写一个数据处理脚本',
  '分析这张图片的内容',
]

// ── 响应式状态 ────────────────────────────────────────────────────────────────
const conversations     = ref<Conversation[]>([])
const activeConvId      = ref('')
const bubbles           = ref<ChatBubble[]>([])
const models            = ref<ModelOption[]>([])
const pendingAttachments = ref<Attachment[]>([])

const inputText   = ref('')
const isStreaming = ref(false)
const streamError = ref('')
const copiedKey   = ref('')

const showSettings    = ref(false)
const draftProviderId = ref(getCurrentProviderId())
const draftKey        = ref('')
const draftUrl        = ref('')

const messagesRef  = ref<HTMLDivElement | null>(null)
const inputRef     = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

let abortStream: (() => void) | null = null

// ── 计算属性 ──────────────────────────────────────────────────────────────────
const activeConfig = computed(() => getActiveConfig())
const activeApiKey = computed(() => activeConfig.value.apiKey)

const currentProviderName = computed(() =>
  PROVIDER_PRESETS.find(p => p.id === getCurrentProviderId())?.name ?? '自定义'
)

const sortedConversations = computed(() =>
  [...conversations.value].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
)

const activeConversation = computed((): Conversation | undefined =>
  conversations.value.find(c => c.id === activeConvId.value)
)

const hasImageAttachment = computed(() =>
  pendingAttachments.value.some(a => a.isImage)
)

const currentModelSupportsVision = computed(() => {
  const cfg = activeConfig.value
  const model = activeConversation.value?.model ?? ''
  return modelSupportsVision(cfg.providerId, model)
})

const canSend = computed(() =>
  (!!inputText.value.trim() || pendingAttachments.value.length > 0) &&
  !isStreaming.value &&
  !!activeConversation.value &&
  !!activeApiKey.value
)

// ── 设置 ──────────────────────────────────────────────────────────────────────
function openSettings() {
  draftProviderId.value = getCurrentProviderId()
  draftKey.value = getProviderKey(draftProviderId.value)
  draftUrl.value = getProviderUrl(draftProviderId.value)
  showSettings.value = true
}

function closeSettings() { showSettings.value = false }

function selectDraftProvider(id: string) {
  draftProviderId.value = id
  draftKey.value = getProviderKey(id)
  const preset = PROVIDER_PRESETS.find(p => p.id === id)
  draftUrl.value = getProviderUrl(id) || preset?.baseUrl || ''
}

function applySettings() {
  const pid = draftProviderId.value
  saveProviderKey(pid, draftKey.value)
  saveProviderUrl(pid, draftUrl.value)
  setCurrentProviderId(pid)
  showSettings.value = false
  loadModels()
}

// ── 模型 ──────────────────────────────────────────────────────────────────────
async function loadModels() {
  const cfg = getActiveConfig()
  const fallback = getPresetModels(cfg.providerId)
  models.value = await fetchModels(cfg.apiKey, cfg.baseUrl, fallback)
  // 若当前对话模型不在列表中，切换为第一个
  if (activeConversation.value && models.value.length > 0) {
    const found = models.value.some(m => m.id === activeConversation.value!.model)
    if (!found) {
      activeConversation.value.model = models.value[0].id
      persistConversations()
    }
  }
}

// ── 对话管理 ──────────────────────────────────────────────────────────────────
function persistConversations() { saveConversations(conversations.value) }

function selectConversation(id: string) {
  if (isStreaming.value) return
  activeConvId.value = id
  setActiveConversationId(id)
  pendingAttachments.value = []
  rebuildBubbles()
}

function createNewConversation() {
  const model = activeConversation.value?.model ?? models.value[0]?.id ?? 'deepseek-chat'
  const conv = createConversation(model)
  conversations.value.push(conv)
  persistConversations()
  selectConversation(conv.id)
}

function deleteConversation(id: string) {
  if (isStreaming.value && activeConvId.value === id) return
  const idx = conversations.value.findIndex(c => c.id === id)
  if (idx === -1) return
  conversations.value.splice(idx, 1)
  persistConversations()
  if (activeConvId.value === id) {
    const next = sortedConversations.value[0]
    if (next) selectConversation(next.id)
    else { activeConvId.value = ''; setActiveConversationId(''); bubbles.value = [] }
  }
}

function clearMessages() {
  if (!activeConversation.value || isStreaming.value) return
  activeConversation.value.messages = []
  activeConversation.value.updatedAt = new Date().toISOString()
  persistConversations()
  bubbles.value = []
  pendingAttachments.value = []
}

function rebuildBubbles() {
  const conv = activeConversation.value
  if (!conv) { bubbles.value = []; return }
  bubbles.value = conv.messages.map(m => ({
    id: m.id, role: m.role, content: m.content,
    streaming: false, timestamp: m.timestamp,
    attachments: m.attachmentMeta?.map((meta, i) => ({
      id: `hist-${m.id}-${i}`,
      name: meta.name, mimeType: meta.mimeType,
      size: meta.size, isImage: meta.isImage,
      // 历史消息无原始数据，仅元数据用于显示占位
    })),
  }))
  nextTick(scrollToBottom)
}

// ── 文件上传 ──────────────────────────────────────────────────────────────────
function triggerFileInput() { fileInputRef.value?.click() }

async function compressImage(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width: w, height: h } = img
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim }
        else       { w = Math.round(w * maxDim / h); h = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  streamError.value = ''

  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) {
      streamError.value = `文件 ${file.name} 超过 20MB 限制`
      continue
    }
    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const isImage = file.type.startsWith('image/')
    try {
      if (isImage) {
        const dataUrl = await compressImage(file)
        pendingAttachments.value.push({ id, name: file.name, mimeType: file.type, size: file.size, isImage: true, dataUrl })
      } else {
        const textContent = await file.text()
        pendingAttachments.value.push({ id, name: file.name, mimeType: file.type, size: file.size, isImage: false, textContent })
      }
    } catch {
      streamError.value = `无法读取文件 ${file.name}`
    }
  }
}

function removeAttachment(id: string) {
  pendingAttachments.value = pendingAttachments.value.filter(a => a.id !== id)
}

// ── 发送消息 ──────────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = inputText.value.trim()
  const atts  = [...pendingAttachments.value]
  if ((!text && atts.length === 0) || isStreaming.value || !activeConversation.value) return
  if (!activeApiKey.value) { openSettings(); return }

  const conv = activeConversation.value
  streamError.value = ''
  inputText.value = ''
  pendingAttachments.value = []
  resetInputHeight()

  // ── 构建存储用的纯文本内容 ──
  let storedContent = text
  for (const att of atts) {
    if (att.isImage) {
      storedContent += (storedContent ? '\n' : '') + `[图片: ${att.name}]`
    } else if (att.textContent) {
      storedContent += (storedContent ? '\n\n' : '') + `\`\`\`\n// ${att.name}\n${att.textContent}\n\`\`\``
    }
  }

  // ── 构建 API 多模态内容 ──
  const apiParts: ApiContentPart[] = []
  if (text) apiParts.push({ type: 'text', text })
  for (const att of atts) {
    if (att.isImage && att.dataUrl) {
      apiParts.push({ type: 'image_url', image_url: { url: att.dataUrl, detail: 'auto' } })
    } else if (att.textContent) {
      apiParts.push({ type: 'text', text: `\n\n[文件: ${att.name}]\n\`\`\`\n${att.textContent}\n\`\`\`` })
    }
  }
  const userApiContent: ApiMessage['content'] =
    apiParts.length === 1 && apiParts[0].type === 'text' ? (apiParts[0] as any).text : apiParts

  // ── 持久化用户消息 ──
  const userStored: StoredMessage = {
    id: `u-${Date.now()}`, role: 'user',
    content: storedContent, timestamp: new Date().toISOString(),
    attachmentMeta: atts.map(a => ({ name: a.name, mimeType: a.mimeType, size: a.size, isImage: a.isImage })),
  }
  if (conv.title === '新对话') {
    conv.title = storedContent.replace(/\n.*/s, '').slice(0, 24) + (storedContent.length > 24 ? '…' : '')
  }
  conv.messages.push(userStored)
  conv.updatedAt = userStored.timestamp
  persistConversations()

  // ── 展示用户泡泡 ──
  bubbles.value.push({
    id: userStored.id, role: 'user',
    content: text, streaming: false, timestamp: userStored.timestamp,
    attachments: atts,
  })

  // ── 添加 AI 占位泡泡 ──
  const aiBubble: ChatBubble = {
    id: `a-${Date.now()}`, role: 'assistant',
    content: '', streaming: true, timestamp: new Date().toISOString(),
  }
  bubbles.value.push(aiBubble)
  isStreaming.value = true
  await scrollToBottom()

  // ── 构建历史（不含当前用户消息，因为下面手动拼接）──
  const history: ApiMessage[] = conv.messages
    .filter(m => m.id !== userStored.id)
    .map(m => ({ role: m.role, content: m.content }))
  history.push({ role: 'user', content: userApiContent })

  const cfg = getActiveConfig()
  abortStream = chatStream(
    cfg.apiKey, cfg.baseUrl, history, conv.model,
    (chunk) => { aiBubble.content += chunk; scrollToBottom() },
    () => {
      const aiStored: StoredMessage = {
        id: aiBubble.id, role: 'assistant',
        content: aiBubble.content, timestamp: aiBubble.timestamp,
      }
      conv.messages.push(aiStored)
      conv.updatedAt = aiStored.timestamp
      persistConversations()
      aiBubble.streaming = false
      isStreaming.value = false
      abortStream = null
      scrollToBottom()
    },
    (err) => {
      aiBubble.streaming = false
      aiBubble.error = err.message
      isStreaming.value = false
      streamError.value = err.message
      abortStream = null
    },
  )
}

function useHint(hint: string) {
  if (!activeConversation.value) createNewConversation()
  inputText.value = hint
  inputRef.value?.focus()
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function parsedContent(text: string): ContentPart[] {
  const parts: ContentPart[] = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    parts.push({ type: 'code', language: m[1] || undefined, content: m[2].trimEnd() })
    last = re.lastIndex
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', content: text }]
}

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

function resetInputHeight() {
  if (inputRef.value) inputRef.value.style.height = 'auto'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
}

function formatRelative(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60_000)     return '刚刚'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}分钟前`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}小时前`
  return `${Math.floor(d / 86_400_000)}天前`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function shortModelName(modelId: string): string {
  const found = models.value.find(m => m.id === modelId)
  if (found) return found.name
  return modelId.split('/').pop() ?? modelId
}

async function copyCode(code: string) {
  try { await navigator.clipboard.writeText(code) } catch { /* ignore */ }
  copiedKey.value = code
  setTimeout(() => { copiedKey.value = '' }, 2000)
}

// ── 初始化 ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  conversations.value = loadConversations()
  const savedId = getActiveConversationId()
  if (savedId && conversations.value.some(c => c.id === savedId)) {
    activeConvId.value = savedId
  } else if (conversations.value.length) {
    activeConvId.value = sortedConversations.value[0].id
    setActiveConversationId(activeConvId.value)
  }
  rebuildBubbles()
  await loadModels()
})

onUnmounted(() => { abortStream?.() })
</script>

<style scoped>
/* ── 整体布局 ─────────────────────────────────────────────────────────────── */
.ai-toolbox { display:flex; gap:0; margin:-1.5rem; width:calc(100% + 3rem); height:calc(100vh - 120px); overflow:hidden; }

/* ── 左侧边栏 ────────────────────────────────────────────────────────────── */
.ai-sidebar { width:260px; flex-shrink:0; display:flex; flex-direction:column; border-right:1px solid #21262d; background:#0d1117; overflow:hidden; }
.sb-top { padding:12px; border-bottom:1px solid #21262d; flex-shrink:0; }
.btn-new-chat {
  width:100%; padding:8px 12px; display:flex; align-items:center; gap:8px;
  border-radius:6px; cursor:pointer; border:1px solid rgba(88,166,255,.25);
  background:rgba(88,166,255,.1); color:#58a6ff; font-size:12px; font-weight:600; transition:all .15s;
}
.btn-new-chat:hover { background:rgba(88,166,255,.2); border-color:#58a6ff; }

.conv-list { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
.conv-list::-webkit-scrollbar { width:3px; }
.conv-list::-webkit-scrollbar-thumb { background:#30363d; border-radius:3px; }
.conv-empty { text-align:center; padding:2rem 0; font-size:11px; color:#484f58; }

.conv-item {
  position:relative; padding:8px 28px 8px 10px; border-radius:6px; cursor:pointer;
  border:1px solid transparent; transition:all .15s;
}
.conv-item:hover { background:rgba(255,255,255,.04); border-color:#21262d; }
.conv-item--active { background:rgba(88,166,255,.08); border-color:rgba(88,166,255,.2); }
.conv-title { font-size:12px; font-weight:600; color:#c9d1d9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
.conv-item--active .conv-title { color:#e6edf3; }
.conv-meta { display:flex; justify-content:space-between; gap:6px; }
.conv-model { font-size:10px; color:#484f58; font-family:'JetBrains Mono',monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px; }
.conv-time  { font-size:10px; color:#484f58; flex-shrink:0; }
.conv-delete {
  position:absolute; right:6px; top:50%; transform:translateY(-50%);
  width:18px; height:18px; border-radius:3px; background:transparent; border:none;
  color:#484f58; font-size:14px; cursor:pointer; opacity:0; transition:all .15s;
  display:flex; align-items:center; justify-content:center;
}
.conv-item:hover .conv-delete { opacity:1; }
.conv-delete:hover { color:#f85149; background:rgba(248,81,73,.1); }

.sb-bottom { padding:10px 12px; border-top:1px solid #21262d; flex-shrink:0; display:flex; flex-direction:column; gap:6px; }
.sb-provider { display:flex; align-items:center; gap:6px; }
.provider-dot { width:6px; height:6px; border-radius:50%; background:#39d353; box-shadow:0 0 4px rgba(57,211,83,.7); flex-shrink:0; }
.provider-name { font-size:11px; color:#58a6ff; font-family:'JetBrains Mono',monospace; }
.btn-settings {
  width:100%; padding:7px 10px; display:flex; align-items:center; gap:7px;
  border-radius:5px; cursor:pointer; background:transparent; border:1px solid #21262d;
  color:#7d8590; font-size:11px; font-family:'JetBrains Mono',monospace; transition:all .15s;
}
.btn-settings:hover { background:rgba(255,255,255,.04); color:#c9d1d9; }
.settings-warn { margin-left:auto; font-size:9px; padding:1px 6px; border-radius:3px; background:rgba(227,179,65,.12); border:1px solid rgba(227,179,65,.3); color:#e3b341; }

/* ── 右侧主区 ────────────────────────────────────────────────────────────── */
.ai-main { flex:1; display:flex; flex-direction:column; min-width:0; background:#0d1117; overflow:hidden; }

.chat-header { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #21262d; flex-shrink:0; gap:12px; }
.chat-header-left  { display:flex; align-items:center; gap:8px; min-width:0; }
.chat-icon  { color:#58a6ff; font-size:14px; flex-shrink:0; }
.chat-title { font-size:13px; font-weight:700; color:#e6edf3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.chat-header-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.model-select { font-size:11px; padding:4px 8px; border-radius:5px; background:#161b22; border:1px solid #30363d; color:#c9d1d9; font-family:'JetBrains Mono',monospace; cursor:pointer; outline:none; transition:border-color .15s; max-width:200px; }
.model-select:hover { border-color:rgba(88,166,255,.4); }
.btn-icon-action { width:28px; height:28px; border-radius:5px; cursor:pointer; background:transparent; border:1px solid #21262d; color:#484f58; font-size:14px; transition:all .15s; display:flex; align-items:center; justify-content:center; }
.btn-icon-action:hover { color:#f85149; border-color:rgba(248,81,73,.3); }

/* ── 消息区 ──────────────────────────────────────────────────────────────── */
.messages-area { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:16px; scroll-behavior:smooth; }
.messages-area::-webkit-scrollbar { width:3px; }
.messages-area::-webkit-scrollbar-thumb { background:#30363d; border-radius:3px; }

.welcome-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:2rem; }
.welcome-icon  { font-size:32px; color:#58a6ff; opacity:.5; }
.welcome-title { font-size:18px; font-weight:800; color:#e6edf3; }
.welcome-sub   { font-size:12px; color:#484f58; }
.welcome-warn  { display:flex; align-items:center; gap:8px; font-size:12px; color:#e3b341; padding:7px 14px; border-radius:6px; background:rgba(227,179,65,.07); border:1px solid rgba(227,179,65,.2); }
.welcome-config-btn { font-size:11px; padding:2px 10px; border-radius:4px; cursor:pointer; background:rgba(88,166,255,.1); border:1px solid rgba(88,166,255,.3); color:#58a6ff; transition:all .15s; }
.welcome-config-btn:hover { background:rgba(88,166,255,.2); }
.welcome-chips { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin-top:6px; }
.hint-chip { font-size:11px; padding:5px 12px; border-radius:14px; cursor:pointer; background:rgba(88,166,255,.07); border:1px solid rgba(88,166,255,.18); color:#58a6ff; transition:all .15s; font-family:'JetBrains Mono',monospace; }
.hint-chip:hover { background:rgba(88,166,255,.15); border-color:rgba(88,166,255,.4); }

.message-wrap { display:flex; flex-direction:column; gap:4px; max-width:80%; }
.message-wrap.user      { align-self:flex-end;   align-items:flex-end; }
.message-wrap.assistant { align-self:flex-start; align-items:flex-start; }

/* 附件展示 */
.bubble-attachments { display:flex; flex-wrap:wrap; gap:8px; max-width:100%; }
.att-display { display:flex; }
.att-image { max-width:280px; max-height:280px; border-radius:8px; border:1px solid #30363d; object-fit:cover; cursor:zoom-in; }
.att-placeholder { display:flex; align-items:center; gap:6px; padding:8px 12px; border-radius:8px; background:#161b22; border:1px solid #30363d; }
.att-ph-icon { font-size:20px; }
.att-ph-name { font-size:12px; color:#c9d1d9; }
.att-ph-size { font-size:10px; color:#484f58; }
.att-file-card { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:#161b22; border:1px solid #30363d; }
.att-file-icon { font-size:20px; }
.att-file-info { display:flex; flex-direction:column; gap:2px; }
.att-file-name { font-size:12px; color:#c9d1d9; font-family:'JetBrains Mono',monospace; }
.att-file-size { font-size:10px; color:#484f58; }

.bubble { padding:10px 14px; border-radius:10px; font-size:13px; line-height:1.65; word-break:break-word; }
.bubble.user      { background:rgba(88,166,255,.12); border:1px solid rgba(88,166,255,.25); color:#e6edf3; border-bottom-right-radius:3px; }
.bubble.assistant { background:#161b22; border:1px solid #21262d; color:#c9d1d9; border-bottom-left-radius:3px; }
.bubble-content { display:flex; flex-direction:column; gap:8px; }
.text-part { white-space:pre-wrap; display:block; }
.artifact { border-radius:7px; overflow:hidden; border:1px solid #30363d; background:#0d1117; }
.artifact-header { display:flex; align-items:center; justify-content:space-between; padding:5px 10px; background:#161b22; border-bottom:1px solid #21262d; }
.artifact-lang { font-size:10px; color:#58a6ff; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.06em; }
.artifact-copy { font-size:10px; padding:1px 8px; border-radius:3px; cursor:pointer; background:rgba(88,166,255,.08); border:1px solid rgba(88,166,255,.2); color:#58a6ff; font-family:'JetBrains Mono',monospace; transition:all .15s; }
.artifact-copy:hover { background:rgba(88,166,255,.18); }
.artifact-pre { margin:0; padding:10px 12px; font-size:12px; line-height:1.6; color:#c9d1d9; overflow-x:auto; font-family:'JetBrains Mono',monospace; }
.stream-cursor { color:#58a6ff; animation:blink-cursor .6s step-end infinite; }
@keyframes blink-cursor { 0%,100%{opacity:1;}50%{opacity:0;} }
.bubble-error { font-size:11px; color:#f85149; margin-top:4px; padding:4px 8px; border-radius:4px; background:rgba(248,81,73,.07); border:1px solid rgba(248,81,73,.2); }
.msg-meta { font-size:10px; color:#484f58; padding:0 4px; }

/* ── 输入区 ──────────────────────────────────────────────────────────────── */
.input-area { flex-shrink:0; padding:10px 16px 12px; border-top:1px solid #21262d; display:flex; flex-direction:column; gap:6px; }

.vision-warn { font-size:11px; color:#e3b341; padding:5px 10px; border-radius:5px; background:rgba(227,179,65,.07); border:1px solid rgba(227,179,65,.2); }

.pending-attachments { display:flex; flex-wrap:wrap; gap:6px; }
.patt-chip { display:flex; align-items:center; gap:6px; padding:4px 8px; border-radius:6px; background:#161b22; border:1px solid #30363d; position:relative; }
.patt-thumb { width:36px; height:36px; object-fit:cover; border-radius:4px; }
.patt-icon  { font-size:18px; }
.patt-name  { font-size:11px; color:#c9d1d9; max-width:100px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'JetBrains Mono',monospace; }
.patt-remove { width:16px; height:16px; border-radius:3px; background:rgba(248,81,73,.1); border:1px solid rgba(248,81,73,.2); color:#f85149; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
.patt-remove:hover { background:rgba(248,81,73,.25); }

.file-input-hidden { display:none; }

.input-row { display:flex; align-items:flex-end; gap:8px; padding:8px 10px; border-radius:8px; background:#161b22; border:1px solid #30363d; transition:border-color .2s; }
.input-row--active  { border-color:rgba(88,166,255,.4); }
.input-row:focus-within { border-color:rgba(88,166,255,.5); }

.btn-attach { width:30px; height:30px; border-radius:6px; cursor:pointer; background:transparent; border:1px solid #30363d; color:#7d8590; font-size:15px; transition:all .15s; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.btn-attach:hover { color:#58a6ff; border-color:rgba(88,166,255,.4); background:rgba(88,166,255,.06); }

.chat-input { flex:1; background:transparent; border:none; outline:none; resize:none; font-size:13px; color:#e6edf3; line-height:1.5; font-family:inherit; max-height:160px; min-height:22px; }
.chat-input::placeholder { color:#484f58; }
.chat-input:disabled { opacity:.5; cursor:not-allowed; }

.input-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.input-hint { font-size:10px; color:#30363d; font-family:'JetBrains Mono',monospace; }
.send-btn { width:30px; height:30px; border-radius:6px; cursor:not-allowed; background:#21262d; border:1px solid #30363d; color:#484f58; font-size:13px; transition:all .2s; display:flex; align-items:center; justify-content:center; }
.send-btn--active { cursor:pointer; background:rgba(88,166,255,.15); border-color:rgba(88,166,255,.4); color:#58a6ff; }
.send-btn--active:hover { background:rgba(88,166,255,.25); box-shadow:0 0 10px rgba(88,166,255,.2); }
.send-loading { color:#58a6ff; animation:shimmer 1s ease-in-out infinite; }
@keyframes shimmer { 0%,100%{opacity:1;}50%{opacity:.4;} }
.stream-error { font-size:11px; color:#f85149; font-family:'JetBrains Mono',monospace; }

/* ── 设置弹窗 ────────────────────────────────────────────────────────────── */
.settings-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.65); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; }
.settings-modal { width:460px; max-width:calc(100vw - 2rem); background:#161b22; border:1px solid #30363d; border-radius:10px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.6); }
.settings-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #21262d; }
.settings-title { font-size:14px; font-weight:700; color:#e6edf3; }
.settings-close { width:24px; height:24px; border-radius:4px; cursor:pointer; background:transparent; border:1px solid transparent; color:#7d8590; font-size:18px; transition:all .15s; display:flex; align-items:center; justify-content:center; }
.settings-close:hover { color:#e6edf3; border-color:#30363d; background:#21262d; }

.provider-tabs { display:flex; border-bottom:1px solid #21262d; background:#0d1117; }
.provider-tab { flex:1; padding:10px 6px; font-size:12px; font-weight:600; cursor:pointer; background:transparent; border:none; color:#484f58; transition:all .15s; border-bottom:2px solid transparent; }
.provider-tab:hover { color:#7d8590; }
.provider-tab--active { color:#58a6ff; border-bottom-color:#58a6ff; }

.settings-body { padding:18px; display:flex; flex-direction:column; gap:14px; }
.settings-field { display:flex; flex-direction:column; gap:6px; }
.field-label { font-size:11px; font-weight:700; color:#7d8590; text-transform:uppercase; letter-spacing:.06em; }
.field-input { padding:8px 10px; border-radius:6px; outline:none; background:#0d1117; border:1px solid #30363d; color:#e6edf3; font-size:13px; font-family:'JetBrains Mono',monospace; transition:border-color .15s; }
.field-input:focus { border-color:rgba(88,166,255,.5); }
.settings-hint { font-size:11px; color:#484f58; padding:6px 8px; border-radius:5px; background:rgba(88,166,255,.04); border:1px solid rgba(88,166,255,.1); }

.settings-footer { display:flex; justify-content:flex-end; gap:8px; padding:12px 18px; border-top:1px solid #21262d; }
.btn-cancel { padding:6px 16px; border-radius:5px; cursor:pointer; background:transparent; border:1px solid #30363d; color:#7d8590; font-size:12px; transition:all .15s; }
.btn-cancel:hover { color:#c9d1d9; border-color:#484f58; }
.btn-save { padding:6px 16px; border-radius:5px; cursor:pointer; background:rgba(88,166,255,.15); border:1px solid rgba(88,166,255,.4); color:#58a6ff; font-size:12px; font-weight:600; transition:all .15s; }
.btn-save:hover { background:rgba(88,166,255,.25); border-color:#58a6ff; }

@media (max-width: 768px) {
  .ai-sidebar { display:none; }
  .message-wrap { max-width:95%; }
  .input-hint { display:none; }
  .att-image { max-width:200px; max-height:200px; }
}
</style>
