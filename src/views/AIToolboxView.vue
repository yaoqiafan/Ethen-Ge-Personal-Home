<template>
  <div class="ai-toolbox animate-fade-in">

    <!-- ── 左侧边栏：管理监控区 ──────────────────────────────────────────── -->
    <aside class="ai-sidebar">

      <!-- 节点状态 -->
      <section class="sb-section">
        <div class="sb-section-title">
          <span class="sb-dot cyan"></span>活跃节点
          <span class="sb-count">{{ onlineNodeCount }}/{{ nodes.length }}</span>
        </div>
        <div v-if="statusLoading" class="sb-skeleton-list">
          <div v-for="i in 3" :key="i" class="sb-skel"></div>
        </div>
        <div v-else-if="nodes.length" class="sb-node-list">
          <div v-for="node in nodes" :key="node.id" class="sb-node">
            <span class="node-status-dot" :class="node.status"></span>
            <span class="sb-node-name">{{ node.name }}</span>
            <span class="sb-node-region">{{ node.region ?? '—' }}</span>
          </div>
        </div>
        <div v-else class="sb-empty">暂无节点数据</div>
      </section>

      <!-- 当前会话 -->
      <section class="sb-section">
        <div class="sb-section-title">
          <span class="sb-dot green"></span>当前会话
          <span class="sb-count">{{ sessionCount }}</span>
        </div>
        <div class="sb-session-bar">
          <div class="session-fill" :style="{ width: `${Math.min(100, sessionCount * 10)}%` }"></div>
        </div>
        <div class="sb-session-label">{{ sessionCount }} 个活跃会话</div>
      </section>

      <!-- 高危审批拦截区 -->
      <section class="sb-section approval-zone" :class="{ 'approval-zone--active': pendingApproval }">
        <div class="sb-section-title">
          <span class="sb-dot" :class="pendingApproval ? 'red pulse' : 'dim'"></span>
          审批拦截
          <span v-if="pendingApproval" class="approval-badge">需处理</span>
        </div>
        <div v-if="!pendingApproval" class="sb-empty">无待处理请求</div>
        <div v-else class="approval-card">
          <div class="approval-risk" :class="`risk-${pendingApproval.risk}`">
            {{ riskLabel[pendingApproval.risk] }}
          </div>
          <div class="approval-desc">{{ pendingApproval.description }}</div>
          <div class="approval-time">{{ formatTime(pendingApproval.timestamp) }}</div>
          <div class="approval-actions">
            <button class="btn-deny"  :disabled="approving" @click="handleApproval('deny')">
              {{ approving ? '…' : '拒绝' }}
            </button>
            <button class="btn-allow" :disabled="approving" @click="handleApproval('allow')">
              {{ approving ? '…' : '允许' }}
            </button>
          </div>
        </div>
      </section>

    </aside>

    <!-- ── 右侧主区：对话交互 ──────────────────────────────────────────────── -->
    <main class="ai-main">

      <!-- 对话头部：模型选择器 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <span class="chat-icon">◈</span>
          <span class="chat-title">AI 对话</span>
        </div>
        <div class="chat-header-right">
          <select v-model="selectedModel" class="model-select" :disabled="modelsLoading">
            <option v-if="modelsLoading" value="">加载模型…</option>
            <option v-for="m in models" :key="m.id" :value="m.id" :disabled="!m.online">
              {{ m.name }} ({{ m.provider }}){{ m.online ? '' : ' — 离线' }}
            </option>
          </select>
          <button class="btn-clear" title="清空对话" @click="clearMessages">⊘</button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="messagesRef" class="messages-area">

        <!-- 欢迎占位 -->
        <div v-if="!messages.length" class="welcome-state">
          <div class="welcome-icon">◈</div>
          <div class="welcome-title">AI 百宝箱</div>
          <div class="welcome-sub">选择模型，开始对话</div>
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
        <div
          v-for="msg in messages"
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
                      {{ copiedArtifact === part.content ? '已复制 ✓' : '复制' }}
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
            {{ msg.role === 'user' ? '你' : selectedModelName }}
            · {{ formatTime(msg.timestamp.toISOString()) }}
          </div>
        </div>

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
            :disabled="isStreaming"
            @keydown.ctrl.enter.prevent="sendMessage"
            @input="autoResize"
          />
          <div class="input-actions">
            <span class="input-hint">Ctrl+Enter</span>
            <button
              class="send-btn"
              :class="{ 'send-btn--active': inputText.trim() && !isStreaming }"
              :disabled="!inputText.trim() || isStreaming"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  getModels, getSystemStatus, chatStream, resolveApproval, getPendingApprovals,
} from '@/services/aiService'
import type { AIModel, NodeInfo, ApprovalRequest, ChatMessage } from '@/services/aiService'

