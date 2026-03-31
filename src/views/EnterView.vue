<template>
  <div
    ref="screenRef"
    class="enter-screen"
    :class="{ 'glitch-out': phase === 'exiting' }"
    @click="handleEnter"
    tabindex="0"
    @keydown.enter.prevent="handleEnter"
    @keydown.space.prevent="handleEnter"
  >
    <!-- CRT scan line -->
    <div class="crt-scanline animate-scan-line"></div>
    <!-- CRT vignette -->
    <div class="crt-vignette"></div>

    <div class="terminal-frame">
      <!-- Window chrome -->
      <div class="term-titlebar">
        <div class="term-dot red"></div>
        <div class="term-dot yellow"></div>
        <div class="term-dot green"></div>
        <span class="term-title">boot — ethen-ge-os</span>
        <span class="term-time">{{ currentTime }}</span>
      </div>

      <!-- Terminal body -->
      <div ref="bodyRef" class="term-body">

        <!-- Boot lines -->
        <div class="boot-lines">
          <div
            v-for="(line, i) in visibleLines"
            :key="i"
            class="boot-line animate-slide-up"
          >
            <span v-if="line.type === 'ok'"    class="line-badge ok">  OK  </span>
            <span v-if="line.type === 'warn'"  class="line-badge warn"> WARN </span>
            <span v-if="line.type === 'error'" class="line-badge error"> ERR  </span>
            <span v-if="line.type === 'info'"  class="line-prefix">  ···  </span>
            <span v-if="line.type === 'blank'" class="line-prefix">       </span>
            <span
              class="line-text"
              :class="{
                'text-green-400': line.type === 'ok',
                'text-yellow-400': line.type === 'warn',
                'text-red-400': line.type === 'error',
                'text-[#7d8590]': line.type === 'info' || line.type === 'blank',
              }"
            >{{ line.text }}</span>
          </div>
        </div>

        <!-- Progress bar line -->
        <div v-if="showProgressBar" class="progress-line animate-fade-in">
          <span class="text-[#7d8590] text-xs mr-3">Loading kernel</span>
          <span class="prog-track">
            <span class="prog-fill" :style="{ width: `${bootProgress}%` }"></span>
          </span>
          <span class="prog-pct">{{ Math.round(bootProgress) }}%</span>
        </div>

        <!-- Banner section -->
        <Transition name="banner">
          <div v-if="phase === 'banner' || phase === 'prompt' || phase === 'exiting'" class="banner-section">
            <pre class="ascii-banner">{{ asciiArt }}</pre>
            <div class="tagline">
              <span class="tag-name">葛大大 &nbsp;·&nbsp; Ethen Ge</span>
            </div>
            <div class="tag-stack">
              <span class="stack-tag">C#</span>
              <span class="stack-sep">·</span>
              <span class="stack-tag">.NET 8</span>
              <span class="stack-sep">·</span>
              <span class="stack-tag">WPF</span>
              <span class="stack-sep">·</span>
              <span class="stack-tag">Prism</span>
            </div>
          </div>
        </Transition>

        <!-- Enter prompt -->
        <Transition name="fade-up">
          <div v-if="phase === 'prompt'" class="enter-prompt">
            <span class="prompt-key animate-blink">[ENTER]</span>
            <span class="prompt-hint">or click anywhere to enter the system</span>
            <span class="prompt-arrow animate-blink">›</span>
          </div>
        </Transition>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { sleep } from '@/composables/useTypewriter'
import type { BootLine, BootPhase } from '@/types'

const router = useRouter()
const screenRef = ref<HTMLDivElement | null>(null)
const bodyRef = ref<HTMLDivElement | null>(null)

const phase = ref<BootPhase>('boot')
const visibleLines = ref<BootLine[]>([])
const showProgressBar = ref(false)
const bootProgress = ref(0)
const currentTime = ref('')

let timeInterval: ReturnType<typeof setInterval> | null = null

const asciiArt = `
  ██████╗ ███████╗    ██╗
 ██╔════╝ ██╔════╝   ██╔╝
 ██║  ███╗█████╗    ██╔╝
 ██║   ██║██╔══╝   ██╔╝
 ╚██████╔╝███████╗ ██████╗
  ╚═════╝ ╚══════╝ ╚═════╝`.trim()

const bootScript: BootLine[] = [
  { text: 'GE-BIOS v3.14 © 2024 Ethen-Ge Systems, Inc.', type: 'info', delay: 0 },
  { text: '', type: 'blank', delay: 80 },
  { text: 'CPU: Industrial Logic Processor × 8 cores @ 3.6 GHz', type: 'info', delay: 120 },
  { text: 'RAM: 64 GB DDR5-6400 — ECC OK', type: 'info', delay: 90 },
  { text: 'DISK: NVMe Gen4 2TB — SMART OK', type: 'info', delay: 80 },
  { text: '', type: 'blank', delay: 60 },
  { text: 'Mounting root filesystem...', type: 'ok', delay: 150 },
  { text: 'Starting network manager...', type: 'ok', delay: 130 },
  { text: 'Loading personality modules...', type: 'ok', delay: 180 },
  { text: 'Initializing C# runtime (.NET 8)...', type: 'ok', delay: 140 },
  { text: 'Starting Prism IoC container...', type: 'ok', delay: 120 },
  { text: 'Connecting to AI inference cluster...', type: 'ok', delay: 200 },
  { text: 'Mounting H2 drive subsystem...', type: 'warn', delay: 160 },
  { text: '  → target not yet mounted (see: cd garage)', type: 'blank', delay: 80 },
  { text: '', type: 'blank', delay: 100 },
]

