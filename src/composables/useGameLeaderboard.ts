import { ref, computed, type ComputedRef } from 'vue'
import type { LeaderboardEntry, GameType, GameResult } from '@/types/game-room'
import * as gameRoomSvc from '@/services/gameRoomService'

// ── 模块级单例状态 ────────────────────────────────────────────────────────────
const entries = ref<LeaderboardEntry[]>([])
const loading = ref(false)
const error = ref('')

// 玩家名（仅存 localStorage，不同设备各自维护）
const PLAYER_LS_KEY = 'game-room_player-name'
const playerName = ref(localStorage.getItem(PLAYER_LS_KEY) || '')

// 防抖 & 轮询定时器
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let pollingTimer: ReturnType<typeof setInterval> | null = null

function scheduleSyncToRemote(): void {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(async () => {
    syncDebounceTimer = null
    try {
      await gameRoomSvc.save(entries.value)
    } catch (e) {
      console.warn('[GameLeaderboard] 远端同步失败:', e)
    }
  }, 500)
}

async function pollRemote(): Promise<void> {
  if (syncDebounceTimer) return
  try {
    const remote = await gameRoomSvc.getAll()
    if (!syncDebounceTimer) {
      entries.value = remote
    }
  } catch { /* 静默忽略轮询错误 */ }
}

// ── 公开 API ──────────────────────────────────────────────────────────────────
export const allEntries = computed(() => entries.value)
export const isLoading = computed(() => loading.value)
export const syncError = computed(() => error.value)

export const currentPlayerName = computed({
  get: () => playerName.value,
  set: (name: string) => {
    playerName.value = name
    localStorage.setItem(PLAYER_LS_KEY, name)
  },
})

export function getEntriesForGame(gameType: GameType): ComputedRef<LeaderboardEntry[]> {
  return computed(() =>
    entries.value
      .filter(e => e.gameType === gameType)
      .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt)),
  )
}

export async function loadLeaderboard(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    entries.value = await gameRoomSvc.getAll()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

export async function submitScore(result: GameResult): Promise<void> {
  const name = playerName.value.trim() || 'Anonymous'
  const entry = await gameRoomSvc.addEntry({
    playerName: name,
    gameType: result.gameType,
    score: result.score,
    difficulty: result.difficulty,
    duration: result.duration,
    gridSize: result.gridSize,
  })
  entries.value.push(entry)
  // 手动排序
  entries.value.sort((a, b) => b.score - a.score)
  scheduleSyncToRemote()
}

export function startSync(): void {
  stopSync()
  pollingTimer = setInterval(pollRemote, 4000)
}

export function stopSync(): void {
  if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null }
  if (syncDebounceTimer) { clearTimeout(syncDebounceTimer); syncDebounceTimer = null }
}