// ── 内部类型 ──────────────────────────────────────────────────────────────
interface ContentPart { type: 'text' | 'code'; content: string; language?: string }
interface ChatBubble {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming: boolean
  timestamp: Date
  error?: string
}

// ── 快捷提示词 ─────────────────────────────────────────────────────────────
const HINT_PROMPTS = [
  '用 C# 写一个 Modbus TCP 读取示例',
  '解释 SECS/GEM 协议的握手流程',
  '帮我分析这段 PLC 梯形图逻辑',
  '生成一份工业设备数据采集方案',
]

// ── 响应式状态 ─────────────────────────────────────────────────────────────
const models        = ref<AIModel[]>([])
const modelsLoading = ref(true)
const selectedModel = ref('')

const nodes         = ref<NodeInfo[]>([])
const sessionCount  = ref(0)
const statusLoading = ref(true)

const pendingApproval = ref<ApprovalRequest | null>(null)
const approving       = ref(false)

const messages       = ref<ChatBubble[]>([])
const inputText      = ref('')
const isStreaming    = ref(false)
const streamError    = ref('')
const copiedArtifact = ref('')

const messagesRef = ref<HTMLDivElement | null>(null)
const inputRef    = ref<HTMLTextAreaElement | null>(null)

let abortStream: (() => void) | null = null
let pollTimer:   ReturnType<typeof setInterval> | null = null

// ── 计算属性 ───────────────────────────────────────────────────────────────
const onlineNodeCount = computed(() =>
  nodes.value.filter(n => n.status === 'online').length
)
const selectedModelName = computed(
  () => models.value.find(m => m.id === selectedModel.value)?.name ?? 'AI'
)

const riskLabel: Record<ApprovalRequest['risk'], string> = {
  low: '低风险', medium: '中风险', high: '高危', critical: '极危',
}

// ── 内容解析：文本 + 代码 Artifact ─────────────────────────────────────────
function parsedContent(text: string): ContentPart[] {
  const parts: ContentPart[] = []
  const regex = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    parts.push({ type: 'code', language: m[1] || undefined, content: m[2].trimEnd() })
    last = regex.lastIndex
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', content: text }]
}

// ── 发送消息 ───────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  streamError.value = ''
  inputText.value   = ''
  resetInputHeight()

  messages.value.push({
    id: `u-${Date.now()}`, role: 'user',
    content: text, streaming: false, timestamp: new Date(),
  })

  const aiMsg: ChatBubble = {
    id: `a-${Date.now()}`, role: 'assistant',
    content: '', streaming: true, timestamp: new Date(),
  }
  messages.value.push(aiMsg)
  isStreaming.value = true
  await scrollToBottom()

  const history: ChatMessage[] = messages.value
    .filter(m => !m.streaming && m.id !== aiMsg.id)
    .map(m => ({ role: m.role, content: m.content }))

  abortStream = chatStream(
    history,
    selectedModel.value,
    (chunk) => { aiMsg.content += chunk; scrollToBottom() },
    () => { aiMsg.streaming = false; isStreaming.value = false; abortStream = null; scrollToBottom() },
    (err) => {
      aiMsg.streaming   = false
      aiMsg.error       = err.message
      isStreaming.value = false
      streamError.value = err.message
      abortStream       = null
    },
  )
}

function clearMessages() {
  if (isStreaming.value) { abortStream?.(); isStreaming.value = false }
  messages.value    = []
  streamError.value = ''
}

