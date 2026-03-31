<template>
  <aside class="sidebar">
    <!-- Logo / Identity -->
    <div class="sidebar-logo">
      <div class="logo-avatar">G</div>
      <div class="logo-info">
        <div class="logo-name">葛大大</div>
        <div class="logo-sub">Ethen Ge</div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div class="nav-section-label">Navigation</div>
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <div class="nav-text">
          <span class="nav-label">{{ item.label }}</span>
          <span class="nav-label-cn">{{ item.labelCN }}</span>
        </div>
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
      </RouterLink>
    </nav>

    <!-- Spacer -->
    <div class="sidebar-spacer"></div>

    <!-- Footer status -->
    <div class="sidebar-footer">
      <div class="footer-row">
        <span class="status-dot online"></span>
        <span class="footer-text">System Online</span>
      </div>
      <div class="footer-row mt-1">
        <span class="footer-ver">v0.2.0</span>
        <span class="footer-time">{{ currentTime }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import type { NavItem } from '@/types'

const route = useRoute()
const currentTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    labelCN: '主控台',
    path: '/dashboard',
    icon: '⊞',
    description: 'Personal dashboard and overview',
  },
  {
    id: 'framework',
    label: 'PF.AutoFramework',
    labelCN: '工业框架',
    path: '/framework',
    icon: '◈',
    description: 'Industrial automation framework',
    badge: 'WIP',
  },
  {
    id: 'ai-toolbox',
    label: 'AI Toolbox',
    labelCN: 'AI 百宝箱',
    path: '/ai-toolbox',
    icon: '✦',
    description: 'Multi-model AI tools',
  },
  {
    id: 'garage',
    label: 'Digital Garage',
    labelCN: '数字车库',
    path: '/garage',
    icon: '◎',
    description: 'Kawasaki H2 showcase',
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
.sidebar {
  width: 220px;
  flex-shrink: 0;
  height: 100vh;
  background: #0d1117;
  border-right: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
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
}
.logo-name {
  font-size: 14px;
  font-weight: 700;
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.logo-sub {
  font-size: 11px;
  color: #7d8590;
  margin-top: 1px;
}

/* Nav */
.sidebar-nav {
  padding: 12px 8px;
  flex: 1;
}

.nav-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #484f58;
  padding: 0 8px 8px;
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
.nav-item.active .nav-icon {
  color: #39d353;
}

.nav-icon {
  font-size: 14px;
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

/* Spacer */
.sidebar-spacer { flex: 1; }

/* Footer */
.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid #21262d;
  flex-shrink: 0;
}
.footer-row {
  display: flex;
  align-items: center;
  gap: 6px;
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
</style>
