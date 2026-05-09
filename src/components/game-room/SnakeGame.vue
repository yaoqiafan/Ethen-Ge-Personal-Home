<template>
  <div class="snake-game">
    <!-- 头部 -->
    <div class="sg-header">
      <button class="btn-ghost" @click="$emit('back')">← 返回</button>
      <div class="sg-info">
        <span class="sg-label">SCORE</span>
        <span class="sg-score glow-cyan">{{ score }}</span>
      </div>
      <div class="sg-info">
        <span class="sg-label">BEST</span>
        <span class="sg-score">{{ bestScore }}</span>
      </div>
      <button class="btn-ghost" @click="togglePause">
        {{ isPaused ? '▶ 继续' : '⏸ 暂停' }}
      </button>
    </div>

    <!-- 游戏画布 -->
    <div class="sg-canvas-wrap" ref="wrapRef">
      <canvas ref="canvasRef" class="sg-canvas"></canvas>

      <!-- 开始提示 -->
      <div v-if="!isRunning && !isGameOver" class="sg-start animate-fade-in">
        <div class="start-text glow-green">按任意方向键开始</div>
        <div class="start-hint">或点击下方方向键</div>
      </div>

      <!-- 暂停 -->
      <div v-if="isPaused" class="sg-pause animate-fade-in">
        <div class="pause-text">⏸ 已暂停</div>
      </div>
    </div>

    <!-- 移动端 D-pad -->
    <div class="sg-dpad">
      <div class="dpad-row">
        <button class="dpad-btn" @click="setDir('up')">▲</button>
      </div>
      <div class="dpad-row">
        <button class="dpad-btn" @click="setDir('left')">◀</button>
        <button class="dpad-btn dpad-center" disabled></button>
        <button class="dpad-btn" @click="setDir('right')">▶</button>
      </div>
      <div class="dpad-row">
        <button class="dpad-btn" @click="setDir('down')">▼</button>
      </div>
    </div>

    <!-- 游戏结束遮罩 -->
    <GameOverlay
      v-if="isGameOver"
      title="GAME OVER"
      :score="score"
      :duration="elapsed"
      :show-leaderboard="true"
      @restart="restart"
      @back="$emit('back')"
      @submit-score="handleSubmitScore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { submitScore } from '@/composables/useGameLeaderboard'
import GameOverlay from './GameOverlay.vue'
import type { GameResult } from '@/types/game-room'

const emit = defineEmits<{
  (e: 'game-over', result: GameResult): void
  (e: 'back'): void
}>()

const GRID = 20
const INITIAL_SPEED = 150
const MIN_SPEED = 60
const SPEED_STEP = 5
const FOOD_SCORE = 10

type Dir = 'up' | 'down' | 'left' | 'right'
type Point = { x: number; y: number }

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)

const snake = ref<Point[]>([{ x: 10, y: 10 }])
const dir = ref<Dir>('right')
const nextDir = ref<Dir>('right')
const food = ref<Point>({ x: 15, y: 10 })
const score = ref(0)
const bestScore = ref(0)
const isRunning = ref(false)
const isPaused = ref(false)
const isGameOver = ref(false)
const speed = ref(INITIAL_SPEED)
const startTime = ref(0)
const elapsed = ref(0)

let gameLoop: ReturnType<typeof setInterval> | null = null
let cellSize = 0
let touchStartX = 0
let touchStartY = 0

onMounted(() => {
  const saved = localStorage.getItem('game-room_snake-best')
  if (saved) bestScore.value = parseInt(saved, 10) || 0

  calcSize()
  draw()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onResize)

  // Touch support on canvas
  const c = canvasRef.value
  if (c) {
    c.addEventListener('touchstart', onTouchStart, { passive: false })
    c.addEventListener('touchend', onTouchEnd, { passive: false })
  }
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onResize)
})

function cleanup() {
  if (gameLoop) { clearInterval(gameLoop); gameLoop = null }
}

// ── 尺寸计算 ─────────────────────────────────────────────────────────────────
function calcSize() {
  const wrap = wrapRef.value
  const canvas = canvasRef.value
  if (!wrap || !canvas) return

  const maxW = Math.min(wrap.clientWidth, 480)
  cellSize = Math.floor(maxW / GRID)
  const totalSize = cellSize * GRID
  canvas.width = totalSize
  canvas.height = totalSize
  canvas.style.width = totalSize + 'px'
  canvas.style.height = totalSize + 'px'
}

function onResize() {
  calcSize()
  draw()
}

// ── 输入处理 ─────────────────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  const map: Record<string, Dir> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  }
  const d = map[e.key]
  if (d) {
    e.preventDefault()
    setDir(d)
  }
  if (e.key === ' ') {
    e.preventDefault()
    togglePause()
  }
}

function setDir(d: Dir) {
  if (isGameOver.value || isPaused.value) return
  // 不允许反向
  if (OPPOSITE[d] === dir.value && snake.value.length > 1) return
  nextDir.value = d
  if (!isRunning.value) startGame()
}

function onTouchStart(e: TouchEvent) {
  e.preventDefault()
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e: TouchEvent) {
  e.preventDefault()
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  const minSwipe = 20
  if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return
  if (Math.abs(dx) > Math.abs(dy)) {
    setDir(dx > 0 ? 'right' : 'left')
  } else {
    setDir(dy > 0 ? 'down' : 'up')
  }
}

