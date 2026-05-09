import type { LeaderboardEntry, GameType } from '@/types/game-room'
import { cos, BUCKET, REGION } from './storageUpload'

const DATA_KEY = 'game-room/leaderboard.json'
const LS_KEY = 'game-room_leaderboard'
const MAX_PER_GAME = 50

const cosAvailable = (): boolean => !!(BUCKET && REGION)

// ── COS 读写 ──────────────────────────────────────────────────────────────────
async function loadFromCOS(): Promise<LeaderboardEntry[]> {
  return new Promise((resolve) => {
    cos.getObject(
      { Bucket: BUCKET, Region: REGION, Key: DATA_KEY },
      (err, data) => {
        if (err) { resolve([]); return }
        try {
          const text = typeof data.Body === 'string'
            ? data.Body
            : new TextDecoder().decode(data.Body as ArrayBuffer)
          resolve(JSON.parse(text) as LeaderboardEntry[])
        } catch {
          resolve([])
        }
      },
    )
  })
}

async function saveToCOS(entries: LeaderboardEntry[]): Promise<void> {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: DATA_KEY,
        Body: JSON.stringify(entries, null, 2),
        ContentType: 'application/json',
      },
      (err) => {
        if (err) reject(new Error(`排行榜保存失败: ${err.message}`))
        else resolve()
      },
    )
  })
}

// ── localStorage 降级 ─────────────────────────────────────────────────────────
function loadFromLS(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as LeaderboardEntry[]
  } catch { /* ignore */ }
  return []
}

function saveToLS(entries: LeaderboardEntry[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(entries))
}

// ── 内部读写 ──────────────────────────────────────────────────────────────────
async function load(): Promise<LeaderboardEntry[]> {
  return cosAvailable() ? loadFromCOS() : loadFromLS()
}

/** 每个游戏类型仅保留 Top N，按分数降序 + 时间降序 */
function trimToTop(entries: LeaderboardEntry[], max = MAX_PER_GAME): LeaderboardEntry[] {
  const grouped = new Map<GameType, LeaderboardEntry[]>()
  for (const e of entries) {
    const arr = grouped.get(e.gameType) ?? []
    arr.push(e)
    grouped.set(e.gameType, arr)
  }
  const result: LeaderboardEntry[] = []
  for (const arr of grouped.values()) {
    arr.sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
    result.push(...arr.slice(0, max))
  }
  return result
}

// ── 公开 API ──────────────────────────────────────────────────────────────────
export async function getAll(): Promise<LeaderboardEntry[]> {
  return load()
}

export async function getByGame(gameType: GameType): Promise<LeaderboardEntry[]> {
  return (await load())
    .filter(e => e.gameType === gameType)
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
}

export async function addEntry(
  entry: Omit<LeaderboardEntry, 'id' | 'createdAt'>,
): Promise<LeaderboardEntry> {
  const entries = await load()
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `gr${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  entries.push(newEntry)
  await save(entries)
  return newEntry
}

export async function deleteEntry(id: string): Promise<void> {
  await save((await load()).filter(e => e.id !== id))
}

/** 直接保存条目列表（供 composable 同步使用） */
export async function save(entries: LeaderboardEntry[]): Promise<void> {
  const trimmed = trimToTop(entries)
  if (cosAvailable()) await saveToCOS(trimmed)
  else saveToLS(trimmed)
}
