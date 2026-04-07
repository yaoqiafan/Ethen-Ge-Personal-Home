<template>
  <div class="ai-toolbox animate-fade-in">

    <!-- ── 左侧边栏：对话列表 ──────────────────────────────────────────────── -->
    <aside class="ai-sidebar">
      <div class="sb-top">
        <button class="btn-new-chat" @click="createNewConversation">
          <span class="btn-new-icon">＋</span>新建对话
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
          <button
            class="conv-delete"
            title="删除对话"
            @click.stop="deleteConversation(conv.id)"
          >×</button>
        </div>
      </div>

      <div class="sb-bottom">
        <button class="btn-settings" @click="showSettings = true">
          <span>⚙</span> API 设置
          <span v-if="!config.apiKey" class="settings-warn">未配置</span>
        </button>
      </div>
    </aside>

    <!-- ── 右侧主区：对话界面 ──────────────────────────────────────────────── -->
    <main class="ai-main">

      <!-- 对话头部 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <span class="chat-icon">◈</span>
          <span class="chat-title">{{ activeConversation?.title ?? 'AI 对话' }}</span>
        </div>
        <div class="chat-header-right">
          <select
            v-if="activeConversation"
            v-model="activeConversation.model"
            class="model-select"
            :disabled="modelsLoading"
            @change="persistConversations"
          >
            <option v-if="modelsLoading" value="">加载模型…</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <button
            v-if="activeConversation?.messages.length"
            class="btn-icon-action"
            title="清空当前对话消息"
            @click="clearMessages"
          >⊘</button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="messagesRef" class="messages-area">

        <!-- 欢迎占位 -->
        <div v-if="!activeConversation || activeConversation.messages.length === 0" class="welcome-state">
          <div class="welcome-icon">◈</div>
          <div class="welcome-title">AI 百宝箱</div>
          <div v-if="!config.apiKey" class="welcome-warn">
            <span>⚠</span> 请先配置 API Key
            <button class="welcome-config-btn" @click="showSettings = true">去配置</button>
          </div>
          <div v-else class="welcome-sub">选择模型，开始对话</div>
          <div class="welcome-chips">
            <button
              v-for="hint in HINT_PROMPTS"
              :key="hint"
              class="hint-chip"
              @click="useHint(hint)"
            >{{ hint }}</button>
          </div>
        </div>

        <!-- 消息气泡 -->
        <template v-if="activeConversation">
          <div
            v-for="msg in bubbles"
            :key="msg.id"
            class="message-wrap"
            :class="msg.role"
          >
            <div class="bubble" :class="msg.role">
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
        <div class="input-wrap" :class="{ 'input-wrap--active': inputText.trim() }">
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
      <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
        <div class="settings-modal">
          <div class="settings-header">
            <span class="settings-title">API 设置</span>
            <button class="settings-close" @click="showSettings = false">×</button>
          </div>

          <div class="settings-body">
            <div class="settings-field">
              <label class="field-label">API Key</label>
              <input
                v-model="draftConfig.apiKey"
                type="password"
                class="field-input"
                placeholder="sk-..."
                autocomplete="off"
                spellcheck="false"
              />
              <span class="field-hint">将保存在浏览器 localStorage 中，不会上传至任何服务器</span>
            </div>

            <div class="settings-field">
              <label class="field-label">API Base URL</label>
              <input
                v-model="draftConfig.baseUrl"
                type="text"
                class="field-input"
                placeholder="https://api.openai.com/v1"
                spellcheck="false"
              />
              <span class="field-hint">兼容 OpenAI 协议的服务均可使用，如 DeepSeek、Moonshot 等</span>
            </div>
          </div>

          <div class="settings-footer">
            <button class="btn-cancel" @click="showSettings = false">取消</button>
            <button class="btn-save" @click="applySettings">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  getConfig, saveConfig, fetchModels,
  chatStream, loadConversations, saveConversations,
  getActiveConversationId, setActiveConversationId, createConversation,
  DEFAULT_MODELS,
} from '@/services/aiService'
import type { AIConfig, ModelOption, Conversation, StoredMessage } from '@/services/aiService'