function useHint(hint: string) {
  inputText.value = hint
  inputRef.value?.focus()
}

// ── 审批处理 ───────────────────────────────────────────────────────────────
async function handleApproval(decision: 'allow' | 'deny') {
  if (!pendingApproval.value) return
  approving.value = true
  try {
    await resolveApproval(pendingApproval.value.requestId, decision)
    pendingApproval.value = null
  } catch (e) {
    streamError.value = e instanceof Error ? e.message : '审批请求失败'
  } finally {
    approving.value = false
  }
}

async function pollApprovals() {
  try {
    const list = await getPendingApprovals()
    pendingApproval.value = list[0] ?? null
  } catch { /* 静默失败 */ }
}

// ── UI 辅助 ────────────────────────────────────────────────────────────────
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

async function copyCode(code: string) {
  try { await navigator.clipboard.writeText(code) } catch { /* ignore */ }
  copiedArtifact.value = code
  setTimeout(() => { copiedArtifact.value = '' }, 2000)
}

// ── 初始化 & 清理 ──────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.allSettled([
    getModels().then(m => {
      models.value        = m
      selectedModel.value = m.find(x => x.online)?.id ?? m[0]?.id ?? ''
    }).finally(() => { modelsLoading.value = false }),

    getSystemStatus().then(s => {
      nodes.value        = s.nodes
      sessionCount.value = s.sessionCount
    }).finally(() => { statusLoading.value = false }),
  ])

  pollApprovals()
  pollTimer = setInterval(pollApprovals, 8000)
})

