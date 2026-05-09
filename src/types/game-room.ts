// ── GameRoom 类型定义 ─────────────────────────────────────────────────────────

export type GameType = 'snake' | '2048' | 'minesweeper'

export const GAME_TYPES: GameType[] = ['snake', '2048', 'minesweeper']

export const GAME_LABELS: Record<GameType, { label: string; labelCN: string; icon: string; description: string }> = {
  snake: {
    label: 'Snake',
    labelCN: '贪吃蛇',
    icon: '🐍',
    description: '经典贪吃蛇 — 吃食生长，撞墙即亡',
  },
  '2048': {
    label: '2048',
    labelCN: '2048',
    icon: '🔢',
    description: '滑动合并，目标 2048 瓦片',
  },
  minesweeper: {
    label: 'Minesweeper',
    labelCN: '扫雷',
    icon: '💣',
    description: '经典扫雷 — 标记地雷，揭开安全格',
  },
}

export interface LeaderboardEntry {
  id: string
  playerName: string
  gameType: GameType
  score: number
  difficulty?: string
  duration?: number
  gridSize?: string
  createdAt: string
}

export interface GameResult {
  gameType: GameType
  score: number
  difficulty?: string
  duration?: number
  gridSize?: string
}

export type MinesweeperDifficulty = 'easy' | 'medium' | 'hard'

export const MINESWEEPER_PRESETS: Record<MinesweeperDifficulty, { rows: number; cols: number; mines: number; label: string }> = {
  easy:   { rows: 9,  cols: 9,  mines: 10, label: '简单 9×9' },
  medium: { rows: 16, cols: 16, mines: 40, label: '中等 16×16' },
  hard:   { rows: 16, cols: 30, mines: 99, label: '困难 16×30' },
}
