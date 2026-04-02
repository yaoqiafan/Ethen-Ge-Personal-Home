<template>
  <!-- 底层：主粒子场（UI 下方） -->
  <canvas ref="bgCanvas" class="tp-bg" />
  <!-- 覆盖层：幽灵粒子（UI 上方，pointer-events:none） -->
  <canvas ref="fgCanvas" class="tp-fg" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ─── 配置 ─────────────────────────────────────────────────────────────────────
const BG = {
  count:         200,
  chars:         ['0', '1', '_', '.', '·', '|', '-', '×', '+', '▪', '░'] as const,
  fontSize:      10,
  ghostAlpha:    0.16,
  ghostColor:    [33,  38,  45]  as [number,number,number],
  glowColor:     [57,  211, 83]  as [number,number,number],
  hoverColor:    [88,  166, 255] as [number,number,number],
  lightRadius:   170,
  lightFadeIn:   0.16,
  lightFadeOut:  0.028,
  repelRadius:   65,
  repelForce:    0.18,
  attractRadius: 260,
  attractForce:  0.032,
  friction:      0.965,
  maxSpeed:      3.2,
  wanderAcc:     0.009,
  wanderTurn:    0.022,
  connDist:      120,
  connGhostAlpha: 0.05,
  connLitAlpha:   0.30,
  hoverSpeedMul: 2.2,
} as const

// 覆盖层：纯幽灵，极透明，慢速漂浮，无鼠标交互
const FG = {
  count:      70,
  chars:      ['0', '1', '_', '.', '·', '-', '+', '░', '▒'] as const,
  fontSize:   11,
  ghostAlpha: 0.09,      // 非常透明，不遮挡文字
  speed:      0.18,      // 极慢
  wanderAcc:  0.006,
  wanderTurn: 0.016,
  friction:   0.978,
  maxSpeed:   1.0,
  ghostColor: [33,  38,  45]  as [number,number,number],
  glowColor:  [57,  211, 83]  as [number,number,number],
  // 覆盖层不参与探照灯，始终保持幽灵态
} as const

// ─── 类型 ─────────────────────────────────────────────────────────────────────
interface BgParticle {
  x: number; y: number; vx: number; vy: number
  wAngle: number; wSpeed: number; wPhase: number
  char: string; lit: number; tlit: number; cyan: boolean
}
interface FgParticle {
  x: number; y: number; vx: number; vy: number
  wAngle: number; wSpeed: number; wPhase: number
  char: string
}

// ─── 状态 ─────────────────────────────────────────────────────────────────────
const bgCanvas = ref<HTMLCanvasElement | null>(null)
const fgCanvas = ref<HTMLCanvasElement | null>(null)
let bgCtx: CanvasRenderingContext2D | null = null
let fgCtx: CanvasRenderingContext2D | null = null
let W = 0, H = 0
let bgPts: BgParticle[] = []
let fgPts: FgParticle[] = []
let mx = -9999, my = -9999
let interactive = false
let globalSpeedMul = 1.0
let simTime = 0
let rafId: number
let resizeId: ReturnType<typeof setTimeout>

// ─── 工具 ─────────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpRGB(
  from: [number,number,number],
  to:   [number,number,number],
  t:    number,
): string {
  return `${Math.round(lerp(from[0],to[0],t))},` +
         `${Math.round(lerp(from[1],to[1],t))},` +
         `${Math.round(lerp(from[2],to[2],t))}`
}

// ─── 初始化 ───────────────────────────────────────────────────────────────────
function initCanvas() {
  if (!bgCanvas.value || !fgCanvas.value) return
  W = window.innerWidth
  H = window.innerHeight
  bgCanvas.value.width  = fgCanvas.value.width  = W
  bgCanvas.value.height = fgCanvas.value.height = H

  bgPts = Array.from({ length: BG.count }, () => {
    const spd = Math.random() * 0.5 + 0.1
    const dir = Math.random() * Math.PI * 2
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: Math.cos(dir) * spd, vy: Math.sin(dir) * spd,
      wAngle: Math.random() * Math.PI * 2,
      wSpeed: (Math.random() - 0.5) * BG.wanderTurn * 2,
      wPhase: Math.random() * Math.PI * 2,
      char: BG.chars[Math.floor(Math.random() * BG.chars.length)],
      lit: 0, tlit: 0, cyan: false,
    }
  })

  fgPts = Array.from({ length: FG.count }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * FG.speed,
    vy: (Math.random() - 0.5) * FG.speed,
    wAngle: Math.random() * Math.PI * 2,
    wSpeed: (Math.random() - 0.5) * FG.wanderTurn * 2,
    wPhase: Math.random() * Math.PI * 2,
    char: FG.chars[Math.floor(Math.random() * FG.chars.length)],
  }))
}