// ── 内部类型 ──────────────────────────────────────────────────────────────────
interface ContentPart { type: 'text' | 'code'; content: string; language?: string }
interface ChatBubble {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  streaming: boolean
  timestamp: string
  error?:    string
}

// ── 快捷提示词 ────────────────────────────────────────────────────────────────
const HINT_PROMPTS = [
  '用 C# 写一个 Modbus TCP 读取示例',
  '解释 SECS/GEM 协议的握手流程',
  '帮我写一份 Vue 3 组件开发规范',
  '给我介绍一下 TypeScript 泛型的用法',
]

// ── 响应式状态 ────────────────────────────────────────────────────────────────
const config        = ref<AIConfig>(getConfig())
const models        = ref<ModelOption[]>(DEFAULT_MODELS)
const modelsLoading = ref(false)

const conversations = ref<Conversation[]>([])
const activeConvId  = ref('')
const bubbles       = ref<ChatBubble[]>([])    // 当前会话的展示泡泡（含流式临时态）

const inputText   = ref('')
const isStreaming = ref(false)
const streamError = ref('')
const copiedKey   = ref('')

const showSettings  = ref(false)
const draftConfig   = ref<AIConfig>({ ...getConfig() })

const messagesRef = ref<HTMLDivElement | null>(null)
const inputRef    = ref<HTMLTextAreaElement | null>(null)

let abortStream: (() => void) | null = null

// ── 计算属性 ──────────────────────────────────────────────────────────────────
const sortedConversations = computed(() =>
  [...conversations.value].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
)

const activeConversation = computed((): Conversation | undefined =>
  conversations.value.find(c => c.id === activeConvId.value)
)

const canSend = computed(() =>
  !!inputText.value.trim() &&
  !isStreaming.value &&
  !!activeConversation.value &&
  !!config.value.apiKey
)

// ── 对话管理 ──────────────────────────────────────────────────────────────────
function selectConversation(id: string) {
  if (isStreaming.value) return
  activeConvId.value = id
  setActiveConversationId(id)
  rebuildBubbles()
}

function createNewConversation() {
  const defaultModel = models.value[0]?.id ?? 'gpt-4o'
  const conv = createConversation(
    activeConversation.value?.model ?? defaultModel
  )
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
    if (next) {
      selectConversation(next.id)
    } else {
      activeConvId.value = ''
      setActiveConversationId('')
      bubbles.value = []
    }
  }
}

function clearMessages() {
  if (!activeConversation.value || isStreaming.value) return
  activeConversation.value.messages = []
  activeConversation.value.updatedAt = new Date().toISOString()
  persistConversations()
  bubbles.value = []
}

// ── 泡泡同步 ──────────────────────────────────────────────────────────────────
function rebuildBubbles() {
  const conv = activeConversation.value
  if (!conv) { bubbles.value = []; return }
  bubbles.value = conv.messages.map(m => ({
    id:        m.id,
    role:      m.role,
    content:   m.content,
    streaming: false,
    timestamp: m.timestamp,
  }))
  nextTick(scrollToBottom)
}

