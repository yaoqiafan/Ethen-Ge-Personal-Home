<template>
  <div class="flex flex-col gap-3">

    <!-- 工具栏 -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- 搜索框 -->
      <div class="relative flex-1 min-w-[160px]">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#484f58] text-xs pointer-events-none">⌕</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文件名或内容..."
          class="w-full rounded-md border border-[#30363d] bg-[#0d1117] pl-7 pr-3 py-1.5
                 font-mono text-xs text-[#c9d1d9] placeholder-[#484f58]
                 outline-none focus:border-[#39d353]/50 transition-colors"
          @keydown.enter="doSearch"
        />
      </div>

      <!-- 类型过滤 -->
      <select
        v-model="filterType"
        class="rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-1.5
               font-mono text-xs text-[#7d8590] outline-none cursor-pointer
               focus:border-[#39d353]/50 transition-colors"
        @change="loadFiles"
      >
        <option value="all">全部</option>
        <option value="md">Markdown</option>
        <option value="json">JSON</option>
        <option value="script">脚本</option>
      </select>

      <!-- 排序 -->
      <select
        v-model="sortBy"
        class="rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-1.5
               font-mono text-xs text-[#7d8590] outline-none cursor-pointer
               focus:border-[#39d353]/50 transition-colors"
        @change="loadFiles"
      >
        <option value="name">名称</option>
        <option value="size">大小</option>
        <option value="modified">修改时间</option>
      </select>

      <button class="pf-btn" :disabled="loading" @click="loadFiles">
        <span :class="{ 'animate-spin inline-block': loading }">↻</span>
        刷新
      </button>
    </div>

    <!-- 主体：文件列表 + 预览 -->
    <div class="flex gap-3 min-h-[320px]">

      <!-- 文件列表 -->
      <div class="flex flex-col gap-0.5 w-56 shrink-0 overflow-y-auto">
        <!-- 骨架屏 -->
        <template v-if="loading && !fileList.length">
          <div
            v-for="i in 5" :key="i"
            class="h-9 rounded-md bg-[#161b22] animate-pulse"
          />
        </template>

        <!-- 目录 -->
        <template v-if="!loading">
          <div
            v-for="dir in directories"
            :key="dir.path"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer
                   text-[#7d8590] hover:bg-[#161b22] hover:text-[#c9d1d9] transition-colors"
          >
            <span class="text-terminal-yellow text-xs">◫</span>
            <span class="font-mono text-xs truncate">{{ dir.name }}/</span>
            <span class="ml-auto font-mono text-[10px] text-[#484f58]">{{ dir.fileCount }}</span>
          </div>

          <!-- 文件 -->
          <div
            v-for="file in filteredFiles"
            :key="file.path"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors"
            :class="selectedFile?.path === file.path
              ? 'bg-[#21262d] border border-[#39d353]/30 text-[#e6edf3]'
              : 'text-[#7d8590] hover:bg-[#161b22] hover:text-[#c9d1d9]'"
            @click="selectFile(file)"
          >
            <span class="text-xs" :class="extColor(file.extension)">{{ extIcon(file.extension) }}</span>
            <span class="font-mono text-xs truncate flex-1">{{ file.name }}</span>
            <span class="font-mono text-[10px] text-[#484f58] shrink-0">{{ formatSize(file.size) }}</span>
          </div>

          <!-- 空态 -->
          <div v-if="!fileList.length && !loading" class="py-8 text-center font-mono text-xs text-[#484f58]">
            暂无文件
          </div>
        </template>
      </div>

      <!-- 分隔线 -->
      <div class="w-px bg-[#21262d] shrink-0" />

      <!-- 预览面板 -->
      <div class="flex-1 min-w-0 flex flex-col gap-2">
        <!-- 未选中状态 -->
        <div
          v-if="!selectedFile"
          class="flex flex-1 items-center justify-center rounded-lg border border-dashed
                 border-[#21262d] text-[#484f58] font-mono text-xs"
        >
          ← 选择文件以预览内容
        </div>

        <!-- 文件信息头 -->
        <template v-else>
          <div class="flex items-center gap-3 flex-wrap">
            <span class="font-mono text-sm text-[#e6edf3]">{{ selectedFile.name }}</span>
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#30363d] text-[#7d8590]">
              {{ selectedFile.extension || 'file' }}
            </span>
            <span class="font-mono text-[10px] text-[#484f58]">{{ formatSize(selectedFile.size) }}</span>
            <span class="font-mono text-[10px] text-[#484f58]">{{ formatDate(selectedFile.modified) }}</span>
          </div>

          <!-- 内容加载中 -->
          <div v-if="contentLoading" class="flex flex-1 items-center justify-center">
            <span class="text-[#484f58] font-mono text-xs animate-pulse">正在加载内容...</span>
          </div>

          <!-- 内容展示 -->
          <div
            v-else-if="fileContent"
            class="flex-1 overflow-y-auto rounded-md bg-[#0d1117] border border-[#21262d]
                   p-3 font-mono text-[11px] text-[#c9d1d9] leading-relaxed whitespace-pre-wrap break-all"
          >{{ fileContent }}</div>

          <!-- 加载失败 -->
          <div v-else class="flex flex-1 items-center justify-center text-terminal-red font-mono text-xs">
            内容加载失败
          </div>
        </template>
      </div>
    </div>

    <!-- 搜索结果面板 -->
    <transition name="slide-down">
      <div v-if="searchResults.length" class="rounded-lg border border-[#21262d] bg-[#161b22] p-3">
        <div class="font-mono text-xs text-[#484f58] mb-2">
          搜索「{{ lastQuery }}」— 共 {{ searchResults.length }} 条结果
        </div>
        <div
          v-for="r in searchResults"
          :key="`${r.path}-${r.lineNumber}`"
          class="flex items-start gap-2 py-1.5 border-t border-[#21262d] cursor-pointer
                 hover:bg-[#0d1117] rounded px-1 transition-colors"
          @click="openSearchResult(r)"
        >
          <span class="font-mono text-[10px] text-[#484f58] shrink-0 pt-0.5">L{{ r.lineNumber }}</span>
          <div class="min-w-0">
            <div class="font-mono text-xs text-terminal-cyan truncate">{{ r.file }}</div>
            <div class="font-mono text-[10px] text-[#7d8590] truncate">{{ r.lineContent }}</div>
          </div>
          <span class="ml-auto font-mono text-[10px] text-[#484f58] shrink-0">{{ (r.score * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { pfKnowledgeService } from '@/services/pfKnowledgeService'
import type { FileItem, DirectoryItem, SearchResult } from '@/services/pfKnowledgeService'

// ── 状态 ───────────────────────────────────────────────────────────────────────
const loading        = ref(false)
const contentLoading = ref(false)
const fileList       = ref<FileItem[]>([])
const directories    = ref<DirectoryItem[]>([])
const selectedFile   = ref<FileItem | null>(null)
const fileContent    = ref('')

const searchQuery   = ref('')
const lastQuery     = ref('')
const filterType    = ref<'all' | 'md' | 'json' | 'script'>('all')
const sortBy        = ref<'name' | 'size' | 'modified'>('name')
const searchResults = ref<SearchResult[]>([])

// ── 派生 ───────────────────────────────────────────────────────────────────────
const filteredFiles = computed(() => {
  // 前端额外过滤搜索关键词（非全文搜索，仅文件名）
  if (!searchQuery.value.trim()) return fileList.value
  const q = searchQuery.value.toLowerCase()
  return fileList.value.filter(f => f.name.toLowerCase().includes(q))
})

// ── 加载文件列表 ───────────────────────────────────────────────────────────────
async function loadFiles() {
  loading.value = true
  searchResults.value = []
  try {
    const res = await pfKnowledgeService.getFiles({
      type: filterType.value,
      sortBy: sortBy.value,
      order: 'asc',
    })
    fileList.value   = res.files ?? []
    directories.value = res.directories ?? []
  } catch {
    fileList.value   = []
    directories.value = []
  } finally {
    loading.value = false
  }
}

// ── 选择 & 预览文件 ────────────────────────────────────────────────────────────
async function selectFile(file: FileItem) {
  if (selectedFile.value?.path === file.path) return
  selectedFile.value = file
  fileContent.value  = ''
  contentLoading.value = true
  try {
    const res = await pfKnowledgeService.getFileContent(file.path)
    fileContent.value = res.content
  } catch {
    fileContent.value = ''
  } finally {
    contentLoading.value = false
  }
}

// ── 全文搜索 ───────────────────────────────────────────────────────────────────
async function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  lastQuery.value = q
  try {
    const res = await pfKnowledgeService.search(q, { scope: 'all', limit: 20 })
    searchResults.value = res.results ?? []
  } catch {
    searchResults.value = []
  }
}

// 点击搜索结果 → 找到对应文件并预览
async function openSearchResult(r: SearchResult) {
  const match = fileList.value.find(f => f.path === r.path)
  if (match) selectFile(match)
}

// ── 格式化工具 ────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / 1024 / 1024).toFixed(1)}M`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function extIcon(ext: string): string {
  const map: Record<string, string> = {
    '.md': '◎', '.json': '◈', '.ps1': '◆', '.sh': '◆', '.txt': '◇',
  }
  return map[ext] ?? '◇'
}

function extColor(ext: string): string {
  const map: Record<string, string> = {
    '.md': 'text-terminal-cyan', '.json': 'text-terminal-yellow',
    '.ps1': 'text-terminal-purple', '.sh': 'text-terminal-green',
  }
  return map[ext] ?? 'text-[#484f58]'
}

// ── 生命周期 ───────────────────────────────────────────────────────────────────
onMounted(loadFiles)
</script>

<style scoped>
.pf-btn {
  @apply flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d]
         px-3 py-1.5 font-mono text-xs text-[#7d8590]
         transition-all duration-150 cursor-pointer
         hover:border-[#39d353]/40 hover:text-[#c9d1d9]
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
