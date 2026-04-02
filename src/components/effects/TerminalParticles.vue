<template>
  <canvas ref="canvasEl" class="terminal-particles" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ─── 配置常量 ──────────────────────────────────────────────────────────────────
const CFG = {
  // 粒子
  count:         100,
  chars:         ['0', '1', '_', '.', '·', '|', '-', '×'] as const,
  fontSize:      9,
  baseSpeed:     0.25,
  hoverSpeedMul: 2.8,   // 悬停交互元素时加速倍数

  // 颜色
  ghostAlpha:   0.07,   // 幽灵态透明度
  ghostColor:   [33,  38,  45]  as [number,number,number],  // #21262d
  glowColor:    [57,  211, 83]  as [number,number,number],  // #39d353
  hoverColor:   [88,  166, 255] as [number,number,number],  // #58a6ff

  // 探照灯
  lightRadius:  150,    // 照亮半径
  lightFadeIn:  0.14,   // 亮起速度（快）
  lightFadeOut: 0.035,  // 暗淡速度（慢，带拖尾感）

  // 排斥
  repelRadius:  90,
  repelForce:   0.06,
  damping:      0.018,  // 回归基础速度的插值系数

  // 连线
  connDist:     110,
  connBaseAlpha: 0.04,  // 幽灵连线最大透明度
  connGlowAlpha: 0.22,  // 照亮连线最大透明度
} as const

// ─── 类型 ─────────────────────────────────────────────────────────────────────
interface Particle {
  x:    number
  y:    number
  vx:   number
  vy:   number
  bvx:  number   // base velocity x（原始随机速度）
  bvy:  number
  char: string
  lit:  number   // 当前亮度 0–1（已插值）
  tlit: number   // 目标亮度
  cyan: boolean  // 是否处于 hover-interactive 状态（蓝色模式）
}

// ─── 状态 ─────────────────────────────────────────────────────────────────────
const canvasEl = ref<HTMLCanvasElement | null>(null)

let ctx:    CanvasRenderingContext2D | null = null
let W = 0, H = 0
let pts:    Particle[] = []
let mx  = -9999, my = -9999    // 鼠标坐标
let interactive = false        // 当前是否悬停在交互元素上
let speedT = 1.0               // 全局速度倍数目标（插值用）
let speedC = 1.0               // 当前速度倍数
let rafId:  number
let resizeId: ReturnType<typeof setTimeout>

// ─── 工具 ─────────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpC(
  from: [number,number,number],
  to:   [number,number,number],
  t:    number,
): string {
  const r = Math.round(lerp(from[0], to[0], t))
  const g = Math.round(lerp(from[1], to[1], t))
  const b = Math.round(lerp(from[2], to[2], t))
  return `${r},${g},${b}`
}

function randVel(): [number, number] {
  const a = Math.random() * Math.PI * 2
  const s = (Math.random() * 0.6 + 0.2) * CFG.baseSpeed
  return [Math.cos(a) * s, Math.sin(a) * s]
}

// ─── 初始化粒子 ───────────────────────────────────────────────────────────────
function initCanvas() {
  if (!canvasEl.value) return
  W = canvasEl.value.width  = window.innerWidth
  H = canvasEl.value.height = window.innerHeight

  const [bvx, bvy] = randVel()
  pts = Array.from({ length: CFG.count }, () => {
    const [bvx, bvy] = randVel()
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      vx:   bvx, vy: bvy,
      bvx,  bvy,
      char: CFG.chars[Math.floor(Math.random() * CFG.chars.length)],
      lit:  0, tlit: 0, cyan: false,
    }
  })

  // 修正未使用变量（TypeScript 严格模式）
  void bvx; void bvy
}

