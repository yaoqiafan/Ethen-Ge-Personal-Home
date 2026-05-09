<template>
  <div class="unified-shell">
    <!-- ═══════════ Top Navigation Bar ═══════════ -->
    <header class="top-bar">
      <div class="top-bar-inner">
        <!-- Logo -->
        <router-link to="/" class="logo-group">
          <span class="logo-diamond">◆</span>
          <span class="logo-text">Stopless Lab</span>
          <span class="logo-sub">Ethen-OS</span>
        </router-link>

        <!-- Nav Links -->
        <nav class="nav-links">
          <router-link
            v-for="item in navItems"
            :key="item.id"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <span class="nav-link-icon">{{ item.icon }}</span>
            <span class="nav-link-label">{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- Right status -->
        <div class="top-bar-right">
          <span class="status-indicator">
            <span class="status-dot" />
            <span class="status-text">系统就绪</span>
          </span>
          <span class="top-time">{{ currentTime }}</span>
        </div>

        <!-- Mobile hamburger -->
        <button class="hamburger-btn" @click="mobileMenuOpen = !mobileMenuOpen">
          <span class="ham-line" />
          <span class="ham-line" />
          <span class="ham-line" />
        </button>
      </div>

      <!-- Mobile dropdown -->
      <Transition name="slide-down">
        <nav v-if="mobileMenuOpen" class="mobile-nav" @click="mobileMenuOpen = false">
          <router-link
            v-for="item in navItems"
            :key="item.id"
            :to="item.path"
            class="mobile-nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <span class="nav-link-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
      </Transition>
    </header>

    <!-- ═══════════ Main Content ═══════════ -->
    <main class="content-area">
      <RouterView v-slot="{ Component, route }">
        <Transition name="cyber" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

    <!-- ═══════════ Bottom Console Bar ═══════════ -->
    <footer class="bottom-console">
      <div class="console-inner">
        <!-- Output line (last command result) -->
        <div v-if="consoleOutput" class="console-output">{{ consoleOutput }}</div>

        <!-- Input row -->
        <div class="console-input-row">
          <span class="console-prompt">&gt;</span>
          <input
            ref="consoleInputRef"
            v-model="consoleInput"
            class="console-input"
            :placeholder="consolePlaceholder"
            @keydown.enter="executeCommand"
            @focus="onConsoleFocus"
            @blur="onConsoleBlur"
          />
          <span class="console-cursor" :class="{ focused: consoleFocused }">_</span>
        </div>

        <!-- Info row -->
        <div class="console-info">
          <span>{{ currentRouteLabel }}</span>
          <span class="console-info-sep">|</span>
          <span>{{ currentTime }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/* ═══════════ Navigation ═══════════ */
const navItems = [
  { id: 'dashboard',  label: '控制台',    path: '/dashboard',  icon: '⊞' },
  { id: 'framework',  label: '工业框架',  path: '/framework',  icon: '◈' },
  { id: 'ai-toolbox', label: 'AI 工具箱', path: '/ai-toolbox', icon: '✦' },
  { id: 'garage',     label: '数字车库',  path: '/garage',     icon: '◎' },
  { id: 'kitchen',    label: '家庭厨房',  path: '/kitchen',    icon: '🍳' },
  { id: 'game-room',  label: '游戏室',    path: '/game-room',  icon: '⌘' },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

/* ═══════════ Mobile menu ═══════════ */
const mobileMenuOpen = ref(false)

/* ═══════════ Clock ═══════════ */
const currentTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}
onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

/* ═══════════ Console ═══════════ */
const consoleInput = ref('')
const consoleOutput = ref('')
const consoleFocused = ref(false)
const consoleInputRef = ref<HTMLInputElement | null>(null)
const consolePlaceholder = ref('输入 help 查看可用指令...')

const currentRouteLabel = computed(() => {
  const item = navItems.find(n => isActive(n.path))
  return item ? `~/${item.id}` : '~/home'
})

function onConsoleFocus() { consoleFocused.value = true }
function onConsoleBlur() { consoleFocused.value = false }

const commands: Record<string, (args: string[]) => string> = {
  help: () =>
    '可用指令: help | goto <页面> | status | about | clear | neofetch\n' +
    '  goto dashboard  · 控制台\n' +
    '  goto framework  · 工业框架\n' +
    '  goto ai-toolbox · AI工具箱\n' +
    '  goto garage     · 数字车库\n' +
    '  goto kitchen    · 家庭厨房\n' +
    '  goto game-room  · 游戏室\n' +
    '  goto home       · 返回首页',

  goto: (args) => {
    const target = args[0]
    const map: Record<string, string> = {
      home: '/', dashboard: '/dashboard', framework: '/framework',
      'ai-toolbox': '/ai-toolbox', 'ai': '/ai-toolbox',
      garage: '/garage', kitchen: '/kitchen', 'game-room': '/game-room',
    }
    const path = map[target]
    if (path) {
      router.push(path)
      return `导航至 ${target}...`
    }
    return `未知目标: ${target}。可用: home, dashboard, framework, ai-toolbox, garage, kitchen, game-room`
  },

  status: () =>
    `Ethen-OS v0.2.0 | 系统运行正常\n` +
    `  Vue 3.5 + Three.js + Tailwind CSS\n` +
    `  PF.AutoFramework v0.3.0-alpha\n` +
    `  4 个 AI 模型在线 | ${new Date().toLocaleDateString('zh-CN')}`,

  about: () =>
    'Stopless Lab — 葛大大的数字车间\n' +
    '工业自动化 · AI 工程 · 数字生活\n' +
    'https://github.com/Ethen-Ge',

  clear: () => { consoleOutput.value = ''; return '' },

  neofetch: () =>
    `       ⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤\n` +
    `    ⣤⣤⠿⠛⠋⠉  ⠉⠙⠛⠿⣦⣤\n` +
    ` ⣤⡾⠋           ⠈⠻⣦   Ethen-OS v0.2.0\n` +
    `⣿⡇    ⣤⣤⣤⣤⣤    ⠈⠻   ──────────────\n` +
    `⠛⠿   ⠿⠛⠛⠛⠛⠛⠛⠿⠇    ⣤   OS: Web v18\n` +
    `⣷⣤    ⣤⣤⣤⣤⣤     ⣤   Shell: /bin/bash\n` +
    ` ⠙⠿⣦⣤        ⣤⣶⡾⠋    Kernel: Three.js r184\n` +
    `   ⠈⠛⠿⣦⣤⣤⡾⠿⠋       Uptime: ${Math.floor(performance.now() / 3600000)}h`,
}

function executeCommand() {
  const input = consoleInput.value.trim()
  if (!input) return
  consoleInput.value = ''

  const parts = input.split(/\s+/)
  const cmd = parts[0].toLowerCase()
  const args = parts.slice(1)

  const handler = commands[cmd]
  const result = handler ? handler(args) : `指令未识别: ${cmd}。输入 help 查看可用指令。`
  if (result) consoleOutput.value = result

  nextTick(() => {
    consoleInputRef.value?.focus()
  })
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   Shell
   ═══════════════════════════════════════════════ */
.unified-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  z-index: 5;
  pointer-events: none;
}
.unified-shell > * {
  pointer-events: auto;
}

/* ═══════════════════════════════════════════════
   Top Navigation Bar
   ═══════════════════════════════════════════════ */
.top-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(20, 20, 20, 0.35);
  border-bottom: 1px solid var(--glass-border);
  z-index: 10;
}

.top-bar-inner {
  display: flex;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.25rem;
  height: 52px;
  gap: 1rem;
}

/* Logo */
.logo-group {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
  padding: 4px 0;
}
.logo-diamond {
  font-size: 18px;
  color: #02AD8B;
  filter: drop-shadow(0 0 8px rgba(2, 173, 139, 0.5));
}
.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #e6edf3;
  letter-spacing: 0.03em;
}
.logo-sub {
  font-size: 10px;
  color: #484f58;
  padding: 1px 6px;
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  letter-spacing: 0.06em;
}

