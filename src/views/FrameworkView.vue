<template>
  <div class="framework-view animate-fade-in">

    <!-- 模块头部 -->
    <div class="module-header">
      <div class="mh-left">
        <div class="mh-badge">Module A</div>
        <div>
          <div class="mh-title">PF.AutoFramework</div>
          <div class="mh-sub">工业自动化软件框架 · Developer Hub</div>
        </div>
      </div>
      <div class="mh-right">
        <div class="mh-status-dot" :class="nugetOnline ? 'online' : 'offline'"></div>
        <span class="mh-status-text">{{ nugetOnline ? 'BaGet 在线' : 'BaGet 离线' }}</span>
        <div class="mh-tags">
          <span class="mh-tag">C#</span>
          <span class="mh-tag cyan">.NET 8</span>
          <span class="mh-tag cyan">WPF</span>
          <span class="mh-tag purple">Prism</span>
        </div>
      </div>
    </div>

    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="handleTabClick(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      <KeepAlive>
        <NuGetDashboard
          v-if="activeTab === 'nuget'"
          key="nuget"
          @status-change="nugetOnline = $event"
        />
        <GitHubPulse
          v-else-if="activeTab === 'pulse'"
          key="pulse"
        />
        <ReleasePanel
          v-else-if="activeTab === 'release'"
          key="release"
        />
        <ProtocolLab
          v-else-if="activeTab === 'protocol'"
          key="protocol"
        />
      </KeepAlive>

      <!-- 知识库系统 Tab：状态卡 + 文件管理器，双栏布局 -->
      <div
        v-if="activeTab === 'kb'"
        key="kb"
        class="kb-panel"
      >
        <!-- 区块标题 -->
        <div class="kb-section-title">
          <span class="kb-section-icon">◎</span>
          系统核心状态
        </div>
        <PFSystemStatus :ws-connected="pfWsConnected" />

        <div class="kb-divider" />

        <div class="kb-section-title">
          <span class="kb-section-icon">◫</span>
          知识库文件管理
        </div>
        <PFFileManager />
      </div>

      <!-- 监控终端 Tab：全宽日志控制台 -->
      <div
        v-if="activeTab === 'monitor'"
        key="monitor"
        class="kb-panel"
      >
        <div class="kb-section-title">
          <span class="kb-section-icon">▣</span>
          实时监控终端
        </div>
        <PFMonitorConsole @connection-change="onPfConnectionChange" />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NuGetDashboard   from '@/components/framework/NuGetDashboard.vue'
import GitHubPulse      from '@/components/framework/GitHubPulse.vue'
import ReleasePanel     from '@/components/framework/ReleasePanel.vue'
import ProtocolLab      from '@/components/framework/ProtocolLab.vue'
import PFSystemStatus   from '@/components/framework/PFSystemStatus.vue'
import PFFileManager    from '@/components/framework/PFFileManager.vue'
import PFMonitorConsole from '@/components/framework/PFMonitorConsole.vue'

interface Tab {
  id: string
  icon: string
  label: string
  badge?: string
}

const tabs: Tab[] = [
  { id: 'nuget',    icon: '◈', label: 'NuGet 看板' },
  { id: 'pulse',    icon: '⚡', label: '实时动态' },
  { id: 'release',  icon: '◫', label: 'Release 下载' },
  { id: 'protocol', icon: '⬡', label: '协议实验室', badge: 'WIP' },
  { id: 'kb',       icon: '◎', label: '知识库系统' },
  { id: 'monitor',  icon: '▣', label: '监控终端' },
]

const activeTab   = ref('nuget')
const nugetOnline = ref(false)

// PFMonitorConsole 上报的 WS 连接状态，透传给 PFSystemStatus
const pfWsConnected = ref(false)

function onPfConnectionChange(connected: boolean) {
  pfWsConnected.value = connected
}

// 知识库 Tab 激活时记录，用于懒加载语义（KeepAlive 已缓存，此处备用）
const kbEverActivated      = ref(false)
const monitorEverActivated = ref(false)

function handleTabClick(id: string) {
  activeTab.value = id
  if (id === 'kb')      kbEverActivated.value      = true
  if (id === 'monitor') monitorEverActivated.value = true
}
</script>

<style scoped>
.framework-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── 模块头部 ────────────────────────────── */
.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  border-top: 2px solid rgba(57, 211, 83, 0.4);
}

.mh-left { display: flex; align-items: center; gap: 12px; }
.mh-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 4px;
  background: rgba(57, 211, 83, 0.1); border: 1px solid rgba(57, 211, 83, 0.25);
  color: #39d353; letter-spacing: .08em; text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
}
.mh-title {
  font-size: 17px; font-weight: 800; color: #e6edf3; letter-spacing: .02em;
}
.mh-sub { font-size: 11px; color: #484f58; margin-top: 2px; }

.mh-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mh-status-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.mh-status-dot.online  { background: #39d353; box-shadow: 0 0 6px rgba(57,211,83,.7); }
.mh-status-dot.offline { background: #484f58; }
.mh-status-text { font-size: 11px; color: #7d8590; }
.mh-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.mh-tag {
  font-size: 10px; padding: 1px 7px; border-radius: 3px;
  background: rgba(57,211,83,.08); border: 1px solid rgba(57,211,83,.2);
  color: #39d353; text-transform: uppercase; letter-spacing: .05em;
}
.mh-tag.cyan   { background: rgba(88,166,255,.08); border-color: rgba(88,166,255,.2); color: #58a6ff; }
.mh-tag.purple { background: rgba(188,140,255,.08); border-color: rgba(188,140,255,.2); color: #bc8cff; }

/* ── Tab 导航 ────────────────────────────── */
.tab-nav {
  display: flex;
  gap: 4px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 6px;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 5px;
  background: transparent;
  border: 1px solid transparent;
  color: #7d8590;
  font-size: 12px;
  cursor: pointer;
  transition: all .2s;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}
.tab-btn:hover {
  color: #c9d1d9;
  background: rgba(255,255,255,.04);
}
.tab-btn.active {
  color: #39d353;
  background: rgba(57,211,83,.08);
  border-color: rgba(57,211,83,.25);
}

.tab-icon { font-size: 12px; }
.tab-label { font-size: 12px; }
.tab-badge {
  font-size: 9px; padding: 0 5px; border-radius: 3px;
  background: rgba(227,179,65,.12); border: 1px solid rgba(227,179,65,.3);
  color: #e3b341;
}

/* ── Tab 内容 ────────────────────────────── */
.tab-content {
  min-height: 400px;
}

/* ── 知识库 / 监控终端 面板容器 ────────────── */
.kb-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.kb-section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 600;
  color: #7d8590;
  text-transform: uppercase;
  letter-spacing: .08em;
  font-family: 'JetBrains Mono', monospace;
}

.kb-section-icon {
  color: #39d353;
  font-size: 12px;
}

.kb-divider {
  height: 1px;
  background: #21262d;
  margin: 2px 0;
}
</style>
