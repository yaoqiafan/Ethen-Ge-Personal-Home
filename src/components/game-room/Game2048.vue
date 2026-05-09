<template>
  <div class="game-2048">
    <!-- 头部 -->
    <div class="g2-header">
      <button class="btn-ghost" @click="$emit('back')">← 返回</button>
      <div class="g2-info">
        <span class="g2-label">SCORE</span>
        <span class="g2-score glow-cyan">{{ score }}</span>
      </div>
      <div class="g2-info">
        <span class="g2-label">BEST</span>
        <span class="g2-score">{{ bestTile }}</span>
      </div>
      <button class="btn-ghost" @click="restart">↻ 新局</button>
    </div>

    <!-- 4x4 网格 -->
    <div class="g2-grid-wrap">
      <div class="g2-grid">
        <div
          v-for="(val, idx) in flatCells"
          :key="idx"
          class="g2-cell"
          :class="[`tile-${val}`, { 'tile-new': newCells.has(idx), 'tile-merged': mergedCells.has(idx) }]"
        >
          <span v-if="val" class="tile-val">{{ val }}</span>
        </div>
      </div>

      <!-- 开始提示 -->
      <div v-if="!isRunning && !isGameOver" class="g2-overlay animate-fade-in">
        <div class="ov-text glow-green">滑动或按方向键开始</div>
      </div>
    </div>

    <!-- 游戏结束 -->
    <GameOverlay
      v-if="isGameOver"
      :title="isWon ? 'YOU WIN!' : 'GAME OVER'"
      :subtitle="isWon ? '达到 2048！' : `最高瓦片: ${bestTile}`"
      :score="score"
      :duration="elapsed"
      :show-leaderboard="true"
      :is-win="isWon"
      @restart="restart"
      @back="$emit('back')"
      @submit-score="handleSubmitScore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { submitScore } from '@/composables/useGameLeaderboard'
import GameOverlay from './GameOverlay.vue'
import type { GameResult } from '@/types/game-room'

const emit = defineEmits<{
  (e: 'game-over', result: GameResult): void
  (e: 'back'): void
}>()

const SIZE = 4

const cells = ref<number[][]>(createEmpty())
const score = ref(0)
const bestTile = ref(0)
const isRunning = ref(false)
const isGameOver = ref(false)
const isWon = ref(false)
const elapsed = ref(0)
const newCells = ref(new Set<number>())
const mergedCells = ref(new Set<number>())

let startTime = 0
let timerInterval: ReturnType<typeof setInterval> | null = null
let touchStartX = 0
let touchStartY = 0

function createEmpty(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

const flatCells = computed(() => cells.value.flat())

onMounted(() => {
  initGame()
  window.addEventListener('keydown', onKeyDown)

  const wrap = document.querySelector('.g2-grid')
  if (wrap) {
    wrap.addEventListener('touchstart', onTouchStart as EventListener, { passive: false })
    wrap.addEventListener('touchend', onTouchEnd as EventListener, { passive: false })
  }
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('keydown', onKeyDown)
})

function cleanup() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

// ── 初始化 ───────────────────────────────────────────────────────────────────
function initGame() {
  cells.value = createEmpty()
  score.value = 0
  bestTile.value = 0
  isGameOver.value = false
  isWon.value = false
  newCells.value.clear()
  mergedCells.value.clear()
  addRandomTile()
  addRandomTile()
  updateBestTile()
}

function restart() {
  isGameOver.value = false
  isRunning.value = false
  cleanup()
  initGame()
}

// ── 添加随机瓦片 ─────────────────────────────────────────────────────────────
function addRandomTile(): void {
  const empty: number[] = []
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (cells.value[y][x] === 0) empty.push(y * SIZE + x)
    }
  }
  if (empty.length === 0) return
  const idx = empty[Math.floor(Math.random() * empty.length)]
  const val = Math.random() < 0.9 ? 2 : 4
  cells.value[Math.floor(idx / SIZE)][idx % SIZE] = val
  newCells.value.add(idx)
  setTimeout(() => newCells.value.delete(idx), 300)
}

// ── 滑动逻辑 ─────────────────────────────────────────────────────────────────
type MoveDir = 'left' | 'right' | 'up' | 'down'

function mergeLine(line: number[]): { result: number[]; gained: number; mergedAt: number[] } {
  const filtered = line.filter(n => n !== 0)
  const result: number[] = []
  const mergedAt: number[] = []
  let gained = 0
  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2
      result.push(merged)
      mergedAt.push(result.length - 1)
      gained += merged
      i += 2
    } else {
      result.push(filtered[i])
      i++
    }
  }
  while (result.length < SIZE) result.push(0)
  return { result, gained, mergedAt }
}

