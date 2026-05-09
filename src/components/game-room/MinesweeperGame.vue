<template>
  <div class="minesweeper-game">
    <!-- 头部 -->
    <div class="ms-header">
      <button class="btn-ghost" @click="$emit('back')">← 返回</button>
      <div class="ms-stats">
        <span class="ms-stat">💣 {{ minesLeft }}</span>
        <span class="ms-stat">⏱ {{ formatTime(elapsed) }}</span>
      </div>
    </div>

    <!-- 难度选择（游戏未开始时显示） -->
    <div v-if="!isStarted" class="ms-difficulty animate-fade-in">
      <div class="diff-title">选择难度</div>
      <div class="diff-buttons">
        <button
          v-for="(preset, key) in MINESWEEPER_PRESETS"
          :key="key"
          class="diff-btn card"
          :class="{ active: difficulty === key }"
          @click="difficulty = key"
        >
          <div class="diff-label">{{ preset.label }}</div>
          <div class="diff-detail">{{ preset.mines }} 颗雷</div>
        </button>
      </div>
      <button class="btn-primary ms-start-btn" @click="startGame">
        开始游戏
      </button>
    </div>

    <!-- 游戏控制栏 -->
    <div v-if="isStarted" class="ms-controls">
      <!-- 移动端模式切换 -->
      <div class="mode-toggle">
        <button
          class="mode-btn"
          :class="{ active: mode === 'dig' }"
          @click="mode = 'dig'"
        >
          ⛏ 挖掘
        </button>
        <button
          class="mode-btn"
          :class="{ active: mode === 'flag' }"
          @click="mode = 'flag'"
        >
          🚩 标旗
        </button>
      </div>
      <button class="btn-ghost" @click="resetGame">↻ 新局</button>
    </div>

    <!-- 游戏网格 -->
    <div v-if="isStarted" class="ms-grid-wrap">
      <div
        class="ms-grid"
        :style="gridStyle"
        @contextmenu.prevent
      >
        <div
          v-for="(cell, idx) in flatGrid"
          :key="idx"
          class="ms-cell"
          :class="cellClass(cell)"
          @click="handleClick(cell)"
          @contextmenu.prevent="handleRightClick(cell)"
        >
          <span v-if="cell.isRevealed && !cell.isMine && cell.adjacentMines" class="cell-num" :class="`num-${cell.adjacentMines}`">
            {{ cell.adjacentMines }}
          </span>
          <span v-if="cell.isFlagged && !cell.isRevealed" class="cell-flag">⚑</span>
          <span v-if="cell.isRevealed && cell.isMine" class="cell-mine">💥</span>
        </div>
      </div>
    </div>

    <!-- 游戏结束 -->
    <GameOverlay
      v-if="isGameOver"
      :title="isWin ? 'YOU WIN!' : 'GAME OVER'"
      :subtitle="isWin ? `扫雷成功！难度: ${MINESWEEPER_PRESETS[difficulty].label}` : '踩到地雷了'"
      :score="finalScore"
      :duration="elapsed"
      :show-leaderboard="true"
      :is-win="isWin"
      @restart="resetGame"
      @back="$emit('back')"
      @submit-score="handleSubmitScore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { submitScore } from '@/composables/useGameLeaderboard'
import GameOverlay from './GameOverlay.vue'
import { MINESWEEPER_PRESETS } from '@/types/game-room'
import type { MinesweeperDifficulty, GameResult } from '@/types/game-room'

const emit = defineEmits<{
  (e: 'game-over', result: GameResult): void
  (e: 'back'): void
}>()

interface Cell {
  x: number
  y: number
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
}

const difficulty = ref<MinesweeperDifficulty>('easy')
const grid = ref<Cell[][]>([])
const isStarted = ref(false)
const isGameOver = ref(false)
const isWin = ref(false)
const elapsed = ref(0)
const finalScore = ref(0)
const mode = ref<'dig' | 'flag'>('dig')
const minesLeft = ref(0)

let timerInterval: ReturnType<typeof setInterval> | null = null
let startTime = 0
let firstClick = true

const preset = computed(() => MINESWEEPER_PRESETS[difficulty.value])