/* Nav Links */
.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  justify-content: center;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 12.5px;
  color: #7d8590;
  text-decoration: none;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.nav-link:hover {
  color: #e6edf3;
  background: rgba(255, 255, 255, 0.04);
}
.nav-link.active {
  color: #02AD8B;
  background: rgba(2, 173, 139, 0.08);
  box-shadow: 0 0 12px rgba(2, 173, 139, 0.08);
}
.nav-link-icon {
  font-size: 14px;
}
.nav-link-label {
  font-weight: 500;
}

/* Right side */
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.status-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #02AD8B;
  box-shadow: 0 0 6px rgba(2, 173, 139, 0.8);
  animation: statusPulse 2s ease-in-out infinite;
}
@keyframes statusPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(2, 173, 139, 0.6); }
  50% { box-shadow: 0 0 10px rgba(2, 173, 139, 1), 0 0 20px rgba(2, 173, 139, 0.4); }
}
.status-text {
  font-size: 11px;
  color: #484f58;
}
.top-time {
  font-size: 12px;
  color: #484f58;
  font-variant-numeric: tabular-nums;
}

/* Hamburger */
.hamburger-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  width: 32px;
  height: 32px;
  padding: 7px 6px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
}
.ham-line {
  display: block;
  width: 100%;
  height: 1.5px;
  background: #7d8590;
  border-radius: 1px;
}
.mobile-nav {
  display: none;
}
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ═══════════════════════════════════════════════
   Content Area
   ═══════════════════════════════════════════════ */
