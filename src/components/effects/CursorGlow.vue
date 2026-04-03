<template>
  <!-- 鼠标光晕层，pointer-events-none 保证不阻断任何点击 -->
  <div class="cursor-glow-layer" aria-hidden="true">
    <!-- 外圈：大光晕，低透明度慢速跟随 -->
    <div
      class="glow-outer"
      :style="{ transform: `translate(${outerX}px, ${outerY}px)`, opacity: visible ? 1 : 0 }"
    ></div>
    <!-- 内圈：小准星，高精度快速跟随 -->
    <div
      class="glow-inner"
      :class="{ hovering: isHovering }"
      :style="{ transform: `translate(${innerX}px, ${innerY}px)`, opacity: visible ? 1 : 0 }"
    >
      <!-- 十字准星线 -->
      <span class="crosshair-h"></span>
      <span class="crosshair-v"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 触摸屏（手机/平板）不显示鼠标特效
const isTouch = window.matchMedia('(pointer: coarse)').matches

// 当前真实鼠标坐标
const mouseX = ref(0)
const mouseY = ref(0)

// 外圈（慢速追踪，平滑插值）
const outerX = ref(0)
const outerY = ref(0)

// 内圈（快速追踪，几乎即时）
const innerX = ref(0)
const innerY = ref(0)

const visible = ref(false)
const isHovering = ref(false)

let rafId: number | null = null

const OUTER_EASE = 0.12   // 外圈插值系数（越小越慢）
const INNER_EASE = 0.55   // 内圈插值系数（越大越快）

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function tick() {
  outerX.value = lerp(outerX.value, mouseX.value - 20, OUTER_EASE)
  outerY.value = lerp(outerY.value, mouseY.value - 20, OUTER_EASE)
  innerX.value = lerp(innerX.value, mouseX.value - 6, INNER_EASE)
  innerY.value = lerp(innerY.value, mouseY.value - 6, INNER_EASE)
  rafId = requestAnimationFrame(tick)
}

function onMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
  if (!visible.value) visible.value = true
}

// 委托检测悬停在可交互元素上
function onMouseOver(e: MouseEvent) {
  const el = e.target as HTMLElement
  const interactive = el.closest('a, button, [role="button"], input, textarea, select, label, [tabindex]')
  isHovering.value = !!interactive
}

onMounted(() => {
  if (isTouch) return   // 触摸屏跳过，不监听事件、不启动 RAF
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mouseover', onMouseOver, { passive: true })
  document.addEventListener('mouseleave', () => { visible.value = false })
  document.addEventListener('mouseenter', () => { visible.value = true })
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  if (isTouch) return
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseover', onMouseOver)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.cursor-glow-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

/* 触摸屏：完全隐藏整个层 */
@media (pointer: coarse) {
  .cursor-glow-layer { display: none; }
}

/* ── 外圈大光晕 ──────────────────────────── */
.glow-outer {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(57, 211, 83, 0.25);
  background: radial-gradient(circle, rgba(57, 211, 83, 0.06) 0%, transparent 70%);
  box-shadow: 0 0 16px rgba(57, 211, 83, 0.15), inset 0 0 8px rgba(57, 211, 83, 0.05);
  transition: opacity 0.3s ease;
  will-change: transform;
}

/* ── 内圈小准星 ──────────────────────────── */
.glow-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(57, 211, 83, 0.8);
  box-shadow:
    0 0 6px rgba(57, 211, 83, 1),
    0 0 12px rgba(57, 211, 83, 0.6),
    0 0 24px rgba(57, 211, 83, 0.3);
  transition: opacity 0.3s ease, width 0.2s ease, height 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
}

/* 悬停可交互元素时：放大 + 变青色 */
.glow-inner.hovering {
  width: 20px;
  height: 20px;
  background: rgba(88, 166, 255, 0.7);
  box-shadow:
    0 0 8px rgba(88, 166, 255, 1),
    0 0 20px rgba(88, 166, 255, 0.6),
    0 0 36px rgba(88, 166, 255, 0.3);
  /* 悬停时内圈偏移修正，保持视觉居中 */
  transform-origin: center;
}

/* 十字准星线 */
.crosshair-h,
.crosshair-v {
  position: absolute;
  background: rgba(57, 211, 83, 0.5);
  border-radius: 1px;
}
.crosshair-h {
  width: 8px;
  height: 1px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.crosshair-v {
  width: 1px;
  height: 8px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.glow-inner.hovering .crosshair-h,
.glow-inner.hovering .crosshair-v {
  background: rgba(88, 166, 255, 0.7);
}
</style>
