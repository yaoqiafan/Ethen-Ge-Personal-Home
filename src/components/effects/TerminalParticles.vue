<template>
  <canvas ref="canvasEl" class="terminal-particles" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ─── 配置 ─────────────────────────────────────────────────────────────────────
const CFG = {
  count:       200,
  chars:       ['0', '1', '_', '.', '·', '|', '-', '×', '+', '▪', '░'] as const,
  fontSize:    10,

  // 幽灵态（提高可见度）
  ghostAlpha:  0.16,
  ghostColor:  [33,  38,  45]  as [number,number,number],  // #21262d
  glowColor:   [57,  211, 83]  as [number,number,number],  // #39d353
  hoverColor:  [88,  166, 255] as [number,number,number],  // #58a6ff

  // 探照灯
  lightRadius:  170,
  lightFadeIn:  0.16,
  lightFadeOut: 0.028,

  // 排斥（紧贴鼠标时推开）
  repelRadius: 65,
  repelForce:  0.18,

  // 吸引（中距离向鼠标聚合）
  attractRadius: 260,
  attractForce:  0.032,

  // 运动物理
  friction:    0.965,  // 摩擦系数：越小惯性消耗越快；0.965 = 保留较多惯性
  maxSpeed:    3.2,
  // 游荡：每个粒子有独立角度缓慢漂移，形成无规律路径
  wanderAcc:   0.009,  // 游荡方向产生的加速度
  wanderTurn:  0.022,  // 游荡角速度

  // 连线
  connDist:      120,
  connGhostAlpha: 0.05,
  connLitAlpha:   0.30,

  // hover 联动
  hoverSpeedMul: 2.2,
} as const

// ─── 类型 ─────────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number
  vx: number; vy: number
  // 游荡角度（每帧变化，产生无规律曲线运动）
  wAngle: number
  wSpeed: number   // 该粒子自身的角速度（随机固定值）
  wPhase: number   // 噪声相位（错开不同粒子的节律）
  char: string
  lit:  number     // 当前亮度 [0,1]
  tlit: number     // 目标亮度
  cyan: boolean
}

// ─── 全局状态 ─────────────────────────────────────────────────────────────────
const canvasEl = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let W = 0, H = 0
let pts: Particle[] = []
let mx = -9999, my = -9999
let interactive = false
let globalSpeedMul = 1.0   // 实时插值的全局速度倍数
let simTime = 0            // 仿真时间（游荡噪声用）
let rafId: number
let resizeId: ReturnType<typeof setTimeout>

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function lerpRGB(
  from: [number,number,number],
  to:   [number,number,number],
  t:    number,
): string {
  return `${Math.round(lerp(from[0], to[0], t))},` +
         `${Math.round(lerp(from[1], to[1], t))},` +
         `${Math.round(lerp(from[2], to[2], t))}`
}

// ─── 初始化 ───────────────────────────────────────────────────────────────────
function initCanvas() {
  if (!canvasEl.value) return
  W = canvasEl.value.width  = window.innerWidth
  H = canvasEl.value.height = window.innerHeight

  pts = Array.from({ length: CFG.count }, () => {
    // 初始速度：随机小速度，后续由游荡/吸引驱动
    const spd = Math.random() * 0.5 + 0.1
    const dir = Math.random() * Math.PI * 2
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(dir) * spd,
      vy: Math.sin(dir) * spd,
      wAngle: Math.random() * Math.PI * 2,
      wSpeed: (Math.random() - 0.5) * CFG.wanderTurn * 2,
      wPhase: Math.random() * Math.PI * 2,
      char: CFG.chars[Math.floor(Math.random() * CFG.chars.length)],
      lit: 0, tlit: 0, cyan: false,
    }
  })
}

