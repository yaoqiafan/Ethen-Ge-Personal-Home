<template>
  <aside
    class="sidebar"
    :class="{
      'sidebar--collapsed': isCollapsed,
      'sidebar--mobile-open': isMobileOpen,
    }"
  >
    <!-- Logo / Identity -->
    <div class="sidebar-logo">
      <div class="logo-avatar">G</div>
      <Transition name="label-fade">
        <div v-if="!isCollapsed" class="logo-info">
          <div class="logo-name">葛大大</div>
          <div class="logo-sub">Ethen Ge</div>
        </div>
      </Transition>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <Transition name="label-fade">
        <div v-if="!isCollapsed" class="nav-section-label">导航</div>
      </Transition>

      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :title="isCollapsed ? item.label : undefined"
        @click="$emit('close-mobile')"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <Transition name="label-fade">
          <div v-if="!isCollapsed" class="nav-text">
            <span class="nav-label">{{ item.label }}</span>
            <span class="nav-label-cn">{{ item.labelCN }}</span>
          </div>
        </Transition>
        <Transition name="label-fade">
          <span v-if="item.badge && !isCollapsed" class="nav-badge">{{ item.badge }}</span>
        </Transition>
      </RouterLink>
    </nav>

    <!-- Spacer -->
    <div class="sidebar-spacer"></div>

    <!-- Footer status -->
    <div class="sidebar-footer">
      <Transition name="label-fade">
        <div v-if="!isCollapsed" class="footer-status-row">
          <span class="status-dot online"></span>
          <span class="footer-text">系统运行中</span>
        </div>
      </Transition>
      <Transition name="label-fade">
        <div v-if="!isCollapsed" class="footer-ver-row">
          <span class="footer-ver">v0.2.0</span>
          <span class="footer-time">{{ currentTime }}</span>
        </div>
      </Transition>
      <!-- 折叠时仅显示状态点 -->
      <div v-if="isCollapsed" class="collapsed-status">
        <span class="status-dot online" title="系统运行中"></span>
      </div>
    </div>

    <!-- 折叠/展开按钮（桌面端） -->
    <button
      class="collapse-btn"
      :title="isCollapsed ? '展开侧边栏' : '折叠侧边栏'"
      @click="$emit('toggle-collapse')"
    >
      <span class="collapse-icon">{{ isCollapsed ? '›' : '‹' }}</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import type { NavItem } from '@/types'

defineProps<{
  isCollapsed: boolean
  isMobileOpen: boolean
}>()

defineEmits<{
  (e: 'toggle-collapse'): void
  (e: 'close-mobile'): void
}>()

const route = useRoute()
const currentTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '控制台',
    labelCN: '主控台',
    path: '/dashboard',
    icon: '⊞',
    description: '个人仪表盘与概览',
  },
  {
    id: 'framework',
    label: 'PF.AutoFramework',
    labelCN: '工业框架',
    path: '/framework',
    icon: '◈',
    description: '工业自动化框架',
    badge: 'WIP',
  },
  {
    id: 'ai-toolbox',
    label: 'AI Toolbox',
    labelCN: 'AI 百宝箱',
    path: '/ai-toolbox',
    icon: '✦',
    description: '多模型 AI 工具箱',
  },
  {
    id: 'garage',
    label: '数字车库',
    labelCN: 'Digital Garage',
    path: '/garage',
    icon: '◎',
    description: 'Kawasaki H2 展厅',
  },
  {
    id: 'kitchen',
    label: '家庭厨房',
    labelCN: 'Family Kitchen',
    path: '/kitchen',
    icon: '🍳',
    description: '今日家常菜单',
  },
  {
    id: 'game-room',
    label: '游戏室',
    labelCN: 'Game Room',
    path: '/game-room',
    icon: '⌘',
    description: '经典小游戏 · 排行榜',
  },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
