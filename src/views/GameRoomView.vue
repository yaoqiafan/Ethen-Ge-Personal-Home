<template>
  <div class="game-room-view animate-fade-in">
    <!-- 标题 -->
    <div class="gr-header">
      <div class="gr-title">
        <span class="gr-icon">⌘</span>
        游戏室
        <span class="gr-title-sub">Game Room</span>
      </div>
      <div class="gr-status">
        <span class="status-dot online"></span>
        <span class="gr-status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- 阶段内容 -->
    <TerminalLauncher
      v-if="phase === 'launcher'"
      @select-game="startGame"
      @show-leaderboard="phase = 'leaderboard'"
    />

    <SnakeGame
      v-if="phase === 'snake'"
      @game-over="handleGameOver"
      @back="phase = 'launcher'"
    />

    <Game2048
      v-if="phase === '2048'"
      @game-over="handleGameOver"
      @back="phase = 'launcher'"
    />

    <MinesweeperGame
      v-if="phase === 'minesweeper'"
      @game-over="handleGameOver"
      @back="phase = 'launcher'"
    />

    <GameLeaderboard
      v-if="phase === 'leaderboard'"
      @back="phase = 'launcher'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TerminalLauncher from '@/components/game-room/TerminalLauncher.vue'
import SnakeGame from '@/components/game-room/SnakeGame.vue'
import Game2048 from '@/components/game-room/Game2048.vue'
import MinesweeperGame from '@/components/game-room/MinesweeperGame.vue'
import GameLeaderboard from '@/components/game-room/GameLeaderboard.vue'
import { loadLeaderboard, startSync, stopSync, currentPlayerName, submitScore } from '@/composables/useGameLeaderboard'
import { GAME_LABELS } from '@/types/game-room'
import type { GameType, GameResult } from '@/types/game-room'

type Phase = 'launcher' | 'snake' | '2048' | 'minesweeper' | 'leaderboard'

const phase = ref<Phase>('launcher')

const statusText = computed(() => {
  if (phase.value === 'launcher') return '等待选择游戏'
  if (phase.value === 'leaderboard') return '查看排行榜'
  return `正在游玩: ${GAME_LABELS[phase.value as GameType]?.labelCN ?? ''}`
})

function startGame(gameType: GameType) {
  phase.value = gameType
}

async function handleGameOver(result: GameResult) {
  // 确保有玩家名，没有则用默认值
  if (!currentPlayerName.value.trim()) {
    currentPlayerName.value = 'Anonymous'
  }
  await submitScore(result)
  // 短暂延迟后返回 launcher
  setTimeout(() => {
    if (phase.value !== 'launcher') {
      phase.value = 'launcher'
    }
  }, 100)
}

onMounted(async () => {
  await loadLeaderboard()
  startSync()
})

onUnmounted(() => {
  stopSync()
})
</script>

<style scoped>
.game-room-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 700px;
  width: 100%;
}

.gr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gr-title {
  font-size: 18px;
  font-weight: 800;
  color: #e6edf3;
  display: flex;
  align-items: center;
  gap: 8px;
}
.gr-icon {
  color: #39d353;
}
.gr-title-sub {
  font-size: 12px;
  color: #484f58;
  font-weight: 400;
}
.gr-status {
  display: flex;
  align-items: center;
  gap: 6px;
}
.gr-status-text {
  font-size: 11px;
  color: #484f58;
}

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
</style>