const flatGrid = computed(() => grid.value.flat())

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${preset.value.cols}, 1fr)`,
}))

// ── 网格初始化 ───────────────────────────────────────────────────────────────
function createGrid(): Cell[][] {
  const { rows, cols } = preset.value
  const g: Cell[][] = []
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = []
    for (let x = 0; x < cols; x++) {
      row.push({ x, y, isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0 })
    }
    g.push(row)
  }
  return g
}

function placeMines(safeX: number, safeY: number) {
  const { rows, cols, mines } = preset.value
  let placed = 0
  while (placed < mines) {
    const x = Math.floor(Math.random() * cols)
    const y = Math.floor(Math.random() * rows)
    // 首次点击安全区
    if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue
    if (grid.value[y][x].isMine) continue
    grid.value[y][x].isMine = true
    placed++
  }
  // 计算相邻雷数
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid.value[y][x].isMine) continue
      let count = 0
      forNeighbors(x, y, (nx, ny) => {
        if (grid.value[ny][nx].isMine) count++
      })
      grid.value[y][x].adjacentMines = count
    }
  }
}

function forNeighbors(x: number, y: number, fn: (nx: number, ny: number) => void) {
  const { rows, cols } = preset.value
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) fn(nx, ny)
    }
  }
}

// ── 游戏操作 ─────────────────────────────────────────────────────────────────
function startGame() {
  grid.value = createGrid()
  isStarted.value = true
  isGameOver.value = false
  isWin.value = false
  firstClick = true
  elapsed.value = 0
  finalScore.value = 0
  minesLeft.value = preset.value.mines
  mode.value = 'dig'
  cleanup()
}

function resetGame() {
  isGameOver.value = false
  startGame()
}

function handleClick(cell: Cell) {
  if (isGameOver.value) return
  if (mode.value === 'flag') {
    toggleFlag(cell)
    return
  }
  reveal(cell)
}

function handleRightClick(cell: Cell) {
  if (isGameOver.value) return
  toggleFlag(cell)
}

function reveal(cell: Cell) {
  if (cell.isRevealed || cell.isFlagged) return

  // 首次点击：放置地雷
  if (firstClick) {
    firstClick = false
    placeMines(cell.x, cell.y)
    startTime = Date.now()
    timerInterval = setInterval(() => {
      elapsed.value = Math.floor((Date.now() - startTime) / 1000)
    }, 1000)
  }

  if (cell.isMine) {
    // 踩雷：揭开所有雷
    revealAllMines()
    endGame(false)
    return
  }

  // BFS 揭开
  floodReveal(cell)
  checkWin()
}

function floodReveal(cell: Cell) {
  const queue: Cell[] = [cell]
  while (queue.length > 0) {
    const c = queue.shift()!
    if (c.isRevealed || c.isFlagged || c.isMine) continue
    c.isRevealed = true
    if (c.adjacentMines === 0) {
      forNeighbors(c.x, c.y, (nx, ny) => {
        const neighbor = grid.value[ny][nx]
        if (!neighbor.isRevealed && !neighbor.isFlagged) {
          queue.push(neighbor)
        }
      })
    }
  }
}

function toggleFlag(cell: Cell) {
  if (cell.isRevealed) return
  cell.isFlagged = !cell.isFlagged
  minesLeft.value += cell.isFlagged ? -1 : 1
}

function revealAllMines() {
  for (const row of grid.value) {
    for (const cell of row) {
      if (cell.isMine) cell.isRevealed = true
    }
  }
}

function checkWin() {
  const { rows, cols, mines } = preset.value
  let revealed = 0
  for (const row of grid.value) {
    for (const cell of row) {
      if (cell.isRevealed && !cell.isMine) revealed++
    }
  }
  if (revealed === rows * cols - mines) {
    endGame(true)
  }
}

function endGame(win: boolean) {
  isGameOver.value = true
  isWin.value = win
  cleanup()
  elapsed.value = Math.floor((Date.now() - startTime) / 1000)
  finalScore.value = calculateScore(win)
  emit('game-over', {
    gameType: 'minesweeper',
    score: finalScore.value,
    difficulty: difficulty.value,
    duration: elapsed.value,
  })
}

function calculateScore(win: boolean): number {
  if (!win) return 0
  const t = elapsed.value
  const multipliers: Record<MinesweeperDifficulty, { base: number; timeMulti: number }> = {
    easy:   { base: 1000, timeMulti: 1 },
    medium: { base: 2000, timeMulti: 1.5 },
    hard:   { base: 3000, timeMulti: 2 },
  }
  const { base, timeMulti } = multipliers[difficulty.value]
  return Math.max(1, Math.round(base - t * timeMulti))
}

function handleSubmitScore() {
  submitScore({
    gameType: 'minesweeper',
    score: finalScore.value,
    difficulty: difficulty.value,
    duration: elapsed.value,
  })
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Cell 样式 ────────────────────────────────────────────────────────────────
function cellClass(cell: Cell): string {
  if (cell.isRevealed) {
    return cell.isMine ? 'cell-exploded' : 'cell-revealed'
  }
  if (cell.isFlagged) return 'cell-flagged'
  return 'cell-hidden'
}

// ── 生命周期 ─────────────────────────────────────────────────────────────────
function cleanup() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

onMounted(() => {
  // 默认开始
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.minesweeper-game {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.ms-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}
.ms-stats {
  display: flex;
  gap: 1rem;
  margin-left: auto;
}
.ms-stat {
  font-size: 14px;
  font-weight: 700;
  color: #e6edf3;
  font-variant-numeric: tabular-nums;
}

/* 难度选择 */
.ms-difficulty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}
.diff-title {
  font-size: 14px;
  font-weight: 700;
  color: #c9d1d9;
}
.diff-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.diff-btn {
  padding: 12px 16px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
  border: 1px solid #21262d;
  background: var(--glass-bg); 
}
.diff-btn:hover {
  border-color: #30363d;
}
.diff-btn.active {
  border-color: rgba(57, 211, 83, 0.4);
  background: rgba(57, 211, 83, 0.05);
}
.diff-label {
  font-size: 13px;
  font-weight: 700;
  color: #e6edf3;
}
.diff-detail {
  font-size: 11px;
  color: #484f58;
  margin-top: 2px;
}
.ms-start-btn {
  margin-top: 0.5rem;
}

/* 控制栏 */
.ms-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.mode-toggle {
  display: flex;
  gap: 2px;
  background: var(--glass-bg); 
  border-radius: 4px;
  border: 1px solid #21262d;
  overflow: hidden;
}
.mode-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  background: transparent;
  border: none;
  color: #7d8590;
  cursor: pointer;
  transition: all 0.15s;
}
.mode-btn.active {
  background: rgba(57, 211, 83, 0.1);
  color: #39d353;
}

/* Grid */
.ms-grid-wrap {
  overflow-x: auto;
  max-width: 100%;
  padding: 2px;
}
.ms-grid {
  display: grid;
  gap: 1px;
  background: var(--glass-bg); 
  border: 1px solid #21262d;
  border-radius: 4px;
  padding: 3px;
  user-select: none;
}

/* Cells */
.ms-cell {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.1s;
}

.cell-hidden {
  background: #21262d;
  border: 1px solid #30363d;
}
.cell-hidden:hover {
  background: #30363d;
}
.cell-flagged {
  background: rgba(227, 179, 65, 0.1);
  border: 1px solid rgba(227, 179, 65, 0.3);
}
.cell-revealed {
  background: var(--glass-bg); 
  border: 1px solid rgba(33, 38, 45, 0.5);
  cursor: default;
}
.cell-exploded {
  background: rgba(248, 81, 73, 0.2);
  border: 1px solid rgba(248, 81, 73, 0.4);
}

/* Number colors */
.cell-num { font-size: 13px; }
.num-1 { color: #58a6ff; }
.num-2 { color: #39d353; }
.num-3 { color: #f85149; }
.num-4 { color: #bc8cff; }
.num-5 { color: #e3b341; }
.num-6 { color: #39d353; }
.num-7 { color: #e6edf3; }
.num-8 { color: #7d8590; }

.cell-flag { color: #e3b341; font-size: 14px; }
.cell-mine { font-size: 14px; }

/* 响应式 cell 大小 */
@media (max-width: 600px) {
  .ms-cell {
    width: 24px;
    height: 24px;
    font-size: 11px;
  }
  .cell-num { font-size: 11px; }
  .cell-flag, .cell-mine { font-size: 12px; }
}
</style>
