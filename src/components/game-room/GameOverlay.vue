<template>
  <div class="game-overlay animate-fade-in" @click.self="$emit('back')">
    <div class="overlay-card card animate-slide-up">
      <div class="overlay-title" :class="isWin ? 'glow-green' : 'glow-red'">
        {{ title }}
      </div>
      <div v-if="subtitle" class="overlay-subtitle">{{ subtitle }}</div>

      <div class="overlay-score">
        <span class="score-label">SCORE</span>
        <span class="score-value glow-cyan">{{ score }}</span>
      </div>
      <div v-if="duration" class="overlay-duration">
        用时 {{ Math.floor(duration / 60) }}分{{ duration % 60 }}秒
      </div>

      <div class="overlay-actions">
        <button class="btn-primary" @click="$emit('restart')">
          ↻ 再来一局
        </button>
        <button v-if="showLeaderboard" class="btn-ghost" @click="$emit('submit-score')">
          🏆 排行榜
        </button>
        <button class="btn-ghost" @click="$emit('back')">
          ← 返回
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  score: number
  duration?: number
  showLeaderboard?: boolean
  isWin?: boolean
}>()

defineEmits<{
  (e: 'restart'): void
  (e: 'back'): void
  (e: 'submit-score'): void
}>()
</script>

<style scoped>
.game-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 14, 20, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  backdrop-filter: blur(4px);
}

.overlay-card {
  text-align: center;
  padding: 2rem 2.5rem;
  min-width: 280px;
  max-width: 360px;
}

.overlay-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
}

.overlay-subtitle {
  font-size: 12px;
  color: #7d8590;
  margin-bottom: 1rem;
}

.overlay-score {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 1rem 0;
}
.score-label {
  font-size: 10px;
  letter-spacing: 0.15em;
  color: #484f58;
}
.score-value {
  font-size: 36px;
  font-weight: 800;
}

.overlay-duration {
  font-size: 12px;
  color: #7d8590;
  margin-bottom: 0.5rem;
}

.overlay-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 1.5rem;
}
</style>
