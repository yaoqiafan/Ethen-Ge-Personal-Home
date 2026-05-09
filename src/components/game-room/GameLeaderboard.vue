<template>
  <div class="game-leaderboard animate-fade-in">
    <!-- 头部 -->
    <div class="lb-header">
      <h3 class="lb-title glow-green">🏆 排行榜 <span class="lb-title-sub">Leaderboard</span></h3>
      <button class="btn-ghost" @click="$emit('back')">← 返回</button>
    </div>

    <!-- 玩家名设置 -->
    <div class="lb-player card">
      <label class="player-label">玩家名称</label>
      <input
        v-model="name"
        class="player-input"
        placeholder="输入你的名字..."
        maxlength="20"
      />
      <span class="player-hint">仅本地保存，用于排行榜显示</span>
    </div>

    <!-- 游戏 Tab -->
    <div class="lb-tabs">
      <button
        class="lb-tab"
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        全部
      </button>
      <button
        v-for="gt in GAME_TYPES"
        :key="gt"
        class="lb-tab"
        :class="{ active: activeTab === gt }"
        @click="activeTab = gt"
      >
        {{ GAME_LABELS[gt].icon }} {{ GAME_LABELS[gt].labelCN }}
      </button>
    </div>

    <!-- 排行榜表格 -->
    <div class="lb-table-wrap card">
      <table v-if="filteredEntries.length" class="lb-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-player">玩家</th>
            <th class="col-score">分数</th>
            <th v-if="showDifficulty" class="col-diff">难度</th>
            <th class="col-time">用时</th>
            <th class="col-game">游戏</th>
            <th class="col-date">日期</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, i) in filteredEntries" :key="entry.id" class="lb-row">
            <td class="col-rank">
              <span v-if="i === 0" class="rank-gold">🥇</span>
              <span v-else-if="i === 1" class="rank-silver">🥈</span>
              <span v-else-if="i === 2" class="rank-bronze">🥉</span>
              <span v-else class="rank-num">{{ i + 1 }}</span>
            </td>
            <td class="col-player">{{ entry.playerName }}</td>
            <td class="col-score glow-cyan">{{ entry.score }}</td>
            <td v-if="showDifficulty" class="col-diff">
              <span v-if="entry.difficulty" class="tag">{{ entry.difficulty }}</span>
            </td>
            <td class="col-time">
              {{ entry.duration ? `${Math.floor(entry.duration / 60)}:${String(entry.duration % 60).padStart(2, '0')}` : '-' }}
            </td>
            <td class="col-game">
              {{ GAME_LABELS[entry.gameType]?.icon }} {{ GAME_LABELS[entry.gameType]?.labelCN }}
            </td>
            <td class="col-date">{{ formatDate(entry.createdAt) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="lb-empty">
        <div class="empty-icon">🎮</div>
        <div>暂无记录，快去挑战吧！</div>
      </div>
    </div>

    <!-- 同步状态 -->
    <div class="lb-sync">
      <span class="status-dot" :class="isLoading ? 'warn' : 'online'"></span>
      <span class="sync-text">{{ isLoading ? '同步中...' : '已同步' }}</span>
      <span v-if="syncError" class="sync-err">{{ syncError }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { allEntries, currentPlayerName, isLoading, syncError } from '@/composables/useGameLeaderboard'
import { GAME_TYPES, GAME_LABELS } from '@/types/game-room'
import type { GameType } from '@/types/game-room'

defineEmits<{ (e: 'back'): void }>()

const activeTab = ref<GameType | 'all'>('all')
const name = computed({
  get: () => currentPlayerName.value,
  set: (v: string) => { currentPlayerName.value = v },
})

const filteredEntries = computed(() => {
  let list = allEntries.value
  if (activeTab.value !== 'all') {
    list = list.filter(e => e.gameType === activeTab.value)
  }
  return [...list].sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
})

const showDifficulty = computed(() => {
  if (activeTab.value === 'minesweeper') return true
  if (activeTab.value === 'all') return listHasDifficulty.value
  return false
})

const listHasDifficulty = computed(() =>
  allEntries.value.some(e => e.gameType === 'minesweeper'),
)

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}
</script>

<style scoped>
.game-leaderboard {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lb-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}
.lb-title-sub {
  font-size: 12px;
  color: #484f58;
  font-weight: 400;
}

/* 玩家名 */
.lb-player {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  flex-wrap: wrap;
}
.player-label {
  font-size: 12px;
  color: #7d8590;
  white-space: nowrap;
}
.player-input {
  flex: 1;
  min-width: 120px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 4px;
  padding: 6px 10px;
  color: #e6edf3;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.player-input:focus {
  border-color: #39d353;
  box-shadow: 0 0 0 2px rgba(57, 211, 83, 0.1);
}
.player-hint {
  font-size: 10px;
  color: #484f58;
}

/* Tabs */
.lb-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.lb-tab {
  padding: 6px 14px;
  font-size: 12px;
  font-family: inherit;
  background: transparent;
  border: 1px solid #21262d;
  border-radius: 4px;
  color: #7d8590;
  cursor: pointer;
  transition: all 0.15s;
}
.lb-tab:hover {
  border-color: #30363d;
  color: #c9d1d9;
}
.lb-tab.active {
  background: rgba(57, 211, 83, 0.1);
  border-color: rgba(57, 211, 83, 0.3);
  color: #39d353;
}

/* 表格 */
.lb-table-wrap {
  padding: 0;
  overflow-x: auto;
}
.lb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.lb-table th {
  padding: 8px 10px;
  text-align: left;
  color: #484f58;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid #21262d;
  white-space: nowrap;
}
.lb-table td {
  padding: 7px 10px;
  border-bottom: 1px solid rgba(33, 38, 45, 0.5);
  white-space: nowrap;
}
.lb-row:hover {
  background: rgba(57, 211, 83, 0.03);
}
.col-rank { width: 40px; text-align: center; }
.col-score { font-weight: 700; }
.col-date { color: #484f58; }
.rank-num { color: #484f58; }

/* 空状态 */
.lb-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: #484f58;
}
.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

/* 同步状态 */
.lb-sync {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #484f58;
}
.sync-err { color: #f85149; }

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.online {
  background: #39d353;
  box-shadow: 0 0 5px rgba(57, 211, 83, 0.8);
}
.status-dot.warn {
  background: #e3b341;
  box-shadow: 0 0 5px rgba(227, 179, 65, 0.8);
}
</style>