// ── 发送消息 ──────────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value || !activeConversation.value) return
  if (!config.value.apiKey) { showSettings.value = true; return }

  const conv = activeConversation.value
  streamError.value = ''
  inputText.value   = ''
  resetInputHeight()

  // 存储用户消息
  const userMsg: StoredMessage = {
    id:        `u-${Date.now()}`,
    role:      'user',
    content:   text,
    timestamp: new Date().toISOString(),
  }
  conv.messages.push(userMsg)
  conv.updatedAt = userMsg.timestamp
  if (conv.title === '新对话') {
    conv.title = text.slice(0, 20) + (text.length > 20 ? '…' : '')
  }
  persistConversations()

  // 展示用户泡泡
  bubbles.value.push({ ...userMsg, streaming: false })

  // 展示 AI 占位泡泡
  const aiBubble: ChatBubble = {
    id:        `a-${Date.now()}`,
    role:      'assistant',
    content:   '',
    streaming: true,
    timestamp: new Date().toISOString(),
  }
  bubbles.value.push(aiBubble)
  isStreaming.value = true
  await scrollToBottom()

  // 构造上下文（不含当前流式泡泡）
  const history = conv.messages.map(m => ({ role: m.role, content: m.content }))

  abortStream = chatStream(
    config.value,
    history,
    conv.model,
    (chunk) => {
      aiBubble.content += chunk
      scrollToBottom()
    },
    () => {
      // 将 AI 消息持久化
      const aiStored: StoredMessage = {
        id:        aiBubble.id,
        role:      'assistant',
        content:   aiBubble.content,
        timestamp: aiBubble.timestamp,
      }
      conv.messages.push(aiStored)
      conv.updatedAt = aiStored.timestamp
      persistConversations()

      aiBubble.streaming = false
      isStreaming.value  = false
      abortStream        = null
      scrollToBottom()
    },
    (err) => {
      aiBubble.streaming = false
      aiBubble.error     = err.message
      isStreaming.value  = false
      streamError.value  = err.message
      abortStream        = null
    },
  )
}

function useHint(hint: string) {
  if (!activeConversation.value) createNewConversation()
  inputText.value = hint
  inputRef.value?.focus()
}

// ── 设置 ──────────────────────────────────────────────────────────────────────
function applySettings() {
  saveConfig(draftConfig.value)
  config.value = getConfig()
  showSettings.value = false
  loadModels()
}

watch(showSettings, (val) => {
  if (val) draftConfig.value = { ...config.value }
})

// ── 模型加载 ──────────────────────────────────────────────────────────────────
async function loadModels() {
  modelsLoading.value = true
  try {
    models.value = await fetchModels(config.value)
  } finally {
    modelsLoading.value = false
  }
}

// ── 持久化 ────────────────────────────────────────────────────────────────────
function persistConversations() {
  saveConversations(conversations.value)
}

// ── 内容解析 ──────────────────────────────────────────────────────────────────
function parsedContent(text: string): ContentPart[] {
  const parts: ContentPart[] = []
  const regex = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    parts.push({ type: 'code', language: m[1] || undefined, content: m[2].trimEnd() })
    last = regex.lastIndex
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', content: text }]
}

