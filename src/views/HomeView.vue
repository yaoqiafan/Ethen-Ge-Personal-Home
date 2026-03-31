<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
    <!-- Main terminal window -->
    <div class="terminal-window w-full max-w-4xl animate-fade-in">

      <!-- Title bar -->
      <div class="terminal-titlebar">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
        <span class="ml-3 text-terminal-muted text-xs">ethen-ge@personal-home: ~</span>
        <div class="ml-auto flex items-center gap-4">
          <!-- Nav links in titlebar -->
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-link text-xs"
            :class="{ active: $route.path === item.path }"
          >
            {{ item.label }}
          </RouterLink>
        </div>
      </div>

      <!-- Terminal body -->
      <div
        ref="terminalBody"
        class="p-4 md:p-6 min-h-96 max-h-[70vh] overflow-y-auto font-mono text-sm leading-relaxed"
      >
        <!-- Boot sequence (shown once) -->
        <div v-if="showBoot" class="mb-4 text-terminal-muted text-xs animate-fade-in">
          <div>BIOS v2.6.1 © 2024 Ethen-Ge Systems</div>
          <div>Initializing personal-home kernel...</div>
          <div class="text-terminal-green">[ OK ] Mounted filesystem</div>
          <div class="text-terminal-green">[ OK ] Network interface up</div>
          <div class="text-terminal-green">[ OK ] All systems nominal</div>
          <div class="mt-2 border-t border-terminal-border pt-2"></div>
        </div>

        <!-- MOTD / Welcome Banner -->
        <div v-if="showBanner" class="mb-6 animate-fade-in">
          <pre class="text-terminal-green text-xs md:text-sm leading-tight overflow-x-auto glow-green">{{ asciiArt }}</pre>
          <div class="mt-2 text-terminal-muted text-xs">
            Welcome to <span class="text-terminal-cyan">Ethen Ge's</span> personal terminal. Type
            <span class="text-terminal-yellow">help</span> to see available commands.
          </div>
        </div>

        <!-- Command history -->
        <div class="space-y-1">
          <div
            v-for="(line, idx) in outputLines"
            :key="idx"
            class="animate-slide-up"
          >
            <!-- Command line -->
            <div v-if="line.type === 'command'" class="flex items-start gap-2">
              <span class="cmd-prompt shrink-0">{{ prompt }}</span>
              <span class="text-terminal-text">{{ line.content }}</span>
            </div>
            <!-- Output line -->
            <div
              v-else-if="line.type === 'output'"
              class="pl-0 cmd-output whitespace-pre-wrap"
              :class="line.color ? `text-terminal-${line.color}` : ''"
              v-html="line.content"
            ></div>
            <!-- Empty line -->
            <div v-else-if="line.type === 'empty'" class="h-3"></div>
          </div>
        </div>

        <!-- Current input line -->
        <div class="flex items-center gap-2 mt-2">
          <span class="cmd-prompt shrink-0">{{ prompt }}</span>
          <div class="flex-1 flex items-center">
            <span class="text-terminal-text">{{ currentInput }}</span>
            <span class="w-2 h-4 bg-terminal-green ml-0.5 animate-blink inline-block"></span>
          </div>
        </div>
      </div>

      <!-- Input area (hidden, captures key events) -->
      <div class="border-t border-terminal-border px-4 py-3 flex items-center gap-3 bg-terminal-bg">
        <span class="cmd-prompt text-xs shrink-0">{{ prompt }}</span>
        <input
          ref="inputRef"
          v-model="currentInput"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-terminal-text font-mono text-sm caret-terminal-green"
          placeholder="type a command..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          @keydown.enter="executeCommand"
          @keydown.up.prevent="navigateHistory(-1)"
          @keydown.down.prevent="navigateHistory(1)"
          @keydown.tab.prevent="autocomplete"
        />
        <span class="text-terminal-muted text-xs hidden md:block">↑↓ history · Tab autocomplete</span>
      </div>
    </div>

    <!-- Quick access cards (below terminal) -->
    <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl animate-fade-in">
      <button
        v-for="card in quickCards"
        :key="card.cmd"
        class="terminal-window p-3 text-left hover:border-terminal-green transition-all duration-200 group cursor-pointer"
        @click="runQuickCommand(card.cmd)"
      >
        <div class="text-terminal-muted text-xs mb-1">{{ card.shortcut }}</div>
        <div class="text-terminal-green text-sm font-bold group-hover:glow-green transition-all">{{ card.icon }} {{ card.label }}</div>
        <div class="text-terminal-muted text-xs mt-1">{{ card.desc }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const terminalBody = ref(null)
const inputRef = ref(null)
const currentInput = ref('')
const outputLines = ref([])
const commandHistory = ref([])
const historyIndex = ref(-1)
const showBoot = ref(false)
const showBanner = ref(false)

const prompt = 'ethen@ge:~$'

const navItems = [
  { path: '/', label: '~/' },
  { path: '/framework', label: 'framework/' },
  { path: '/ai-toolbox', label: 'ai-toolbox/' },
  { path: '/garage', label: 'garage/' },
]

const quickCards = [
  { cmd: 'whoami', icon: '▸', label: 'whoami', shortcut: 'Ctrl+W', desc: 'About me' },
  { cmd: 'ls projects', icon: '▸', label: 'ls projects', shortcut: 'Ctrl+P', desc: 'My projects' },
  { cmd: 'cd ai-toolbox', icon: '▸', label: 'cd ai-toolbox', shortcut: 'Ctrl+A', desc: 'AI tools' },
  { cmd: 'cd garage', icon: '▸', label: 'cd garage', shortcut: 'Ctrl+G', desc: 'H2 Garage' },
]

const asciiArt = `
  ███████╗████████╗██╗  ██╗███████╗███╗   ██╗
  ██╔════╝╚══██╔══╝██║  ██║██╔════╝████╗  ██║
  █████╗     ██║   ███████║█████╗  ██╔██╗ ██║
  ██╔══╝     ██║   ██╔══██║██╔══╝  ██║╚██╗██║
  ███████╗   ██║   ██║  ██║███████╗██║ ╚████║
  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝
                   G E · 葛 大 大
`.trim()

// Command registry
const commands = {
  help: cmdHelp,
  whoami: cmdWhoami,
  'ls': cmdLs,
  'ls projects': cmdLsProjects,
  'ls skills': cmdLsSkills,
  'cd framework': () => navigate('/framework', 'framework'),
  'cd ai-toolbox': () => navigate('/ai-toolbox', 'ai-toolbox'),
  'cd garage': () => navigate('/garage', 'garage'),
  'cd ~': () => output([{ type: 'output', content: 'Already at home directory.', color: 'muted' }]),
  clear: cmdClear,
  neofetch: cmdNeofetch,
  contact: cmdContact,
  version: cmdVersion,
  matrix: cmdMatrix,
}

function cmdHelp() {
  output([
    { type: 'output', content: '┌─────────────────────────────────────────────┐', color: 'green' },
    { type: 'output', content: '│          Available Commands                  │', color: 'green' },
    { type: 'output', content: '└─────────────────────────────────────────────┘', color: 'green' },
    { type: 'output', content: '  <span class="text-terminal-yellow">whoami</span>          — Show personal introduction' },
    { type: 'output', content: '  <span class="text-terminal-yellow">ls</span>              — List available sections' },
    { type: 'output', content: '  <span class="text-terminal-yellow">ls projects</span>     — List my open source projects' },
    { type: 'output', content: '  <span class="text-terminal-yellow">ls skills</span>       — List tech skills' },
    { type: 'output', content: '  <span class="text-terminal-yellow">cd framework</span>    — Navigate to PF.AutoFramework docs' },
    { type: 'output', content: '  <span class="text-terminal-yellow">cd ai-toolbox</span>   — Navigate to AI Toolbox' },
    { type: 'output', content: '  <span class="text-terminal-yellow">cd garage</span>       — Navigate to Digital Garage (H2)' },
    { type: 'output', content: '  <span class="text-terminal-yellow">neofetch</span>        — System info in style' },
    { type: 'output', content: '  <span class="text-terminal-yellow">contact</span>         — Get contact info' },
    { type: 'output', content: '  <span class="text-terminal-yellow">matrix</span>          — ??' },
    { type: 'output', content: '  <span class="text-terminal-yellow">clear</span>           — Clear terminal' },
    { type: 'empty' },
  ])
}

function cmdWhoami() {
  output([
    { type: 'empty' },
    { type: 'output', content: '  <span class="text-terminal-green font-bold">葛大大 (Ethen Ge)</span>' },
    { type: 'empty' },
    { type: 'output', content: '  Industrial Software Engineer' },
    { type: 'output', content: '  Specializing in automation & control systems' },
    { type: 'empty' },
    { type: 'output', content: '  <span class="text-terminal-cyan">Core Stack:</span>  C# · .NET 8 · WPF · Prism Framework' },
    { type: 'output', content: '  <span class="text-terminal-cyan">Web Stack:</span>   Vue 3 · Vite · Tailwind CSS' },
    { type: 'output', content: '  <span class="text-terminal-cyan">Interests:</span>  Industrial Automation · AI Tools · Motorcycles' },
    { type: 'empty' },
    { type: 'output', content: '  Currently building: <span class="text-terminal-yellow">PF.AutoFramework</span>' },
    { type: 'output', content: '  Saving up for:      <span class="text-terminal-red">Kawasaki H2 🏍️</span>' },
    { type: 'empty' },
  ])
}

function cmdLs() {
  output([
    { type: 'output', content: '' },
    { type: 'output', content: '  <span class="text-terminal-cyan">drwxr-xr-x</span>  <span class="text-terminal-green">framework/</span>      PF.AutoFramework 文档与展示' },
    { type: 'output', content: '  <span class="text-terminal-cyan">drwxr-xr-x</span>  <span class="text-terminal-green">ai-toolbox/</span>     AI 工具百宝箱' },
    { type: 'output', content: '  <span class="text-terminal-cyan">drwxr-xr-x</span>  <span class="text-terminal-green">garage/</span>         数字车库 · Kawasaki H2' },
    { type: 'output', content: '  <span class="text-terminal-cyan">-rw-r--r--</span>  <span class="text-terminal-text">README.md</span>       About this site' },
    { type: 'empty' },
  ])
}

function cmdLsProjects() {
  output([
    { type: 'empty' },
    { type: 'output', content: '  <span class="text-terminal-yellow">PROJECT</span>               <span class="text-terminal-cyan">STACK</span>                    <span class="text-terminal-green">STATUS</span>' },
    { type: 'output', content: '  ─────────────────────────────────────────────────────' },
    { type: 'output', content: '  <span class="text-terminal-green">PF.AutoFramework</span>      C# / .NET 8 / Prism          <span class="text-terminal-yellow">[ WIP ]</span>' },
    { type: 'output', content: '  <span class="text-terminal-green">ethen-ge-personal-home</span> Vue 3 / Vite / Tailwind     <span class="text-terminal-green">[ LIVE ]</span>' },
    { type: 'empty' },
    { type: 'output', content: '  Type <span class="text-terminal-yellow">cd framework</span> for more details on PF.AutoFramework.' },
    { type: 'empty' },
  ])
}

function cmdLsSkills() {
  output([
    { type: 'empty' },
    { type: 'output', content: '  <span class="text-terminal-cyan">■■■■■■■■■■</span> C# / .NET 8       ████████░░  Expert' },
    { type: 'output', content: '  <span class="text-terminal-cyan">■■■■■■■■■■</span> WPF / MVVM        ████████░░  Expert' },
    { type: 'output', content: '  <span class="text-terminal-cyan">■■■■■■■■■░</span> Prism Framework   ███████░░░  Advanced' },
    { type: 'output', content: '  <span class="text-terminal-cyan">■■■■■■■░░░</span> Vue 3 / Vite      ██████░░░░  Intermediate' },
    { type: 'output', content: '  <span class="text-terminal-cyan">■■■■■░░░░░</span> AI / LLM APIs     █████░░░░░  Learning' },
    { type: 'empty' },
  ])
}

function cmdNeofetch() {
  output([
    { type: 'empty' },
    { type: 'output', content: '       <span class="text-terminal-green">██████</span>     <span class="text-terminal-cyan">ethen</span><span class="text-terminal-muted">@</span><span class="text-terminal-cyan">personal-home</span>' },
    { type: 'output', content: '      <span class="text-terminal-green">██████</span>      <span class="text-terminal-muted">─────────────────────</span>' },
    { type: 'output', content: '    <span class="text-terminal-green">████████</span>    <span class="text-terminal-muted">OS:</span>       ethen-ge-os v0.1.0' },
    { type: 'output', content: '  <span class="text-terminal-green">██████████</span>  <span class="text-terminal-muted">Host:</span>     Personal Website' },
    { type: 'output', content: '   <span class="text-terminal-green">████████</span>   <span class="text-terminal-muted">Kernel:</span>   Vue 3.5 + Vite 6' },
    { type: 'output', content: '     <span class="text-terminal-green">████</span>     <span class="text-terminal-muted">Shell:</span>    terminal.vue' },
    { type: 'output', content: '      <span class="text-terminal-green">██</span>      <span class="text-terminal-muted">Editor:</span>   Rider / VS Code' },
    { type: 'output', content: '               <span class="text-terminal-muted">Language:</span> C# (primary) / JS' },
    { type: 'output', content: '               <span class="text-terminal-muted">CPU:</span>      Industrial Automation Brain' },
    { type: 'output', content: '               <span class="text-terminal-muted">Bike:</span>     <span class="text-terminal-red">Kawasaki H2 (pending...)</span>' },
    { type: 'empty' },
    { type: 'output', content: '               <span class="bg-red-500 text-red-500">██</span><span class="bg-yellow-400 text-yellow-400">██</span><span class="bg-green-500 text-green-500">██</span><span class="bg-cyan-400 text-cyan-400">██</span><span class="bg-blue-500 text-blue-500">██</span><span class="bg-purple-500 text-purple-500">██</span><span class="bg-terminal-muted text-terminal-muted">██</span>' },
    { type: 'empty' },
  ])
}

function cmdContact() {
  output([
    { type: 'empty' },
    { type: 'output', content: '  <span class="text-terminal-green">Contact Information</span>' },
    { type: 'output', content: '  ──────────────────────────────' },
    { type: 'output', content: '  <span class="text-terminal-cyan">GitHub:</span>   github.com/ethen-ge' },
    { type: 'output', content: '  <span class="text-terminal-cyan">Email:</span>    ethen@example.com' },
    { type: 'empty' },
  ])
}

function cmdVersion() {
  output([
    { type: 'output', content: 'ethen-ge-personal-home v0.1.0 (build 2024)' },
    { type: 'output', content: 'Powered by Vue 3 + Vite + Tailwind CSS' },
  ])
}

let matrixInterval = null
function cmdMatrix() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵ'
  const rows = 6
  const cols = 60
  let count = 0
  const maxFrames = 30
  output([{ type: 'empty' }])
  matrixInterval = setInterval(() => {
    if (count >= maxFrames) {
      clearInterval(matrixInterval)
      output([
        { type: 'output', content: '<span class="text-terminal-green">Wake up, Ethen...</span>' },
        { type: 'empty' },
      ])
      return
    }
    let line = ''
    for (let i = 0; i < cols; i++) {
      const c = chars[Math.floor(Math.random() * chars.length)]
      const intensity = Math.random()
      if (intensity > 0.85) {
        line += `<span class="text-white">${c}</span>`
      } else if (intensity > 0.5) {
        line += `<span class="text-terminal-green">${c}</span>`
      } else {
        line += `<span class="text-green-900">${c}</span>`
      }
    }
    outputLines.value.push({ type: 'output', content: '  ' + line })
    count++
    scrollToBottom()
  }, 80)
}

