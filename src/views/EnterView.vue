<template>
  <div class="enter-3d">
    <!-- ═══════════════ Layer 0: 3D Cube Matrix Background ═══════════════ -->
    <CubeMatrixBackground />

    <!-- Layer 1 overlays now handled inside CubeMatrixBackground -->

    <!-- ═══════════════ Layer 2: Foreground UI ═══════════════ -->
    <div class="foreground">
      <!-- Header -->
      <header class="glass-header animate-fade-in-up" style="animation-delay: 0.1s">
        <div class="header-inner">
          <router-link to="/" class="logo-group">
            <span class="logo-icon">◆</span>
            <span class="logo-text">Stopless Lab</span>
            <span class="logo-sub">葛大大的数字车间</span>
          </router-link>

          <nav class="nav-links">
            <router-link to="/framework" class="nav-link">
              <span class="nav-link-icon">▣</span>
              <span>框架文档</span>
            </router-link>
            <router-link to="/ai-toolbox" class="nav-link">
              <span class="nav-link-icon">✦</span>
              <span>AI 工具箱</span>
            </router-link>
            <router-link to="/garage" class="nav-link">
              <span class="nav-link-icon">◎</span>
              <span>数字车库</span>
            </router-link>
            <router-link to="/kitchen" class="nav-link">
              <span class="nav-link-icon">🍳</span>
              <span>家庭厨房</span>
            </router-link>
          </nav>

          <div class="header-status">
            <span class="status-dot online" />
            <span class="status-text">系统就绪</span>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content animate-fade-in-up" style="animation-delay: 0.3s">
          <div class="hero-badge">
            <span class="badge-pulse" />
            <span>ETHEN-OS v1.0.0</span>
          </div>

          <h1 class="hero-title">
            工业自动化<span class="text-[#02AD8B]">控制中枢</span>
          </h1>

          <p class="hero-subtitle">
            构建下一代智能制造基础设施
          </p>

          <!-- Typewriter -->
          <div class="typewriter-line">
            <span class="typewriter-prefix">&gt;</span>
            <span class="typewriter-text">{{ displayText }}</span>
            <span class="typewriter-cursor">_</span>
          </div>

          <!-- CTA Buttons -->
          <div class="hero-actions">
            <button class="btn-accent" @click="goDashboard">
              <span>进入控制台</span>
              <span class="btn-arrow">→</span>
            </button>
            <a
              href="https://github.com/Ethen-Ge"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-glass"
            >
              <span>查看 GitHub</span>
              <span class="btn-arrow">↗</span>
            </a>
          </div>
        </div>
      </section>

      <!-- Quick Access Cards -->
      <section class="cards-section animate-fade-in-up" style="animation-delay: 0.6s">
        <div class="cards-grid">
          <div
            v-for="card in quickCards"
            :key="card.id"
            class="glass-card quick-card"
            @click="navigateTo(card.route)"
          >
            <div class="card-top">
              <span class="card-icon" :style="{ color: card.color }">{{ card.icon }}</span>
              <span class="card-arrow">↗</span>
            </div>
            <div class="card-title">{{ card.title }}</div>
            <div class="card-desc">{{ card.desc }}</div>
            <div class="card-meta">
              <span class="card-tag">{{ card.tag }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="enter-footer animate-fade-in-up" style="animation-delay: 0.8s">
        <SiteFooter />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTypewriter } from '@/composables/useTypewriter'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import CubeMatrixBackground from '@/components/effects/CubeMatrixBackground.vue'

const router = useRouter()
const { displayText, type } = useTypewriter()

const quickCards = [
  {
    id: 'framework',
    title: 'PF.AutoFramework',
    desc: '工业自动化测试框架，基于 C# .NET 8 构建的模块化解决方案',
    tag: 'v0.3.0-alpha',
    color: '#02AD8B',
    icon: '◈',
    route: '/framework',
  },
  {
    id: 'ai',
    title: 'AI Agent 调试',
    desc: '多模型 AI 对话平台，支持 GPT-4o · Claude · DeepSeek · Kimi',
    tag: '4 模型在线',
    color: '#58a6ff',
    icon: '✦',
    route: '/ai-toolbox',
  },
  {
    id: 'garage',
    title: '数字车库',
    desc: 'Kawasaki H2 提车进度追踪，工业美学与机械激情的交汇点',
    tag: '44% 达成',
    color: '#f85149',
    icon: '◎',
    route: '/garage',
  },
  {
    id: 'kitchen',
    title: '家庭厨房',
    desc: '智能点餐与菜单管理系统，支持在线下单与实时推送通知',
    tag: '营业中',
    color: '#bc8cff',
    icon: '🍳',
    route: '/kitchen',
  },
]

function navigateTo(path: string) {
  router.push(path)
}

function goDashboard() {
  router.push('/dashboard')
}

onMounted(async () => {
  await new Promise((r) => setTimeout(r, 600))
  await type('正在加载 C# 自动化控制协议...', 45)
  await new Promise((r) => setTimeout(r, 500))
  await type(' Prism IoC 容器已就绪，等待指令。', 40)
})
</script>