// ── UI 辅助 ───────────────────────────────────────────────────────────────────
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
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour12: false, hour: '2-digit', minute: '2-digit',
  })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)          return '刚刚'
  if (diff < 3_600_000)       return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000)      return `${Math.floor(diff / 3_600_000)}小时前`
  if (diff < 7 * 86_400_000)  return `${Math.floor(diff / 86_400_000)}天前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function shortModelName(modelId: string): string {
  const found = models.value.find(m => m.id === modelId)
  if (found) return found.name
  // 截断较长的 ID
  const parts = modelId.split('/')
  return parts[parts.length - 1] ?? modelId
}

async function copyCode(code: string) {
  try { await navigator.clipboard.writeText(code) } catch { /* ignore */ }
  copiedKey.value = code
  setTimeout(() => { copiedKey.value = '' }, 2000)
}

// ── 初始化 & 清理 ─────────────────────────────────────────────────────────────
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

onUnmounted(() => {
  abortStream?.()
})
</script>

<style scoped>
/* ── 整体布局 ──────────────────────────────────────────────────────────────── */
.ai-toolbox {
  display: flex;
  gap: 0;
  margin: -1.5rem;
  width: calc(100% + 3rem);
  height: calc(100vh - 120px);
  overflow: hidden;
}

/* ── 左侧边栏 ──────────────────────────────────────────────────────────────── */
.ai-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #21262d;
  background: #0d1117;
  overflow: hidden;
}

.sb-top {
  padding: 12px;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.btn-new-chat {
  width: 100%; padding: 8px 12px;
  display: flex; align-items: center; gap: 8px;
  border-radius: 6px; cursor: pointer;
  background: rgba(88,166,255,.1); border: 1px solid rgba(88,166,255,.25);
  color: #58a6ff; font-size: 12px; font-weight: 600;
  transition: all .15s;
}
.btn-new-chat:hover { background: rgba(88,166,255,.18); border-color: #58a6ff; }
.btn-new-icon { font-size: 14px; line-height: 1; }

/* 对话列表 */
.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.conv-list::-webkit-scrollbar { width: 3px; }
.conv-list::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }

.conv-empty {
  text-align: center; padding: 2rem 0;
  font-size: 11px; color: #484f58;
}

.conv-item {
  position: relative;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .15s;
  padding-right: 28px;
}
.conv-item:hover { background: rgba(255,255,255,.04); border-color: #21262d; }
.conv-item--active { background: rgba(88,166,255,.08); border-color: rgba(88,166,255,.2); }

.conv-title {
  font-size: 12px; font-weight: 600; color: #c9d1d9;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 3px;
}
.conv-item--active .conv-title { color: #e6edf3; }

.conv-meta {
  display: flex; justify-content: space-between; align-items: center; gap: 6px;
}
.conv-model {
  font-size: 10px; color: #484f58; font-family: 'JetBrains Mono', monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;
}
.conv-time { font-size: 10px; color: #484f58; flex-shrink: 0; }

.conv-delete {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px; border-radius: 3px;
  background: transparent; border: none; color: #484f58;
  font-size: 14px; cursor: pointer; opacity: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.conv-item:hover .conv-delete { opacity: 1; }
.conv-delete:hover { color: #f85149; background: rgba(248,81,73,.1); }

/* 底部设置 */
.sb-bottom {
  padding: 10px 12px;
  border-top: 1px solid #21262d;
  flex-shrink: 0;
}

.btn-settings {
  width: 100%; padding: 7px 10px;
  display: flex; align-items: center; gap: 7px;
  border-radius: 5px; cursor: pointer;
  background: transparent; border: 1px solid #21262d;
  color: #7d8590; font-size: 11px; font-family: 'JetBrains Mono', monospace;
  transition: all .15s;
}
.btn-settings:hover { background: rgba(255,255,255,.04); border-color: #30363d; color: #c9d1d9; }

.settings-warn {
  margin-left: auto; font-size: 9px; padding: 1px 6px; border-radius: 3px;
  background: rgba(227,179,65,.12); border: 1px solid rgba(227,179,65,.3); color: #e3b341;
}

/* ── 右侧主区 ──────────────────────────────────────────────────────────────── */
.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #0d1117;
  overflow: hidden;
}

.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid #21262d;
  flex-shrink: 0; gap: 12px;
}
.chat-header-left  { display: flex; align-items: center; gap: 8px; min-width: 0; }
.chat-icon  { color: #58a6ff; font-size: 14px; flex-shrink: 0; }
.chat-title {
  font-size: 13px; font-weight: 700; color: #e6edf3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.chat-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.model-select {
  font-size: 11px; padding: 4px 8px; border-radius: 5px;
  background: #161b22; border: 1px solid #30363d; color: #c9d1d9;
  font-family: 'JetBrains Mono', monospace; cursor: pointer; outline: none;
  transition: border-color .15s; max-width: 180px;
}
.model-select:hover, .model-select:focus { border-color: rgba(88,166,255,.4); }

.btn-icon-action {
  width: 28px; height: 28px; border-radius: 5px; cursor: pointer;
  background: transparent; border: 1px solid #21262d; color: #484f58;
  font-size: 14px; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.btn-icon-action:hover { color: #f85149; border-color: rgba(248,81,73,.3); }

/* ── 消息区 ────────────────────────────────────────────────────────────────── */
.messages-area {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 16px;
  scroll-behavior: smooth;
}
.messages-area::-webkit-scrollbar { width: 3px; }
.messages-area::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }

/* 欢迎态 */
.welcome-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; padding: 2rem;
}
.welcome-icon  { font-size: 32px; color: #58a6ff; opacity: .5; }
.welcome-title { font-size: 18px; font-weight: 800; color: #e6edf3; }
.welcome-sub   { font-size: 12px; color: #484f58; }
.welcome-warn {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #e3b341;
  padding: 7px 14px; border-radius: 6px;
  background: rgba(227,179,65,.07); border: 1px solid rgba(227,179,65,.2);
}
.welcome-config-btn {
  font-size: 11px; padding: 2px 10px; border-radius: 4px; cursor: pointer;
  background: rgba(88,166,255,.1); border: 1px solid rgba(88,166,255,.3);
  color: #58a6ff; transition: all .15s;
}
.welcome-config-btn:hover { background: rgba(88,166,255,.2); }
.welcome-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 6px; }
.hint-chip {
  font-size: 11px; padding: 5px 12px; border-radius: 14px; cursor: pointer;
  background: rgba(88,166,255,.07); border: 1px solid rgba(88,166,255,.18);
  color: #58a6ff; transition: all .15s; font-family: 'JetBrains Mono', monospace;
}
.hint-chip:hover { background: rgba(88,166,255,.15); border-color: rgba(88,166,255,.4); }

/* 消息泡泡 */
.message-wrap { display: flex; flex-direction: column; gap: 4px; max-width: 80%; }
.message-wrap.user      { align-self: flex-end;   align-items: flex-end; }
.message-wrap.assistant { align-self: flex-start; align-items: flex-start; }

.bubble { padding: 10px 14px; border-radius: 10px; font-size: 13px; line-height: 1.65; word-break: break-word; }
.bubble.user {
  background: rgba(88,166,255,.12); border: 1px solid rgba(88,166,255,.25);
  color: #e6edf3; border-bottom-right-radius: 3px;
}
.bubble.assistant {
  background: #161b22; border: 1px solid #21262d;
  color: #c9d1d9; border-bottom-left-radius: 3px;
}

.bubble-content { display: flex; flex-direction: column; gap: 8px; }
.text-part { white-space: pre-wrap; display: block; }

.artifact { border-radius: 7px; overflow: hidden; border: 1px solid #30363d; background: #0d1117; }
.artifact-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 10px; background: #161b22; border-bottom: 1px solid #21262d;
}
.artifact-lang {
  font-size: 10px; color: #58a6ff;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase; letter-spacing: .06em;
}
.artifact-copy {
  font-size: 10px; padding: 1px 8px; border-radius: 3px; cursor: pointer;
  background: rgba(88,166,255,.08); border: 1px solid rgba(88,166,255,.2);
  color: #58a6ff; font-family: 'JetBrains Mono', monospace; transition: all .15s;
}
.artifact-copy:hover { background: rgba(88,166,255,.18); }
.artifact-pre {
  margin: 0; padding: 10px 12px; font-size: 12px; line-height: 1.6;
  color: #c9d1d9; overflow-x: auto; font-family: 'JetBrains Mono', monospace;
}

.stream-cursor { color: #58a6ff; animation: blink-cursor .6s step-end infinite; }
@keyframes blink-cursor { 0%,100%{opacity:1;}50%{opacity:0;} }

.bubble-error {
  font-size: 11px; color: #f85149; margin-top: 4px;
  padding: 4px 8px; border-radius: 4px;
  background: rgba(248,81,73,.07); border: 1px solid rgba(248,81,73,.2);
}
.msg-meta { font-size: 10px; color: #484f58; padding: 0 4px; }

/* ── 输入区 ────────────────────────────────────────────────────────────────── */
.input-area {
  flex-shrink: 0; padding: 12px 16px;
  border-top: 1px solid #21262d;
  display: flex; flex-direction: column; gap: 6px;
}
.input-wrap {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 8px 10px; border-radius: 8px;
  background: #161b22; border: 1px solid #30363d; transition: border-color .2s;
}
.input-wrap--active  { border-color: rgba(88,166,255,.4); }
.input-wrap:focus-within { border-color: rgba(88,166,255,.5); }

.chat-input {
  flex: 1; background: transparent; border: none; outline: none; resize: none;
  font-size: 13px; color: #e6edf3; line-height: 1.5;
  font-family: inherit; max-height: 160px; min-height: 22px;
}
.chat-input::placeholder { color: #484f58; }
.chat-input:disabled { opacity: .5; cursor: not-allowed; }

.input-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.input-hint { font-size: 10px; color: #30363d; font-family: 'JetBrains Mono', monospace; }

.send-btn {
  width: 30px; height: 30px; border-radius: 6px; cursor: not-allowed;
  background: #21262d; border: 1px solid #30363d; color: #484f58;
  font-size: 13px; transition: all .2s;
  display: flex; align-items: center; justify-content: center;
}
.send-btn--active { cursor: pointer; background: rgba(88,166,255,.15); border-color: rgba(88,166,255,.4); color: #58a6ff; }
.send-btn--active:hover { background: rgba(88,166,255,.25); box-shadow: 0 0 10px rgba(88,166,255,.2); }
.send-loading { color: #58a6ff; animation: shimmer 1s ease-in-out infinite; }
@keyframes shimmer { 0%,100%{opacity:1;}50%{opacity:.4;} }
.stream-error { font-size: 11px; color: #f85149; font-family: 'JetBrains Mono', monospace; }

/* ── 设置弹窗 ──────────────────────────────────────────────────────────────── */
.settings-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.settings-modal {
  width: 420px; max-width: calc(100vw - 2rem);
  background: #161b22; border: 1px solid #30363d;
  border-radius: 10px; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
}
.settings-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #21262d;
}
.settings-title { font-size: 14px; font-weight: 700; color: #e6edf3; }
.settings-close {
  width: 24px; height: 24px; border-radius: 4px; cursor: pointer;
  background: transparent; border: 1px solid transparent;
  color: #7d8590; font-size: 16px; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.settings-close:hover { color: #e6edf3; border-color: #30363d; background: #21262d; }

.settings-body {
  padding: 18px; display: flex; flex-direction: column; gap: 16px;
}
.settings-field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 11px; font-weight: 700; color: #7d8590; text-transform: uppercase; letter-spacing: .06em; }
.field-input {
  padding: 8px 10px; border-radius: 6px; outline: none;
  background: #0d1117; border: 1px solid #30363d; color: #e6edf3;
  font-size: 13px; font-family: 'JetBrains Mono', monospace;
  transition: border-color .15s;
}
.field-input:focus { border-color: rgba(88,166,255,.5); }
.field-hint { font-size: 11px; color: #484f58; }

.settings-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; border-top: 1px solid #21262d;
}
.btn-cancel {
  padding: 6px 16px; border-radius: 5px; cursor: pointer;
  background: transparent; border: 1px solid #30363d; color: #7d8590;
  font-size: 12px; transition: all .15s;
}
.btn-cancel:hover { color: #c9d1d9; border-color: #484f58; }
.btn-save {
  padding: 6px 16px; border-radius: 5px; cursor: pointer;
  background: rgba(88,166,255,.15); border: 1px solid rgba(88,166,255,.4);
  color: #58a6ff; font-size: 12px; font-weight: 600; transition: all .15s;
}
.btn-save:hover { background: rgba(88,166,255,.25); border-color: #58a6ff; }

/* ── 响应式 ────────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .ai-sidebar { display: none; }
  .message-wrap { max-width: 95%; }
  .input-hint { display: none; }
}
</style>