// ─── 底层渲染 ─────────────────────────────────────────────────────────────────
function tickBg() {
  if (!bgCtx) return
  bgCtx.clearRect(0, 0, W, H)
  const hasMouse = mx > -9000

  for (const p of bgPts) {
    // 游荡
    p.wAngle += p.wSpeed
      + Math.sin(simTime * 1.3 + p.wPhase) * 0.015
      + Math.cos(simTime * 0.7 + p.wPhase * 1.6) * 0.008
    const wf = BG.wanderAcc * globalSpeedMul
    p.vx += Math.cos(p.wAngle) * wf
    p.vy += Math.sin(p.wAngle) * wf

    // 鼠标力场
    if (hasMouse) {
      const dx = mx - p.x, dy = my - p.y
      const d  = Math.sqrt(dx * dx + dy * dy)
      if (d > 0.1) {
        if (d < BG.repelRadius) {
          const f = (1 - d / BG.repelRadius) * BG.repelForce
          p.vx -= (dx / d) * f; p.vy -= (dy / d) * f
        } else if (d < BG.attractRadius) {
          const t = 1 - (d - BG.repelRadius) / (BG.attractRadius - BG.repelRadius)
          const f = t * t * BG.attractForce * globalSpeedMul
          p.vx += (dx / d) * f; p.vy += (dy / d) * f
        }
      }
    }

    p.vx *= BG.friction; p.vy *= BG.friction
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    if (spd > BG.maxSpeed) { p.vx *= BG.maxSpeed / spd; p.vy *= BG.maxSpeed / spd }
    p.x += p.vx; p.y += p.vy
    if (p.x < -14) p.x = W + 14; else if (p.x > W + 14) p.x = -14
    if (p.y < -14) p.y = H + 14; else if (p.y > H + 14) p.y = -14

    // 亮度
    const ldx = p.x - mx, ldy = p.y - my
    const ld  = Math.sqrt(ldx * ldx + ldy * ldy)
    p.tlit = ld < BG.lightRadius ? 1 - ld / BG.lightRadius : 0
    p.cyan = p.tlit > 0 && interactive
    p.lit  = lerp(p.lit, p.tlit, p.tlit > p.lit ? BG.lightFadeIn : BG.lightFadeOut)
  }

  // 连线
  bgCtx.lineWidth = 0.5
  for (let i = 0; i < bgPts.length; i++) {
    const a = bgPts[i]
    for (let j = i + 1; j < bgPts.length; j++) {
      const b = bgPts[j]
      const dx = a.x - b.x, dy = a.y - b.y
      if (Math.abs(dx) > BG.connDist || Math.abs(dy) > BG.connDist) continue
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d >= BG.connDist) continue
      const bright = Math.max(a.lit, b.lit)
      const fade   = 1 - d / BG.connDist
      const alpha  = lerp(fade * BG.connGhostAlpha, fade * BG.connLitAlpha, bright)
      if (alpha < 0.005) continue
      const rgb = (a.cyan || b.cyan)
        ? lerpRGB(BG.ghostColor, BG.hoverColor, bright)
        : lerpRGB(BG.ghostColor, BG.glowColor,  bright)
      bgCtx.strokeStyle = `rgba(${rgb},${alpha})`
      bgCtx.beginPath(); bgCtx.moveTo(a.x, a.y); bgCtx.lineTo(b.x, b.y); bgCtx.stroke()
    }
  }

  // 字符
  bgCtx.font = `${BG.fontSize}px 'JetBrains Mono', monospace`
  bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle'
  for (const p of bgPts) {
    const t = p.lit
    bgCtx.fillStyle = `rgba(${p.cyan
      ? lerpRGB(BG.ghostColor, BG.hoverColor, t)
      : lerpRGB(BG.ghostColor, BG.glowColor,  t)},${lerp(BG.ghostAlpha, 1, t)})`
    if (t > 0.18) { bgCtx.shadowColor = p.cyan ? '#58a6ff' : '#39d353'; bgCtx.shadowBlur = t * 12 }
    else bgCtx.shadowBlur = 0
    bgCtx.fillText(p.char, p.x, p.y)
  }
  bgCtx.shadowBlur = 0
}

