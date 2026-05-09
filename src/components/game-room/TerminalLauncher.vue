<template>
  <div class="terminal-launcher animate-fade-in">
    <div class="terminal-frame">
      <!-- Window chrome -->
      <div class="term-titlebar">
        <div class="term-dot red"></div>
        <div class="term-dot yellow"></div>
        <div class="term-dot green"></div>
        <span class="term-title">game-room — ethen-ge-os</span>
      </div>

      <!-- Terminal body -->
      <div class="term-body" ref="bodyRef">
        <!-- Boot sequence lines -->
        <div v-for="(line, i) in bootLines" :key="i" class="term-line" :class="`line-${line.type}`">
          <span class="line-badge" v-if="line.badge">{{ line.badge }}</span>
          <span class="line-text">{{ line.text }}</span>
        </div>

        <!-- Interactive game cards -->
        <div v-if="phase === 'ready'" class="game-cards animate-fade-in">
          <div
            v-for="gt in GAME_TYPES"
            :key="gt"
            class="game-card"
            @click="$emit('select-game', gt)"
          >
            <span class="gc-icon">{{ GAME_LABELS[gt].icon }}</span>
            <span class="gc-name">{{ gt }}</span>
            <span class="gc-status">[ready]</span>
            <span class="gc-desc">{{ GAME_LABELS[gt].description }}</span>
          </div>
          <div class="game-card" @click="$emit('show-leaderboard')">
            <span class="gc-icon">🏆</span>
            <span class="gc-name">leaderboard</span>
            <span class="gc-status">[ready]</span>
            <span class="gc-desc">查看排行榜</span>
          </div>
        </div>

        <!-- Command input -->
        <div v-if="phase === 'ready'" class="term-input-row">
          <span class="term-prompt">&gt;</span>
          <input
            ref="inputRef"
            v-model="cmdText"
            class="term-input"
            placeholder="输入游戏名或 help..."
            @keydown.enter="handleCommand"
            @keydown.up.prevent="historyUp"
            @keydown.down.prevent="historyDown"
            spellcheck="false"
          />
          <span class="term-cursor">█</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { GAME_TYPES, GAME_LABELS } from '@/types/game-room'
import type { GameType } from '@/types/game-room'

const emit = defineEmits<{
  (e: 'select-game', gameType: GameType): void
  (e: 'show-leaderboard'): void
}>()

type BootLine = { text: string; type: string; badge?: string }

const bodyRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const phase = ref<'booting' | 'ready'>('booting')
const bootLines = ref<BootLine[]>([])
const cmdText = ref('')

// 命令历史
const cmdHistory = ref<string[]>([])
const historyIdx = ref(-1)

const BOOT_SEQUENCE: BootLine[] = [
  { text: '> game-room --init', type: 'cmd' },
  { text: 'Loading game modules...', type: 'info' },
  { text: '', type: 'blank' },
  { text: '  Available games:', type: 'ok', badge: ' OK ' },
  { text: '', type: 'blank' },
]

onMounted(async () => {
  for (const line of BOOT_SEQUENCE) {
    bootLines.value.push(line)
    await nextTick()
    scrollToBottom()
    await sleep(150)
  }
  phase.value = 'ready'
  await nextTick()
  inputRef.value?.focus()
})

function scrollToBottom() {
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function handleCommand(): void {
  const cmd = cmdText.value.trim()
  if (!cmd) return

  // 记录历史
  cmdHistory.value.unshift(cmd)
  if (cmdHistory.value.length > 50) cmdHistory.value.pop()
  historyIdx.value = -1

  // 将命令显示在终端
  bootLines.value.push({ text: `> ${cmd}`, type: 'cmd' })

  const normalized = cmd.toLowerCase()
  if (normalized === 'snake') {
    emit('select-game', 'snake')
  } else if (normalized === '2048') {
    emit('select-game', '2048')
  } else if (normalized === 'minesweeper' || normalized === 'ms') {
    emit('select-game', 'minesweeper')
  } else if (normalized === 'leaderboard' || normalized === 'lb' || normalized === '排行榜') {
    emit('show-leaderboard')
  } else if (normalized === 'help') {
    bootLines.value.push({ text: '  可用: snake | 2048 | minesweeper | leaderboard | help | clear', type: 'info' })
  } else if (normalized === 'clear') {
    bootLines.value = []
  } else {
    bootLines.value.push({ text: `  未知命令: ${cmd}. 输入 'help' 查看选项`, type: 'error', badge: ' ERR ' })
  }

  cmdText.value = ''
  nextTick(scrollToBottom)
}

function historyUp(): void {
  if (cmdHistory.value.length === 0) return
  if (historyIdx.value < cmdHistory.value.length - 1) {
    historyIdx.value++
    cmdText.value = cmdHistory.value[historyIdx.value]
  }
}

function historyDown(): void {
  if (historyIdx.value > 0) {
    historyIdx.value--
    cmdText.value = cmdHistory.value[historyIdx.value]
  } else {
    historyIdx.value = -1
    cmdText.value = ''
  }
}
</script>

<style scoped>
.terminal-launcher {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.terminal-frame {
  background: var(--glass-bg); 
  border: 1px solid #21262d;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
}

/* Title bar */
.term-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--glass-bg); 
  border-bottom: 1px solid #21262d;
}
.term-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.term-dot.red { background: #f85149; }
.term-dot.yellow { background: #e3b341; }
.term-dot.green { background: #39d353; }
.term-title {
  flex: 1;
  font-size: 11px;
  color: #7d8590;
  margin-left: 6px;
}

/* Body */
.term-body {
  padding: 12px 14px;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
}

/* Lines */
.term-line { margin-bottom: 2px; }
.line-cmd { color: #39d353; }
.line-info { color: #7d8590; }
.line-ok { color: #39d353; }
.line-error { color: #f85149; }
.line-blank { height: 8px; }

.line-badge {
  display: inline-block;
  padding: 0 4px;
  margin-right: 6px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 2px;
  background: rgba(57, 211, 83, 0.1);
  color: #39d353;
  border: 1px solid rgba(57, 211, 83, 0.2);
}
.line-error .line-badge {
  background: rgba(248, 81, 73, 0.1);
  color: #f85149;
  border-color: rgba(248, 81, 73, 0.2);
}

/* Game cards */
.game-cards {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px 0;
}
.game-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.game-card:hover {
  background: rgba(57, 211, 83, 0.05);
  border-color: rgba(57, 211, 83, 0.2);
}
.gc-icon { font-size: 14px; }
.gc-name {
  color: #58a6ff;
  font-weight: 600;
  min-width: 100px;
}
.gc-status {
  color: #39d353;
  font-size: 11px;
}
.gc-desc {
  color: #484f58;
  font-size: 11px;
  margin-left: auto;
}

/* Input row */
.term-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #21262d;
}
.term-prompt {
  color: #39d353;
  font-weight: 700;
}
.term-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #e6edf3;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  caret-color: transparent;
}
.term-input::placeholder { color: #30363d; }
.term-cursor {
  color: #39d353;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