.content-area {
  flex: 1 0 auto;
  padding: 1.25rem;
  min-height: 0;
  /* Keep completely transparent — let 3D background show through */
}

/* ═══════════════════════════════════════════════
   Cyberpunk route transitions
   ═══════════════════════════════════════════════ */
.cyber-enter-active {
  transition: opacity 0.25s ease-out, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.cyber-leave-active {
  transition: opacity 0.15s ease-in, transform 0.2s ease-in;
}
.cyber-enter-from {
  opacity: 0.4;
  transform: translateY(8px) scale(0.99);
}
.cyber-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ═══════════════════════════════════════════════
   Bottom Console
   ═══════════════════════════════════════════════ */
.bottom-console {
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(20, 20, 20, 0.35);
  border-top: 1px solid var(--glass-border);
  z-index: 10;
}

.console-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px 1.25rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

/* Output */
.console-output {
  font-size: 11px;
  color: #7d8590;
  margin-bottom: 6px;
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
}

/* Input row */
.console-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.console-prompt {
  font-size: 13px;
  font-weight: 700;
  color: #02AD8B;
  text-shadow: 0 0 8px rgba(2, 173, 139, 0.5);
  flex-shrink: 0;
}
.console-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #c9d1d9;
  font-family: inherit;
  font-size: 12.5px;
  caret-color: transparent;
  min-width: 0;
}
.console-input::placeholder {
  color: #30363d;
}
.console-cursor {
  font-size: 13px;
  color: #484f58;
  animation: cursorBlink 1s step-end infinite;
}
.console-cursor.focused {
  color: #02AD8B;
  text-shadow: 0 0 6px rgba(2, 173, 139, 0.6);
}
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Info row */
.console-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 10px;
  color: #30363d;
}
.console-info-sep {
  color: #21262d;
}

/* ═══════════════════════════════════════════════
   Responsive
   ═══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .nav-links { display: none; }
  .hamburger-btn { display: flex; }
  .top-bar-right .status-indicator,
  .top-bar-right .top-time { display: none; }
  .content-area { padding: 0.75rem; }
}
@media (max-width: 640px) {
  .top-bar-inner { height: 44px; padding: 0 0.75rem; }
  .logo-sub { display: none; }
  .logo-text { font-size: 13px; }
  .content-area { padding: 0.5rem; }
  .console-inner { padding: 6px 0.75rem; }
  .console-input { font-size: 11px; }
  .console-output { font-size: 10px; max-height: 80px; }
  .console-info { font-size: 9px; }
  .bottom-console { border-top-width: 1px; }
  .mobile-nav {
    display: flex;
    flex-direction: column;
    padding: 8px 12px 12px;
    gap: 2px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background: rgba(20, 20, 20, 0.40);
    border-bottom: 1px solid var(--glass-border);
  }
  .mobile-nav-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 13px;
    color: #7d8590;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .mobile-nav-link:hover,
  .mobile-nav-link.active {
    color: #02AD8B;
    background: rgba(2, 173, 139, 0.06);
  }
}
@media (min-width: 641px) {
  .mobile-nav { display: none; }
}
</style>