// ─── 覆盖层渲染（UI 上方幽灵）────────────────────────────────────────────────
function tickFg() {
  if (!fgCtx) return
  fgCtx.clearRect(0, 0, W, H)

  for (const p of fgPts) {
    // 纯游荡，无鼠标力
    p.wAngle += p.wSpeed
      + Math.sin(simTime * 0.9 + p.wPhase) * 0.012
      + Math.cos(simTime * 0.5 + p.wPhase * 1.4) * 0.007
    p.vx += Math.cos(p.wAngle) * FG.wanderAcc
    p.vy += Math.sin(p.wAngle) * FG.wanderAcc
    p.vx *= FG.friction; p.vy *= FG.friction
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    if (spd > FG.maxSpeed) { p.vx *= FG.maxSpeed / spd; p.vy *= FG.maxSpeed / spd }
    p.x += p.vx; p.y += p.vy
    if (p.x < -14) p.x = W + 14; else if (p.x > W + 14) p.x = -14
    if (p.y < -14) p.y = H + 14; else if (p.y > H + 14) p.y = -14
  }

  fgCtx.font = `${FG.fontSize}px 'JetBrains Mono', monospace`
  fgCtx.textAlign = 'center'; fgCtx.textBaseline = 'middle'
  fgCtx.shadowBlur = 0

  // 随机让少量覆盖层粒子在鼠标附近微微发光
  const hasMouse = mx > -9000
  for (const p of fgPts) {
    let alpha: number = FG.ghostAlpha
    let rgb   = lerpRGB(FG.ghostColor, FG.glowColor, 0)
    if (hasMouse) {
      const d = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2)
      if (d < 200) {
        const t = (1 - d / 200) * 0.5  // 覆盖层最高亮度只到 0.5
        alpha = lerp(FG.ghostAlpha, 0.55, t)
        rgb   = interactive
          ? lerpRGB(FG.ghostColor, BG.hoverColor, t)
          : lerpRGB(FG.ghostColor, FG.glowColor,  t)
        if (t > 0.2) { fgCtx.shadowColor = interactive ? '#58a6ff' : '#39d353'; fgCtx.shadowBlur = t * 8 }
        else fgCtx.shadowBlur = 0
      }
    }
    fgCtx.fillStyle = `rgba(${rgb},${alpha})`
    fgCtx.fillText(p.char, p.x, p.y)
  }
  fgCtx.shadowBlur = 0
}

// ─── 主循环 ───────────────────────────────────────────────────────────────────
function tick() {
  simTime += 0.012
  globalSpeedMul = lerp(globalSpeedMul, interactive ? BG.hoverSpeedMul : 1.0, 0.05)
  tickBg()
  tickFg()
  rafId = requestAnimationFrame(tick)
}

// ─── 事件 ─────────────────────────────────────────────────────────────────────
function onMove(e: MouseEvent)  { mx = e.clientX; my = e.clientY }
function onLeave()              { mx = -9999; my = -9999 }
function onOver(e: MouseEvent)  {
  interactive = !!(e.target as HTMLElement)
    .closest('a, button, [role="button"], input, textarea, select, label, [tabindex]')
}
function onResize() { clearTimeout(resizeId); resizeId = setTimeout(initCanvas, 150) }

// ─── 生命周期 ─────────────────────────────────────────────────────────────────
onMounted(() => {
  bgCtx = bgCanvas.value?.getContext('2d') ?? null
  fgCtx = fgCanvas.value?.getContext('2d') ?? null
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
/* 底层：UI 下方主粒子场 */
.tp-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background: transparent;
}

/* 覆盖层：UI 上方幽灵粒子（高于内容，低于 CursorGlow 9999） */
.tp-fg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
  background: transparent;
}
</style>