function navigate(path, name) {
  output([
    { type: 'output', content: `Navigating to <span class="text-terminal-green">${name}/</span>...`, color: 'muted' },
    { type: 'empty' },
  ])
  setTimeout(() => router.push(path), 500)
}

function output(lines) {
  outputLines.value.push(...lines)
  nextTick(scrollToBottom)
}

function scrollToBottom() {
  if (terminalBody.value) {
    terminalBody.value.scrollTop = terminalBody.value.scrollHeight
  }
}

function executeCommand() {
  const cmd = currentInput.value.trim().toLowerCase()
  if (!cmd) return

  // Add to history
  commandHistory.value.unshift(cmd)
  historyIndex.value = -1

  // Echo the command
  outputLines.value.push({ type: 'command', content: cmd })

  // Execute
  const handler = commands[cmd]
  if (handler) {
    handler()
  } else {
    output([
      {
        type: 'output',
        content: `<span class="text-terminal-red">bash: ${escapeHtml(cmd)}: command not found</span>. Type <span class="text-terminal-yellow">help</span> for available commands.`,
      },
      { type: 'empty' },
    ])
  }

  currentInput.value = ''
  nextTick(scrollToBottom)
}

function navigateHistory(direction) {
  const len = commandHistory.value.length
  if (len === 0) return
  historyIndex.value = Math.max(-1, Math.min(len - 1, historyIndex.value + direction))
  currentInput.value = historyIndex.value === -1 ? '' : commandHistory.value[historyIndex.value]
}

function autocomplete() {
  const input = currentInput.value.toLowerCase()
  if (!input) return
  const matches = Object.keys(commands).filter(c => c.startsWith(input))
  if (matches.length === 1) {
    currentInput.value = matches[0]
  } else if (matches.length > 1) {
    output([
      { type: 'command', content: currentInput.value },
      { type: 'output', content: matches.join('  ') },
    ])
  }
}

function runQuickCommand(cmd) {
  currentInput.value = cmd
  executeCommand()
  inputRef.value?.focus()
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

onMounted(async () => {
  // Boot sequence
  showBoot.value = true
  await new Promise(r => setTimeout(r, 600))
  showBanner.value = true
  await new Promise(r => setTimeout(r, 400))

  // Auto run welcome
  cmdHelp()

  inputRef.value?.focus()

  // Focus input on click anywhere
  document.addEventListener('click', () => inputRef.value?.focus())
})
</script>