function togglePause() {
  if (isGameOver.value || !isRunning.value) return
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    cleanup()
  } else {
    startLoop()
  }
}

// ── 游戏逻辑 ─────────────────────────────────────────────────────────────────
function startGame() {
  snake.value = [{ x: 10, y: 10 }]
  dir.value = 'right'
  nextDir.value = 'right'
  score.value = 0
  speed.value = INITIAL_SPEED
  isGameOver.value = false
  isPaused.value = false
  startTime.value = Date.now()
  spawnFood()
  isRunning.value = true
  startLoop()
}

function startLoop() {
  cleanup()
  gameLoop = setInterval(tick, speed.value)
}

function tick() {
  if (isPaused.value || isGameOver.value) return

  dir.value = nextDir.value
  const head = { ...snake.value[0] }

  switch (dir.value) {
    case 'up':    head.y--; break
    case 'down':  head.y++; break
    case 'left':  head.x--; break
    case 'right': head.x++; break
  }

  // 碰撞检测：墙壁
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    gameOver()
    return
  }

  // 碰撞检测：自身
  if (snake.value.some(s => s.x === head.x && s.y === head.y)) {
    gameOver()
    return
  }

  snake.value.unshift(head)

  // 吃食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += FOOD_SCORE
    spawnFood()
    // 加速
    if (speed.value > MIN_SPEED) {
      speed.value = Math.max(MIN_SPEED, speed.value - SPEED_STEP)
      startLoop() // 重启循环以应用新速度
    }
  } else {
    snake.value.pop()
  }

  elapsed.value = Math.floor((Date.now() - startTime.value) / 1000)
  draw()
}

function spawnFood() {
  const occupied = new Set(snake.value.map(s => `${s.x},${s.y}`))
  const free: Point[] = []
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) {
    gameOver()
    return
  }
  food.value = free[Math.floor(Math.random() * free.length)]
}

function gameOver() {
  isGameOver.value = true
  isRunning.value = false
  cleanup()
  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('game-room_snake-best', String(score.value))
  }
  elapsed.value = Math.floor((Date.now() - startTime.value) / 1000)
  emit('game-over', { gameType: 'snake', score: score.value, duration: elapsed.value })
}

function restart() {
  isGameOver.value = false
  isRunning.value = false
  startGame()
}

function handleSubmitScore() {
  submitScore({ gameType: 'snake', score: score.value, duration: elapsed.value })
}

// ── 渲染 ─────────────────────────────────────────────────────────────────────
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const cs = cellSize

  // 背景
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 网格线
  ctx.strokeStyle = 'rgba(33, 38, 45, 0.5)'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath()
    ctx.moveTo(i * cs, 0)
    ctx.lineTo(i * cs, GRID * cs)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i * cs)
    ctx.lineTo(GRID * cs, i * cs)
    ctx.stroke()
  }

  // 食物（脉动效果）
  const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 200)
  const fx = food.value.x * cs + cs / 2
  const fy = food.value.y * cs + cs / 2
  const fr = (cs / 2 - 2) * pulse
  ctx.beginPath()
  ctx.arc(fx, fy, fr, 0, Math.PI * 2)
  ctx.fillStyle = '#f85149'
  ctx.shadowColor = 'rgba(248, 81, 73, 0.6)'
  ctx.shadowBlur = 8
  ctx.fill()
  ctx.shadowBlur = 0

  // 蛇身
  snake.value.forEach((seg, i) => {
    const x = seg.x * cs + 1
    const y = seg.y * cs + 1
    const s = cs - 2

    if (i === 0) {
      // 头部
      ctx.fillStyle = '#4ae160'
      ctx.shadowColor = 'rgba(57, 211, 83, 0.5)'
      ctx.shadowBlur = 6
    } else {
      ctx.fillStyle = '#39d353'
      ctx.shadowBlur = 0
    }

    const r = Math.min(4, s / 3)
    roundRect(ctx, x, y, s, s, r)
    ctx.fill()
    ctx.shadowBlur = 0
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
</script>

<style scoped>
.snake-game {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.sg-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 480px;
}
.sg-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sg-label {
  font-size: 9px;
  letter-spacing: 0.15em;
  color: #484f58;
}
.sg-score {
  font-size: 20px;
  font-weight: 800;
}

/* Canvas */
.sg-canvas-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  border: 1px solid #21262d;
  border-radius: 4px;
  overflow: hidden;
  background: #0d1117;
}
.sg-canvas {
  display: block;
  image-rendering: pixelated;
}

/* Overlays on canvas */
.sg-start, .sg-pause {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 20, 0.7);
  gap: 8px;
}
.start-text { font-size: 16px; font-weight: 700; }
.start-hint { font-size: 11px; color: #484f58; }
.pause-text { font-size: 18px; font-weight: 700; color: #e3b341; }

/* D-pad */
.sg-dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
}
.dpad-row {
  display: flex;
  gap: 2px;
}
.dpad-btn {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: #161b22;
  border: 1px solid #21262d;
  color: #7d8590;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}
.dpad-btn:hover {
  border-color: #39d353;
  color: #39d353;
}
.dpad-btn:active {
  background: rgba(57, 211, 83, 0.1);
  transform: scale(0.95);
}
.dpad-center {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

@media (min-width: 769px) {
  .sg-dpad { display: none; }
}
</style>