// ─── 主循环 ───────────────────────────────────────────────────────────────────
function tick() {
  if (!ctx) { rafId = requestAnimationFrame(tick); return }
  ctx.clearRect(0, 0, W, H)

  simTime += 0.012
  globalSpeedMul = lerp(globalSpeedMul, interactive ? CFG.hoverSpeedMul : 1.0, 0.05)

  const hasMouse = mx > -9000

  // ── 物理更新 ────────────────────────────────────────────────────────────────
  for (const p of pts) {
    // 1. 游荡：角度随时间+个体相位缓慢无规律漂移
    p.wAngle += p.wSpeed + Math.sin(simTime * 1.3 + p.wPhase) * 0.015
                         + Math.cos(simTime * 0.7 + p.wPhase * 1.6) * 0.008
    const wf = CFG.wanderAcc * globalSpeedMul
    p.vx += Math.cos(p.wAngle) * wf
    p.vy += Math.sin(p.wAngle) * wf

    // 2. 鼠标力场
    if (hasMouse) {
      const dx = mx - p.x
      const dy = my - p.y
      const d  = Math.sqrt(dx * dx + dy * dy)

      if (d > 0.1) {
        if (d < CFG.repelRadius) {
          // 排斥区：向外推
          const f = (1 - d / CFG.repelRadius) * CFG.repelForce
          p.vx -= (dx / d) * f
          p.vy -= (dy / d) * f
        } else if (d < CFG.attractRadius) {
          // 吸引区：向鼠标聚合，越远越弱
          const t = 1 - (d - CFG.repelRadius) / (CFG.attractRadius - CFG.repelRadius)
          const f = t * t * CFG.attractForce * globalSpeedMul  // 平方让近端更强
          p.vx += (dx / d) * f
          p.vy += (dy / d) * f
        }
      }
    }
    // 注意：鼠标离开后 hasMouse = false，粒子保留当前速度靠 friction 衰减
    // → 形成"惯性脱离"效果：仍会向鼠标原位置漂移一段后才散开

    // 3. 摩擦（控制惯性）
    p.vx *= CFG.friction
    p.vy *= CFG.friction

    // 4. 速度限幅
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    if (spd > CFG.maxSpeed) {
      const inv = CFG.maxSpeed / spd
      p.vx *= inv
      p.vy *= inv
    }

    // 5. 位移 + 屏幕环绕
    p.x += p.vx
    p.y += p.vy
    if (p.x < -14) p.x = W + 14
    else if (p.x > W + 14) p.x = -14
    if (p.y < -14) p.y = H + 14
    else if (p.y > H + 14) p.y = -14

    // 6. 亮度（探照灯）
    const ldx = p.x - mx
    const ldy = p.y - my
    const ld  = Math.sqrt(ldx * ldx + ldy * ldy)
    p.tlit = ld < CFG.lightRadius ? 1 - ld / CFG.lightRadius : 0
    p.cyan = p.tlit > 0 && interactive
    p.lit  = lerp(p.lit, p.tlit, p.tlit > p.lit ? CFG.lightFadeIn : CFG.lightFadeOut)
  }

  // ── 连线（字符层下方）───────────────────────────────────────────────────────
  ctx.lineWidth = 0.5
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    for (let j = i + 1; j < pts.length; j++) {
      const b = pts[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      if (Math.abs(dx) > CFG.connDist || Math.abs(dy) > CFG.connDist) continue
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d >= CFG.connDist) continue

      const bright = Math.max(a.lit, b.lit)
      const fade   = 1 - d / CFG.connDist
      const alpha  = lerp(fade * CFG.connGhostAlpha, fade * CFG.connLitAlpha, bright)
      if (alpha < 0.005) continue

      const rgb = (a.cyan || b.cyan)
        ? lerpRGB(CFG.ghostColor, CFG.hoverColor, bright)
        : lerpRGB(CFG.ghostColor, CFG.glowColor,  bright)

      ctx.strokeStyle = `rgba(${rgb},${alpha})`
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  // ── 字符绘制 ────────────────────────────────────────────────────────────────
  ctx.font         = `${CFG.fontSize}px 'JetBrains Mono', monospace`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'

  for (const p of pts) {
    const t     = p.lit
    const alpha = lerp(CFG.ghostAlpha, 1.0, t)
    const rgb   = p.cyan
      ? lerpRGB(CFG.ghostColor, CFG.hoverColor, t)
      : lerpRGB(CFG.ghostColor, CFG.glowColor,  t)

    ctx.fillStyle = `rgba(${rgb},${alpha})`

    if (t > 0.18) {
      ctx.shadowColor = p.cyan ? '#58a6ff' : '#39d353'
      ctx.shadowBlur  = t * 12
    } else {
      ctx.shadowBlur = 0
    }

    ctx.fillText(p.char, p.x, p.y)
  }

  ctx.shadowBlur = 0
  rafId = requestAnimationFrame(tick)
}

// ─── 事件 ─────────────────────────────────────────────────────────────────────
function onMove(e: MouseEvent)  { mx = e.clientX; my = e.clientY }
function onLeave()              { mx = -9999; my = -9999 }
function onOver(e: MouseEvent)  {
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