onUnmounted(() => {
  abortStream?.()
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
/* ── 整体布局 ─────────────────────────────────────────────────────────────── */
.ai-toolbox {
  display: flex;
  gap: 0;
  margin: -1.5rem;
  width: calc(100% + 3rem);
  height: calc(100vh - 120px);
  overflow: hidden;
}

/* ── 左侧边栏 ─────────────────────────────────────────────────────────────── */
.ai-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #21262d;
  background: #0d1117;
  overflow-y: auto;
}

.sb-section {
  padding: 14px;
  border-bottom: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sb-section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  color: #7d8590;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-family: 'JetBrains Mono', monospace;
}
.sb-count { margin-left: auto; font-size: 10px; color: #484f58; font-variant-numeric: tabular-nums; }

.sb-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.sb-dot.cyan  { background: #58a6ff; box-shadow: 0 0 4px rgba(88,166,255,.7); }
.sb-dot.green { background: #39d353; box-shadow: 0 0 4px rgba(57,211,83,.7); }
.sb-dot.red   { background: #f85149; box-shadow: 0 0 4px rgba(248,81,73,.7); }
.sb-dot.dim   { background: #30363d; }
.sb-dot.pulse { animation: pulse-dot .9s ease-in-out infinite; }
@keyframes pulse-dot { 0%,100%{opacity:1;}50%{opacity:.3;} }

.sb-node-list { display: flex; flex-direction: column; gap: 2px; }
.sb-node {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 6px; border-radius: 4px;
  border: 1px solid transparent; transition: border-color .15s;
}
.sb-node:hover { border-color: #21262d; }
.node-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.node-status-dot.online   { background: #39d353; }
.node-status-dot.offline  { background: #484f58; }
.node-status-dot.degraded { background: #e3b341; }
.sb-node-name   { font-size: 11px; color: #c9d1d9; flex: 1; }
.sb-node-region { font-size: 10px; color: #484f58; }

.sb-session-bar { height: 3px; background: #21262d; border-radius: 2px; overflow: hidden; }
.session-fill {
  height: 100%;
  background: linear-gradient(90deg, #39d353, #58a6ff);
  transition: width .6s ease;
}
.sb-session-label { font-size: 11px; color: #484f58; }

.approval-zone { transition: background .3s; }
.approval-zone--active { background: rgba(248,81,73,.04); }
.approval-badge {
  margin-left: auto; font-size: 9px; padding: 1px 6px; border-radius: 3px;
  background: rgba(248,81,73,.15); border: 1px solid rgba(248,81,73,.3); color: #f85149;
  animation: pulse-dot .9s ease-in-out infinite;
}
.approval-card {
  display: flex; flex-direction: column; gap: 6px;
  padding: 8px; border-radius: 6px;
  background: rgba(248,81,73,.05); border: 1px solid rgba(248,81,73,.2);
}
.approval-risk {
  font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 3px;
  align-self: flex-start; font-family: 'JetBrains Mono', monospace;
}
.risk-low      { background: rgba(57,211,83,.1);   color: #39d353; }
.risk-medium   { background: rgba(227,179,65,.1);  color: #e3b341; }
.risk-high     { background: rgba(248,81,73,.1);   color: #f85149; }
.risk-critical { background: rgba(248,81,73,.2);   color: #ff6b6b; border: 1px solid rgba(248,81,73,.5); }
.approval-desc { font-size: 11px; color: #c9d1d9; line-height: 1.5; }
.approval-time { font-size: 10px; color: #484f58; }
.approval-actions { display: flex; gap: 6px; }
.btn-deny, .btn-allow {
  flex: 1; padding: 5px; border-radius: 5px; cursor: pointer;
  font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 700;
  transition: all .15s;
}
.btn-deny  { background: rgba(248,81,73,.1);  border: 1px solid rgba(248,81,73,.3);  color: #f85149; }
.btn-allow { background: rgba(57,211,83,.1);  border: 1px solid rgba(57,211,83,.3);  color: #39d353; }
.btn-deny:hover:not(:disabled)  { background: rgba(248,81,73,.22); }
.btn-allow:hover:not(:disabled) { background: rgba(57,211,83,.22); }
.btn-deny:disabled, .btn-allow:disabled { opacity: .5; cursor: not-allowed; }

.sb-skeleton-list { display: flex; flex-direction: column; gap: 4px; }
.sb-skel { height: 22px; border-radius: 4px; background: #21262d; animation: shimmer 1.4s ease-in-out infinite; }
@keyframes shimmer { 0%,100%{opacity:1;}50%{opacity:.4;} }
.sb-empty { font-size: 11px; color: #484f58; }

/* ── 右侧主区 ─────────────────────────────────────────────────────────────── */
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
.chat-header-left  { display: flex; align-items: center; gap: 8px; }
.chat-icon  { color: #58a6ff; font-size: 14px; }
.chat-title { font-size: 13px; font-weight: 700; color: #e6edf3; }
.chat-header-right { display: flex; align-items: center; gap: 8px; }

.model-select {
  font-size: 11px; padding: 4px 8px; border-radius: 5px;
  background: #161b22; border: 1px solid #30363d; color: #c9d1d9;
  font-family: 'JetBrains Mono', monospace; cursor: pointer; outline: none;
  transition: border-color .15s;
}
.model-select:hover, .model-select:focus { border-color: rgba(88,166,255,.4); }

.btn-clear {
  width: 28px; height: 28px; border-radius: 5px; cursor: pointer;
  background: transparent; border: 1px solid #21262d; color: #484f58;
  font-size: 14px; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.btn-clear:hover { color: #f85149; border-color: rgba(248,81,73,.3); }

.messages-area {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 16px;
  scroll-behavior: smooth;
}

.welcome-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; padding: 2rem;
}
.welcome-icon  { font-size: 32px; color: #58a6ff; opacity: .5; }
.welcome-title { font-size: 18px; font-weight: 800; color: #e6edf3; }
.welcome-sub   { font-size: 12px; color: #484f58; }
.welcome-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 6px; }
.hint-chip {
  font-size: 11px; padding: 5px 12px; border-radius: 14px; cursor: pointer;
  background: rgba(88,166,255,.07); border: 1px solid rgba(88,166,255,.18);
  color: #58a6ff; transition: all .15s; font-family: 'JetBrains Mono', monospace;
}
.hint-chip:hover { background: rgba(88,166,255,.15); border-color: rgba(88,166,255,.4); }

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
.stream-error { font-size: 11px; color: #f85149; font-family: 'JetBrains Mono', monospace; }

@media (max-width: 768px) {
  .ai-sidebar { display: none; }
  .message-wrap { max-width: 95%; }
  .input-hint { display: none; }
}
</style>