async function runBootSequence() {
  for (const line of bootScript) {
    await sleep(line.delay)
    visibleLines.value.push(line)
    scrollToBottom()
  }

  // Progress bar
  showProgressBar.value = true
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    await sleep(30)
    bootProgress.value = (i / steps) * 100
  }
  await sleep(200)
  showProgressBar.value = false

  visibleLines.value.push({ text: 'Booting ETHEN-OS v1.0.0...', type: 'ok', delay: 0 })
  visibleLines.value.push({ text: '', type: 'blank', delay: 0 })
  scrollToBottom()

  await sleep(400)
  phase.value = 'banner'
  await sleep(800)
  phase.value = 'prompt'

  screenRef.value?.focus()
}

async function handleEnter() {
  if (phase.value !== 'prompt') return
  phase.value = 'exiting'
  await sleep(650)
  router.push('/dashboard')
}

function scrollToBottom() {
  if (bodyRef.value) {
    bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  }
}

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  runBootSequence()
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})
</script>

<style scoped>
.enter-screen {
  position: fixed;
  inset: 0;
  background: #0a0e14;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  outline: none;
  cursor: default;
}

.enter-screen.glitch-out {
  animation: glitchOut 0.6s ease-in-out forwards;
}

.crt-scanline {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(transparent, rgba(57, 211, 83, 0.06), transparent);
  pointer-events: none;
  z-index: 100;
}

.crt-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 99;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.65) 100%);
}

/* Terminal window */
.terminal-frame {
  width: 100%;
  max-width: 760px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px #21262d,
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(57, 211, 83, 0.06);
  animation: fadeIn 0.4s ease-out;
}

.term-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
}

.term-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.term-dot.red    { background: #f85149; }
.term-dot.yellow { background: #e3b341; }
.term-dot.green  { background: #39d353; }

.term-title {
  flex: 1;
  text-align: center;
  font-size: 11px;
  color: #7d8590;
  letter-spacing: 0.05em;
}

.term-time {
  font-size: 11px;
  color: #7d8590;
  font-variant-numeric: tabular-nums;
}

.term-body {
  padding: 1.25rem 1.5rem;
  min-height: 360px;
  max-height: 70vh;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.7;
  color: #c9d1d9;
}

/* Boot lines */
.boot-line {
  display: flex;
  align-items: baseline;
  gap: 0;
  font-size: 12px;
  line-height: 1.6;
}

.line-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 2px;
  margin-right: 10px;
  flex-shrink: 0;
  letter-spacing: 0.05em;
}
.line-badge.ok    { color: #39d353; border: 1px solid rgba(57,211,83,0.3); }
.line-badge.warn  { color: #e3b341; border: 1px solid rgba(227,179,65,0.3); }
.line-badge.error { color: #f85149; border: 1px solid rgba(248,81,73,0.3); }

.line-prefix {
  color: #30363d;
  margin-right: 10px;
  font-size: 11px;
  flex-shrink: 0;
}
.line-text {
  flex: 1;
}

/* Progress bar */
.progress-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
  font-size: 12px;
}
.prog-track {
  flex: 1;
  max-width: 260px;
  height: 4px;
  background: #21262d;
  border-radius: 2px;
  overflow: hidden;
}
.prog-fill {
  height: 100%;
  background: linear-gradient(90deg, #39d353, #58a6ff);
  border-radius: 2px;
  transition: width 0.05s linear;
  box-shadow: 0 0 6px rgba(57, 211, 83, 0.6);
}
.prog-pct {
  font-size: 11px;
  color: #39d353;
  width: 36px;
  text-align: right;
}

/* ASCII Banner */
.banner-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #21262d;
  text-align: center;
}

.ascii-banner {
  font-size: 12px;
  line-height: 1.3;
  color: #39d353;
  text-shadow: 0 0 8px rgba(57, 211, 83, 0.7), 0 0 20px rgba(57, 211, 83, 0.3);
  display: inline-block;
  margin: 0;
}

.tagline {
  margin-top: 10px;
}
.tag-name {
  font-size: 18px;
  font-weight: 700;
  color: #e6edf3;
  letter-spacing: 0.08em;
}

.tag-stack {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.stack-tag {
  font-size: 11px;
  color: #58a6ff;
  letter-spacing: 0.06em;
}
.stack-sep {
  color: #30363d;
  font-size: 10px;
}

/* Enter prompt */
.enter-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 1.5rem;
  padding: 10px 20px;
  border: 1px solid rgba(57, 211, 83, 0.25);
  border-radius: 6px;
  background: rgba(57, 211, 83, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
}
.enter-prompt:hover {
  border-color: rgba(57, 211, 83, 0.6);
  background: rgba(57, 211, 83, 0.08);
  box-shadow: 0 0 20px rgba(57, 211, 83, 0.15);
}
.prompt-key {
  font-size: 12px;
  font-weight: 700;
  color: #39d353;
  padding: 2px 8px;
  border: 1px solid rgba(57, 211, 83, 0.4);
  border-radius: 3px;
  background: rgba(57, 211, 83, 0.1);
}
.prompt-hint {
  font-size: 12px;
  color: #7d8590;
}
.prompt-arrow {
  font-size: 16px;
  color: #39d353;
}

/* Transitions */
.banner-enter-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.banner-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-up-enter-active {
  transition: opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