// ─── 主渲染循环 ───────────────────────────────────────────────────────────────
function tick() {
  if (!ctx) { rafId = requestAnimationFrame(tick); return }

  ctx.clearRect(0, 0, W, H)

  // 全局速度插值（hover → 加速 / 离开 → 减速）
  speedT = interactive ? CFG.hoverSpeedMul : 1.0
  speedC = lerp(speedC, speedT, 0.04)

  // ── 更新粒子 ────────────────────────────────────────
  for (const p of pts) {
    const dx = p.x - mx
    const dy = p.y - my
    const d2 = dx * dx + dy * dy
    const d  = Math.sqrt(d2)

    // 目标亮度
    p.tlit = d < CFG.lightRadius ? 1 - d / CFG.lightRadius : 0
    p.cyan = p.tlit > 0 && interactive

    // 亮度插值（亮起快，暗淡慢）
    const fadeT = p.tlit > p.lit ? CFG.lightFadeIn : CFG.lightFadeOut
    p.lit = lerp(p.lit, p.tlit, fadeT)

    // 排斥力
    if (d < CFG.repelRadius && d > 0.1) {
      const strength = (1 - d / CFG.repelRadius) * CFG.repelForce
      p.vx += (dx / d) * strength
      p.vy += (dy / d) * strength
    }

    // 回归基础速度
    const tv = speedC
    p.vx = lerp(p.vx, p.bvx * tv, CFG.damping)
    p.vy = lerp(p.vy, p.bvy * tv, CFG.damping)

    // 移动 + 环绕
    p.x += p.vx
    p.y += p.vy
    if (p.x < -12) p.x = W + 12
    else if (p.x > W + 12) p.x = -12
    if (p.y < -12) p.y = H + 12
    else if (p.y > H + 12) p.y = -12
  }

  // ── 连线（先画，在字符下面）───────────────────────────
  ctx.lineWidth = 0.5
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    for (let j = i + 1; j < pts.length; j++) {
      const b = pts[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      // 快速距离平方剪裁
      if (Math.abs(dx) > CFG.connDist || Math.abs(dy) > CFG.connDist) continue
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d >= CFG.connDist) continue

      const bright = Math.max(a.lit, b.lit)
      const fade   = 1 - d / CFG.connDist
      const alpha  = lerp(fade * CFG.connBaseAlpha, fade * CFG.connGlowAlpha, bright)
      if (alpha < 0.005) continue

      const isCyan = a.cyan || b.cyan
      const rgb    = isCyan
        ? lerpC(CFG.ghostColor, CFG.hoverColor, bright)
        : lerpC(CFG.ghostColor, CFG.glowColor,  bright)

      ctx.strokeStyle = `rgba(${rgb},${alpha})`
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  // ── 绘制字符 ──────────────────────────────────────────
  ctx.font      = `${CFG.fontSize}px 'JetBrains Mono', monospace`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'

  for (const p of pts) {
    const t     = p.lit
    const alpha = lerp(CFG.ghostAlpha, 1, t)
    const rgb   = p.cyan
      ? lerpC(CFG.ghostColor, CFG.hoverColor, t)
      : lerpC(CFG.ghostColor, CFG.glowColor,  t)

    ctx.fillStyle = `rgba(${rgb},${alpha})`

    // 仅对明亮粒子添加 shadowBlur（shadowBlur 是 canvas 最大开销之一）
    if (t > 0.25) {
      ctx.shadowColor = p.cyan ? '#58a6ff' : '#39d353'
      ctx.shadowBlur  = t * 10
    } else {
      ctx.shadowBlur = 0
    }

    ctx.fillText(p.char, p.x, p.y)
  }

  // 关闭全局 shadow（避免影响后续其他渲染）
  ctx.shadowBlur = 0

  rafId = requestAnimationFrame(tick)
}

// ─── 事件处理 ─────────────────────────────────────────────────────────────────
function onMove(e: MouseEvent)  { mx = e.clientX; my = e.clientY }
function onLeave()              { mx = -9999;  my = -9999 }

function onOver(e: MouseEvent) {
  interactive = !!(e.target as HTMLElement)
    .closest('a, button, [role="button"], input, textarea, select, label, [tabindex]')
}

function onResize() {
  clearTimeout(resizeId)
  resizeId = setTimeout(initCanvas, 150)
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!canvasEl.value) return
  ctx = canvasEl.value.getContext('2d')
  initCanvas()
  tick()

  window.addEventListener('mousemove',  onMove,  { passive: true })
  window.addEventListener('mouseleave', onLeave)
  window.addEventListener('mouseover',  onOver,  { passive: true })
  window.addEventListener('resize',     onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(resizeId)
  window.removeEventListener('mousemove',  onMove)
  window.removeEventListener('mouseleave', onLeave)
  window.removeEventListener('mouseover',  onOver)
  window.removeEventListener('resize',     onResize)
})
</script>

<style scoped>
.terminal-particles {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background: transparent;
}
</style>