/* ── 侧边栏基础 ──────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  height: 100vh;
  background: rgba(13, 17, 23, 0.40); 
  border-right: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 50;
}

/* 折叠态：只留图标宽度 */
.sidebar--collapsed {
  width: 56px;
}

/* ── 移动端：默认隐藏，以抽屉形式弹出 ──── */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 220px !important; /* 移动端始终展开宽度 */
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
  }
  .sidebar--mobile-open {
    transform: translateX(0);
  }
  /* 移动端隐藏折叠按钮 */
  .collapse-btn {
    display: none;
  }
}

/* ── Logo ───────────────────────────────── */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 10px;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
  overflow: hidden;
  min-height: 60px;
}

.logo-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(57, 211, 83, 0.1);
  border: 1px solid rgba(57, 211, 83, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #39d353;
  text-shadow: 0 0 8px rgba(57, 211, 83, 0.6);
  flex-shrink: 0;
}

.logo-info {
  min-width: 0;
  overflow: hidden;
}
.logo-name {
  font-size: 14px;
  font-weight: 700;
  color: #e6edf3;
  white-space: nowrap;
}
.logo-sub {
  font-size: 11px;
  color: #7d8590;
  margin-top: 1px;
  white-space: nowrap;
}

/* ── Nav ────────────────────────────────── */
.sidebar-nav {
  padding: 10px 6px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #484f58;
  padding: 0 8px 8px;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
  color: #7d8590;
  border-left: 2px solid transparent;
  transition: all 0.15s ease;
  margin-bottom: 2px;
  overflow: hidden;
  white-space: nowrap;
}
.nav-item:hover {
  background: #161b22;
  color: #c9d1d9;
  border-left-color: #30363d;
}
.nav-item.active {
  background: rgba(57, 211, 83, 0.07);
  color: #39d353;
  border-left-color: #39d353;
}

/* 折叠时菜单项居中 */
.sidebar--collapsed .nav-item {
  padding: 10px;
  justify-content: center;
}

.nav-icon {
  font-size: 15px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
  color: inherit;
}
.nav-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.nav-label {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.02em;
}
.nav-label-cn {
  font-size: 10px;
  color: #484f58;
  margin-top: 1px;
}
.nav-item.active .nav-label-cn {
  color: rgba(57, 211, 83, 0.5);
}
.nav-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(227, 179, 65, 0.12);
  border: 1px solid rgba(227, 179, 65, 0.3);
  color: #e3b341;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

/* ── Footer ─────────────────────────────── */
.sidebar-spacer { flex: 1; }

.sidebar-footer {
  padding: 10px 12px;
  border-top: 1px solid #21262d;
  flex-shrink: 0;
  overflow: hidden;
}

.footer-status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.footer-ver-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.footer-text {
  font-size: 11px;
  color: #7d8590;
}
.footer-ver {
  font-size: 11px;
  color: #484f58;
}
.footer-time {
  font-size: 11px;
  color: #484f58;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.collapsed-status {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.online {
  background: #39d353;
  box-shadow: 0 0 5px rgba(57, 211, 83, 0.8);
}

/* ── 折叠按钮 ───────────────────────────── */
.collapse-btn {
  position: absolute;
  bottom: 80px;
  right: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #161b22;
  border: 1px solid #30363d;
  color: #7d8590;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}
.collapse-btn:hover {
  background: #21262d;
  border-color: #39d353;
  color: #39d353;
  box-shadow: 0 0 8px rgba(57, 211, 83, 0.3);
}
.collapse-icon {
  display: block;
  font-weight: 700;
  margin-top: -1px;
}

/* ── 文字淡入淡出过渡 ───────────────────── */
.label-fade-enter-active {
  transition: opacity 0.2s ease 0.1s, transform 0.2s ease 0.1s;
}
.label-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.label-fade-enter-from {
  opacity: 0;
  transform: translateX(-6px);
}
.label-fade-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
</style>