<style scoped>
/* ═══════════════ Layout ═══════════════ */
.enter-3d {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #020617;
}

/* ═══════════════ Foreground ═══════════════ */
.foreground {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 0 1.5rem;
  pointer-events: none;
}

.foreground > * {
  pointer-events: auto;
}

/* ═══════════════ Header ═══════════════ */
.glass-header {
  width: 100%;
  max-width: 1200px;
  margin-top: 1rem;
  opacity: 0; /* overridden by animate-fade-in-up */
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 20px;
  color: #02AD8B;
  filter: drop-shadow(0 0 6px rgba(2, 173, 139, 0.5));
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #e6edf3;
  letter-spacing: 0.03em;
}

.logo-sub {
  font-size: 11px;
  color: #484f58;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

/* ── Nav Links ──────────────────────────── */
.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: #7d8590;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #e6edf3;
  background: rgba(255, 255, 255, 0.04);
}

.nav-link-icon {
  font-size: 14px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-dot.online {
  background: #02AD8B;
  box-shadow: 0 0 6px rgba(2, 173, 139, 0.8);
}

.status-text {
  font-size: 11px;
  color: #484f58;
}

/* ═══════════════ Hero ═══════════════ */
.hero-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 1200px;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  opacity: 0; /* overridden by animate-fade-in-up */
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  color: #02AD8B;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(8px);
  background: rgba(2, 173, 139, 0.08);
  border: 1px solid rgba(2, 173, 139, 0.2);
}

.badge-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #02AD8B;
  box-shadow: 0 0 8px rgba(2, 173, 139, 0.8);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.15;
  color: #e6edf3;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
  text-shadow: 0 0 60px rgba(2, 173, 139, 0.15);
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #7d8590;
  margin: 0 0 1.5rem;
  font-weight: 400;
  letter-spacing: 0.04em;
}

/* ── Typewriter ──────────────────────────── */
.typewriter-line {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 14px;
  margin-bottom: 2rem;
  min-height: 22px;
}

.typewriter-prefix {
  color: #02AD8B;
  margin-right: 8px;
  font-weight: 700;
}

.typewriter-text {
  color: #8b949e;
}

.typewriter-cursor {
  color: #02AD8B;
  animation: cursorBlink 1s step-end infinite;
  margin-left: 1px;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── CTA Buttons ─────────────────────────── */
.hero-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-accent {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 2rem;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: #02AD8B;
  color: #fff;
  letter-spacing: 0.02em;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(2, 173, 139, 0.3);
}

.btn-accent:hover {
  background: #03d9a8;
  box-shadow: 0 0 30px rgba(2, 173, 139, 0.5), 0 0 60px rgba(2, 173, 139, 0.2);
  transform: translateY(-2px);
}

.btn-accent:active {
  transform: translateY(0);
}

.btn-glass {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 2rem;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e6edf3;
  letter-spacing: 0.02em;
  transition: all 0.3s ease;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(2, 173, 139, 0.5);
  box-shadow: 0 0 20px rgba(2, 173, 139, 0.15);
  transform: translateY(-2px);
  color: #fff;
}

.btn-glass:active {
  transform: translateY(0);
}

.btn-arrow {
  font-size: 16px;
}

/* ═══════════════ Quick Access Cards ═══════════════ */
.cards-section {
  width: 100%;
  max-width: 1100px;
  padding-bottom: 0.5rem;
  opacity: 0; /* overridden by animate-fade-in-up */
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.quick-card {
  padding: 1.25rem;
  cursor: pointer;
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}

.quick-card:hover {
  transform: translateY(-6px);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(2, 173, 139, 0.4);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(2, 173, 139, 0.12);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.card-icon {
  font-size: 22px;
  line-height: 1;
}

.card-arrow {
  font-size: 14px;
  color: #30363d;
  transition: color 0.3s ease, transform 0.3s ease;
}

.quick-card:hover .card-arrow {
  color: #02AD8B;
  transform: translate(2px, -2px);
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #e6edf3;
  margin-bottom: 0.4rem;
}

.card-desc {
  font-size: 11px;
  color: #7d8590;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(2, 173, 139, 0.08);
  border: 1px solid rgba(2, 173, 139, 0.15);
  color: #02AD8B;
  letter-spacing: 0.04em;
}

/* ═══════════════ Footer ═══════════════ */
.enter-footer {
  width: 100%;
  max-width: 1200px;
  opacity: 0; /* overridden by animate-fade-in-up */
}

.enter-footer :deep(footer) {
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
  padding: 8px 0 !important;
}

/* ═══════════════ Responsive ═══════════════ */
@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .nav-links {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.2rem;
  }

  .hero-subtitle {
    font-size: 0.95rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .btn-accent,
  .btn-glass {
    width: 100%;
    justify-content: center;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .logo-sub {
    display: none;
  }

  .header-status {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 1.7rem;
  }

  .typewriter-line {
    font-size: 12px;
  }

  .glass-header {
    margin-top: 0.5rem;
  }

  .header-inner {
    padding: 0.6rem 1rem;
  }
}
</style>