function move(direction: MoveDir): boolean {
  const prev = JSON.stringify(cells.value)
  let totalGained = 0
  mergedCells.value.clear()

  if (direction === 'left' || direction === 'right') {
    for (let y = 0; y < SIZE; y++) {
      let row = [...cells.value[y]]
      if (direction === 'right') row.reverse()
      const { result, gained, mergedAt } = mergeLine(row)
      if (direction === 'right') result.reverse()
      cells.value[y] = result
      totalGained += gained
      // 标记合并位置
      mergedAt.forEach(pos => {
        const actualPos = direction === 'right' ? SIZE - 1 - pos : pos
        mergedCells.value.add(y * SIZE + actualPos)
      })
    }
  } else {
    for (let x = 0; x < SIZE; x++) {
      let col = cells.value.map(row => row[x])
      if (direction === 'down') col.reverse()
      const { result, gained, mergedAt } = mergeLine(col)
      if (direction === 'down') result.reverse()
      for (let y = 0; y < SIZE; y++) cells.value[y][x] = result[y]
      totalGained += gained
      mergedAt.forEach(pos => {
        const actualPos = direction === 'down' ? SIZE - 1 - pos : pos
        mergedCells.value.add(actualPos * SIZE + x)
      })
    }
  }

  const changed = JSON.stringify(cells.value) !== prev
  if (changed) {
    score.value += totalGained
    updateBestTile()
    addRandomTile()

    if (!isRunning.value) {
      isRunning.value = true
      startTime = Date.now()
      timerInterval = setInterval(() => {
        elapsed.value = Math.floor((Date.now() - startTime) / 1000)
      }, 1000)
    }

    // 清除合并标记
    setTimeout(() => mergedCells.value.clear(), 200)

    // 检查胜负
    if (bestTile.value >= 2048 && !isWon.value) {
      isWon.value = true
    }
    if (!canMove()) {
      isGameOver.value = true
      elapsed.value = Math.floor((Date.now() - startTime) / 1000)
      cleanup()
      emit('game-over', { gameType: '2048', score: score.value, duration: elapsed.value })
    }
  }

  return changed
}

function canMove(): boolean {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (cells.value[y][x] === 0) return true
      if (x < SIZE - 1 && cells.value[y][x] === cells.value[y][x + 1]) return true
      if (y < SIZE - 1 && cells.value[y][x] === cells.value[y + 1][x]) return true
    }
  }
  return false
}

function updateBestTile() {
  bestTile.value = Math.max(...cells.value.flat())
}

// ── 输入 ─────────────────────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  const map: Record<string, MoveDir> = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  }
  const d = map[e.key]
  if (d) {
    e.preventDefault()
    move(d)
  }
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
  if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return
  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left')
  } else {
    move(dy > 0 ? 'down' : 'up')
  }
}

function handleSubmitScore() {
  submitScore({ gameType: '2048', score: score.value, duration: elapsed.value })
}
</script>

<style scoped>
.game-2048 {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.g2-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 360px;
}
.g2-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.g2-label {
  font-size: 9px;
  letter-spacing: 0.15em;
  color: #484f58;
}
.g2-score {
  font-size: 20px;
  font-weight: 800;
}

/* Grid */
.g2-grid-wrap {
  position: relative;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 8px;
}
.g2-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.g2-cell {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #0d1117;
  border: 1px solid #21262d;
  font-weight: 800;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

/* Tile values */
.tile-val { font-size: 22px; }

.tile-2  { background: #161b22; color: #7d8590; border-color: #30363d; }
.tile-2 .tile-val { font-size: 22px; }
.tile-4  { background: #1c2230; color: #c9d1d9; border-color: #30363d; }
.tile-8  { background: rgba(249, 115, 22, 0.15); color: #f97316; border-color: rgba(249, 115, 22, 0.3); }
.tile-16 { background: rgba(249, 115, 22, 0.25); color: #fb923c; border-color: rgba(249, 115, 22, 0.4); }
.tile-32 { background: rgba(248, 81, 73, 0.2); color: #f85149; border-color: rgba(248, 81, 73, 0.3); }
.tile-64 { background: rgba(248, 81, 73, 0.3); color: #ff6b6b; border-color: rgba(248, 81, 73, 0.4); }
.tile-128  { background: rgba(57, 211, 83, 0.12); color: #39d353; border-color: rgba(57, 211, 83, 0.3); }
.tile-256  { background: rgba(57, 211, 83, 0.2); color: #4ae160; border-color: rgba(57, 211, 83, 0.4); }
.tile-512  { background: rgba(57, 211, 83, 0.28); color: #4ae160; border-color: rgba(57, 211, 83, 0.5); }
.tile-1024 { background: rgba(57, 211, 83, 0.36); color: #6ff07a; border-color: rgba(57, 211, 83, 0.6); }
.tile-1024 .tile-val { font-size: 18px; }
.tile-2048 {
  background: rgba(227, 179, 65, 0.25);
  color: #e3b341;
  border-color: rgba(227, 179, 65, 0.5);
  animation: pulseGlow 2s infinite;
}
.tile-2048 .tile-val { font-size: 18px; }

/* Large numbers beyond 2048 */
.tile-4096, .tile-8192 {
  background: rgba(188, 140, 255, 0.2);
  color: #bc8cff;
  border-color: rgba(188, 140, 255, 0.4);
}
.tile-4096 .tile-val, .tile-8192 .tile-val { font-size: 16px; }

/* Animations */
.tile-new {
  animation: tileAppear 0.2s ease;
}
.tile-merged {
  animation: tileMerge 0.2s ease;
}

@keyframes tileAppear {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes tileMerge {
  0% { transform: scale(1); }
  50% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(227, 179, 65, 0.3); }
  50% { box-shadow: 0 0 16px rgba(227, 179, 65, 0.6); }
}

/* Overlay */
.g2-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 20, 0.6);
  border-radius: 8px;
}
.ov-text { font-size: 14px; font-weight: 700; }

/* 移动端响应 */
@media (max-width: 400px) {
  .g2-cell {
    width: 60px;
    height: 60px;
  }
  .tile-val { font-size: 18px; }
  .tile-1024 .tile-val, .tile-2048 .tile-val { font-size: 14px; }
  .tile-4096 .tile-val, .tile-8192 .tile-val { font-size: 12px; }
}
</style>
