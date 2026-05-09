<template>
  <div class="enter-view animate-fade-in-up">
    <!-- ═══════════ Top-left: Brand ═══════════ -->
    <div class="corner-panel corner-tl">
      <div class="hero-badge">
        <span class="badge-pulse" />
        <span>ETHEN-OS v1.0.0</span>
      </div>
      <h1 class="hero-title">
        欢迎来到<span class="text-accent">无限实验室</span>
      </h1>
      <p class="hero-subtitle">构建下一代智能制造基础设施</p>
    </div>

    <!-- ═══════════ Top-right: Status ═══════════ -->
    <div class="corner-panel corner-tr">
      <div class="status-item">
        <span class="status-dot online" />
        <span>PF.AutoFramework v0.3.0</span>
      </div>
      <div class="status-item">
        <span class="status-dot online" />
        <span>AI 4/4 模型在线</span>
      </div>
      <div class="status-item">
        <span class="status-dot online" />
        <span>系统运行正常</span>
      </div>
    </div>

    <!-- ═══════════ Bottom-left: Typewriter ═══════════ -->
    <div class="corner-panel corner-bl">
      <div class="typewriter-line">
        <span class="typewriter-prefix">&gt;</span>
        <span class="typewriter-text">{{ displayText }}</span>
        <span class="typewriter-cursor">_</span>
      </div>
    </div>

    <!-- ═══════════ Bottom-right: Hint ═══════════ -->
    <div class="corner-panel corner-br">
      <span class="hint-icon">🖱</span>
      <span>滚轮旋转 · 点击卡片直达</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTypewriter } from '@/composables/useTypewriter'

const { displayText, type } = useTypewriter()

onMounted(async () => {
  await new Promise((r) => setTimeout(r, 400))
  await type('正在加载 C# 自动化控制协议...', 42)
  await new Promise((r) => setTimeout(r, 400))
  await type(' Prism IoC 容器已就绪，等待指令。', 38)
})
</script>

<style scoped>
.enter-view {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* ═══════════ Corner panels ═══════════ */
.corner-panel {
  position: fixed;
  z-index: 1;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(20, 20, 20, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: clamp(8px, 1.2vw, 14px) clamp(10px, 1.5vw, 18px);
}

/* ── Top-left ── */
.corner-tl {
  top: clamp(60px, 8vh, 80px);
  left: clamp(12px, 2vw, 28px);
  max-width: clamp(240px, 32vw, 400px);
}

/* ── Top-right ── */
.corner-tr {
  top: clamp(60px, 8vh, 80px);
  right: clamp(12px, 2vw, 28px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Bottom-left ── */
.corner-bl {
  bottom: clamp(52px, 8vh, 72px);
  left: clamp(12px, 2vw, 28px);
  max-width: clamp(260px, 38vw, 480px);
}

/* ── Bottom-right ── */
.corner-br {
  bottom: clamp(52px, 8vh, 72px);
  right: clamp(12px, 2vw, 28px);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(10px, 1.1vw, 12px);
  color: #484f58;
}

/* ═══════════ Top-left content ═══════════ */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 8px;
  border-radius: 20px;
  font-size: clamp(9px, 1vw, 11px);
  color: #02AD8B;
  margin-bottom: clamp(6px, 1vw, 12px);
  background: rgba(2, 173, 139, 0.08);
  border: 1px solid rgba(2, 173, 139, 0.2);
}
.badge-pulse {
  width: 5px;
  height: 5px;
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
  font-size: clamp(1.2rem, 2.8vw, 2.4rem);
  font-weight: 800;
  line-height: 1.2;
  color: #e6edf3;
  letter-spacing: -0.02em;
  margin: 0 0 clamp(4px, 0.6vw, 8px);
  text-shadow: 0 0 60px rgba(2, 173, 139, 0.12);
  white-space: nowrap;
}
.text-accent {
  color: #02AD8B;
  text-shadow: 0 0 18px rgba(2, 173, 139, 0.5), 0 0 36px rgba(2, 173, 139, 0.2);
}

.hero-subtitle {
  font-size: clamp(10px, 1.1vw, 14px);
  color: #7d8590;
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.04em;
}

/* ═══════════ Top-right: Status ═══════════ */
.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(9px, 1vw, 11px);
  color: #7d8590;
  white-space: nowrap;
}
.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.online {
  background: #02AD8B;
  box-shadow: 0 0 5px rgba(2, 173, 139, 0.7);
}

/* ═══════════ Bottom-left: Typewriter ═══════════ */
.typewriter-line {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: clamp(10px, 1.1vw, 13px);
  min-height: 20px;
}
.typewriter-prefix {
  color: #02AD8B;
  margin-right: 6px;
  font-weight: 700;
  flex-shrink: 0;
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

/* ═══════════ Bottom-right: Hint ═══════════ */
.hint-icon {
  font-size: clamp(12px, 1.3vw, 15px);
  flex-shrink: 0;
}

/* ═══════════ Responsive ═══════════ */
@media (max-width: 640px) {
  .corner-tl,
  .corner-bl {
    left: 8px;
  }
  .corner-tr,
  .corner-br {
    right: 8px;
  }
  .corner-tl,
  .corner-tr {
    top: 56px;
  }
  .corner-bl,
  .corner-br {
    bottom: 48px;
  }
  .corner-panel {
    padding: 6px 10px;
    border-radius: 8px;
  }
  .hero-title {
    white-space: normal;
  }
  .corner-tl {
    max-width: 55vw;
  }
  .corner-bl {
    max-width: 60vw;
  }
}
</style>
