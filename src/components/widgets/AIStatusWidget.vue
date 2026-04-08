<template>
  <div class="card ai-card">
    <div class="card-header">
      <span class="header-dot cyan"></span>
      模块 B — AI 百宝箱
    </div>

    <div class="ai-title">AI 对话助手</div>
    <div class="ai-subtitle">{{ providerName }} · OpenAI 兼容协议</div>

    <!-- 状态行 -->
    <div class="status-row">
      <div class="status-item">
        <span class="status-dot" :class="apiConfigured ? 'online' : 'offline'"></span>
        <span class="status-label">API Key</span>
        <span class="status-val" :class="apiConfigured ? 'val-ok' : 'val-warn'">
          {{ apiConfigured ? '已配置' : '未配置' }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-icon">◈</span>
        <span class="status-label">历史对话</span>
        <span class="status-val val-ok">{{ conversationCount }} 条</span>
      </div>
    </div>

    <!-- 最近对话 -->
    <div v-if="recentConversations.length" class="recent-list">
      <div v-for="conv in recentConversations" :key="conv.id" class="recent-item">
        <span class="recent-title">{{ conv.title }}</span>
        <span class="recent-meta">{{ formatRelative(conv.updatedAt) }}</span>
      </div>
    </div>
    <div v-else class="empty-state">暂无对话，快去新建一条吧</div>

    <div class="ai-footer">
      <RouterLink to="/ai-toolbox" class="btn-open">
        <span class="btn-icon">✦</span>
        打开 AI 百宝箱
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  loadConversations, getActiveConfig, getCurrentProviderId, PROVIDER_PRESETS,
} from '@/services/aiService'
import type { Conversation } from '@/services/aiService'

const conversations = ref<Conversation[]>([])
const providerId    = getCurrentProviderId()
const { apiKey }    = getActiveConfig()

const providerName = computed(() =>
  PROVIDER_PRESETS.find(p => p.id === providerId)?.name ?? '自定义'
)
const apiConfigured       = computed(() => !!apiKey)
const conversationCount   = computed(() => conversations.value.length)
const recentConversations = computed(() =>
  [...conversations.value]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
)

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)     return '刚刚'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return `${Math.floor(diff / 86_400_000)}天前`
}

onMounted(() => { conversations.value = loadConversations() })
</script>

<style scoped>
.ai-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
}
.header-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 50%;
  background: #58a6ff; box-shadow: 0 0 6px rgba(88,166,255,.7);
}
.ai-title    { font-size: 15px; font-weight: 700; color: #e6edf3; }
.ai-subtitle { font-size: 11px; color: #7d8590; margin-top: -0.5rem; }

.status-row { display: flex; flex-direction: column; gap: 5px; padding: 8px 10px; border-radius: 6px; background: rgba(255,255,255,.02); border: 1px solid #21262d; }
.status-item { display: flex; align-items: center; gap: 7px; }
.status-dot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online  { background: #39d353; box-shadow: 0 0 4px rgba(57,211,83,.7); }
.status-dot.offline { background: #484f58; }
.status-icon  { font-size: 10px; color: #58a6ff; width: 6px; text-align: center; flex-shrink: 0; }
.status-label { font-size: 11px; color: #7d8590; flex: 1; }
.status-val   { font-size: 11px; font-variant-numeric: tabular-nums; }
.val-ok   { color: #39d353; }
.val-warn { color: #e3b341; }

.recent-list { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow: hidden; }
.recent-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 7px; border-radius: 4px; border: 1px solid transparent; transition: all .15s;
}
.recent-item:hover { background: rgba(255,255,255,.03); border-color: #21262d; }
.recent-title {
  font-size: 11px; color: #c9d1d9; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.recent-meta { font-size: 10px; color: #484f58; flex-shrink: 0; margin-left: 8px; }
.empty-state { font-size: 11px; color: #484f58; text-align: center; padding: 1.5rem 0; flex: 1; }

.ai-footer { padding-top: 0.75rem; border-top: 1px solid #21262d; }
.btn-open {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 7px 12px; border-radius: 6px;
  font-size: 12px; font-weight: 600; text-decoration: none;
  background: rgba(88,166,255,.08); border: 1px solid rgba(88,166,255,.25);
  color: #58a6ff; transition: all .2s; font-family: 'JetBrains Mono', monospace;
}
.btn-open:hover { background: rgba(88,166,255,.15); border-color: #58a6ff; box-shadow: 0 0 12px rgba(88,166,255,.2); }
.btn-icon { font-size: 11px; }
</style>
