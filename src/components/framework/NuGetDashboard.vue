<template>
  <div class="nuget-dash">

    <!-- ── 状态栏 ──────────────────────────── -->
    <div class="status-bar">
      <div class="sb-left">
        <span class="conn-dot" :class="connClass"></span>
        <code class="server-url">http://101.43.39.163:8081</code>
        <span class="conn-label">{{ connLabel }}</span>
      </div>
      <div class="sb-right">
        <span v-if="lastRefresh" class="last-refresh">刷新于 {{ lastRefreshText }}</span>
        <label class="toggle-label">
          <input v-model="includePrerelease" type="checkbox" class="toggle-check" />
          预发布
        </label>
        <button class="refresh-btn" :disabled="loading" @click="fetchPackages">
          <span class="refresh-icon" :class="{ spin: loading }">↻</span>
          刷新
        </button>
      </div>
    </div>

    <!-- ── 错误横幅（独立显示，不影响数据渲染）── -->
    <div v-if="error && isDemo" class="error-banner">
      <div class="eb-main">
        <span class="eb-icon">⚡</span>
        <span class="eb-text">{{ error }}</span>
      </div>
      <div class="eb-actions">
        <a :href="testUrl" target="_blank" class="eb-link">在浏览器中测试 ↗</a>
        <button class="eb-retry" @click="fetchPackages">重试</button>
      </div>
    </div>

    <!-- ── 加载骨架（仅在首次冷启动前极短时间）── -->
    <template v-if="loading && !packages.length">
      <div class="stats-row">
        <div v-for="i in 4" :key="i" class="stat-card skeleton"></div>
      </div>
      <div v-for="i in 3" :key="i" class="pkg-skeleton">
        <div class="skel-title"></div>
        <div class="skel-desc"></div>
      </div>
    </template>

    <!-- ── 数据态 ─────────────────────────── -->
    <template v-else-if="packages.length">

      <!-- 统计行 -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val green">{{ stats.packages }}</div>
          <div class="stat-lbl">NuGet 包</div>
        </div>
        <div class="stat-card">
          <div class="stat-val cyan">{{ stats.versions }}</div>
          <div class="stat-lbl">版本总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-val yellow">{{ fmtDl(stats.downloads) }}</div>
          <div class="stat-lbl">总下载量</div>
        </div>
        <div class="stat-card">
          <div class="stat-val purple">{{ stats.prerelease }}</div>
          <div class="stat-lbl">预发布包</div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <span class="search-icon">◎</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索包名或标签..."
        />
        <span class="search-count">{{ filteredPackages.length }} / {{ packages.length }}</span>
      </div>

      <!-- 包列表 -->
      <div v-if="filteredPackages.length" class="pkg-list">
        <div
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          class="pkg-card"
          :class="{ expanded: expandedId === pkg.id }"
        >
          <!-- 包头部 -->
          <div class="pkg-head" @click="toggleExpand(pkg.id)">
            <div class="pkg-head-left">
              <span class="pkg-icon">◈</span>
              <div class="pkg-meta">
                <div class="pkg-id">{{ pkg.id }}</div>
                <div class="pkg-desc">{{ pkg.description }}</div>
              </div>
            </div>
            <div class="pkg-head-right">
              <span class="pkg-ver-badge" :class="isPrerelease(pkg.version) ? 'pre' : 'stable'">
                {{ pkg.version }}
              </span>
              <span class="pkg-dl-count">↓ {{ fmtDl(pkg.totalDownloads) }}</span>
              <span class="expand-arrow">{{ expandedId === pkg.id ? '▴' : '▾' }}</span>
            </div>
          </div>

          <!-- 标签行 -->
          <div class="pkg-tags">
            <span v-for="tag in pkg.tags.slice(0, 6)" :key="tag" class="pkg-tag">
              {{ tag }}
            </span>
            <span v-if="pkg.tags.length > 6" class="pkg-tag-more">+{{ pkg.tags.length - 6 }}</span>
          </div>

          <!-- 展开：版本历史 -->
          <Transition name="expand">
            <div v-if="expandedId === pkg.id" class="pkg-versions">
              <div class="versions-header">
                <span class="versions-title">版本历史</span>
                <span class="versions-count">共 {{ pkg.versions.length }} 个版本</span>
              </div>
              <div
                v-for="(ver, idx) in pkg.versions"
                :key="ver.version"
                class="ver-row"
                :class="{ latest: idx === 0 }"
              >
                <div class="ver-left">
                  <span class="ver-dot" :class="{ active: idx === 0 }"></span>
                  <span class="ver-num">{{ ver.version }}</span>
                  <span v-if="idx === 0" class="ver-latest-badge">最新</span>
                  <span v-if="isPrerelease(ver.version)" class="ver-pre-badge">预发布</span>
                </div>
                <div class="ver-right">
                  <span class="ver-dl">↓ {{ ver.downloads }}</span>
                  <div class="cmd-row">
                    <code class="cmd-text">dotnet add package {{ pkg.id }} --version {{ ver.version }}</code>
                    <button
                      class="copy-btn"
                      :class="{ copied: copiedKey === `${pkg.id}@${ver.version}` }"
                      @click.stop="copyCmd(pkg.id, ver.version)"
                    >
                      {{ copiedKey === `${pkg.id}@${ver.version}` ? '已复制 ✓' : '复制' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 下载量进度条 -->
          <div class="pkg-dl-bar">
            <div
              class="pkg-dl-fill"
              :style="{ width: `${Math.min(100, (pkg.totalDownloads / maxDownloads) * 100)}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div v-else class="no-match">
        <span>未找到匹配 "{{ searchQuery }}" 的包</span>
      </div>

    </template>

    <!-- 演示数据标志 -->
    <div v-if="isDemo" class="demo-banner">
      ⚠ 当前显示演示数据，私服连接不可用
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { searchPackages, DEMO_PACKAGES, type NuGetPackage } from '@/services/nuget'

const emit = defineEmits<{ (e: 'status-change', online: boolean): void }>()

// 测试链接：浏览器直接打开 IIS 反代路径
const testUrl = import.meta.env.DEV
  ? `${window.location.origin}/api/nuget/v3/index.json`
  : `${window.location.origin}/nuget/v3/index.json`

const packages = ref<NuGetPackage[]>([])
const loading = ref(false)
const error = ref('')
const lastRefresh = ref<Date | null>(null)
const isDemo = ref(false)
const expandedId = ref<string | null>(null)
const searchQuery = ref('')
const includePrerelease = ref(true)
const copiedKey = ref('')

// ── 状态 ────────────────────────────────────
const connClass = computed(() => {
  if (loading.value) return 'connecting'
  if (isDemo.value) return 'demo'
  if (error.value) return 'offline'
  return 'online'
})

const connLabel = computed(() => {
  if (loading.value) return '连接中...'
  if (isDemo.value) return '演示模式'
  if (error.value) return '连接失败'
  return '已连接'
})

const lastRefreshText = computed(() => {
  if (!lastRefresh.value) return ''
  return lastRefresh.value.toLocaleTimeString('zh-CN', { hour12: false })
})

// ── 统计 ────────────────────────────────────
const stats = computed(() => {
  const all = packages.value
  return {
    packages: all.length,
    versions: all.reduce((s, p) => s + p.versions.length, 0),
    downloads: all.reduce((s, p) => s + p.totalDownloads, 0),
    prerelease: all.filter(p => isPrerelease(p.version)).length,
  }
})

const maxDownloads = computed(() =>
  Math.max(1, ...packages.value.map(p => p.totalDownloads))
)

const filteredPackages = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return packages.value
  return packages.value.filter(
    p =>
      p.id.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)),
  )
})

// ── 方法 ────────────────────────────────────

/** 立即展示演示数据，然后在后台静默尝试连接 BaGet */
async function fetchPackages() {
  // 先立即展示演示数据，保证页面不空白
  if (!packages.value.length) {
    loadDemo()
  }

  // 后台静默尝试连接真实私服
  loading.value = true
  error.value = ''
  try {
    const res = await searchPackages('PF.', 100, includePrerelease.value)
    // 成功：无缝替换为真实数据
    packages.value = res.data
    isDemo.value = false
    error.value = ''
    lastRefresh.value = new Date()
    emit('status-change', true)
  } catch (e) {
    // 失败：保持演示数据，识别 CORS 给出明确提示
    const msg = e instanceof Error ? e.message : String(e)
    const isCors = msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')
    error.value = isCors
      ? `CORS 跨域被拒绝 — 请在 BaGet appsettings.json 中设置 "Cors": { "AllowAnyOrigin": true } 并重启应用程序池`
      : msg
    emit('status-change', false)
    if (!isDemo.value) loadDemo()
  } finally {
    loading.value = false
  }
}

function loadDemo() {
  packages.value = DEMO_PACKAGES
  isDemo.value = true
  lastRefresh.value = new Date()
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function copyCmd(pkgId: string, version: string) {
  const cmd = `dotnet add package ${pkgId} --version ${version}`
  const key = `${pkgId}@${version}`
  try {
    await navigator.clipboard.writeText(cmd)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = '' }, 2000)
  } catch {
    // 降级：创建临时 textarea 复制
    const el = document.createElement('textarea')
    el.value = cmd
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = '' }, 2000)
  }
}

function isPrerelease(version: string): boolean {
  return /-(alpha|beta|rc|preview|dev|pre)/i.test(version)
}

function fmtDl(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

watch(includePrerelease, fetchPackages)
onMounted(fetchPackages)
</script>

<style scoped>
.nuget-dash {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── 状态栏 ──────────────────────────────── */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  gap: 12px;
  flex-wrap: wrap;
}

.sb-left, .sb-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.conn-dot.online      { background: #39d353; box-shadow: 0 0 6px rgba(57,211,83,.8); }
.conn-dot.connecting  { background: #e3b341; animation: pulse-dot 1s ease-in-out infinite; }
.conn-dot.offline     { background: #f85149; }
.conn-dot.demo        { background: #e3b341; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.server-url {
  font-size: 11px;
  color: #7d8590;
  background: rgba(255,255,255,.04);
  border: 1px solid #30363d;
  border-radius: 3px;
  padding: 1px 6px;
}

.conn-label {
  font-size: 11px;
  color: #7d8590;
}

.last-refresh { font-size: 11px; color: #484f58; }

.toggle-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #7d8590;
  cursor: pointer;
}
.toggle-check { accent-color: #39d353; }

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(57,211,83,.08);
  border: 1px solid rgba(57,211,83,.25);
  color: #39d353;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  transition: all .2s;
}
.refresh-btn:hover { background: rgba(57,211,83,.15); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.refresh-icon { font-size: 13px; display: inline-block; }
.refresh-icon.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 错误横幅 ─────────────────────────────── */
.error-banner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(248,81,73,.05);
  border: 1px solid rgba(248,81,73,.2);
  border-radius: 6px;
  font-size: 11px;
}
.eb-main { display: flex; align-items: flex-start; gap: 8px; }
.eb-icon { color: #f85149; flex-shrink: 0; margin-top: 1px; }
.eb-text { color: #7d8590; flex: 1; font-family: 'JetBrains Mono', monospace; line-height: 1.6; word-break: break-all; }
.eb-actions { display: flex; gap: 8px; align-items: center; padding-left: 18px; }
.eb-link {
  font-size: 10px; padding: 2px 10px; border-radius: 4px;
  background: rgba(88,166,255,.08); border: 1px solid rgba(88,166,255,.25);
  color: #58a6ff; font-family: 'JetBrains Mono', monospace; text-decoration: none;
  transition: all .2s; white-space: nowrap;
}
.eb-link:hover { background: rgba(88,166,255,.16); }
.eb-retry {
  font-size: 10px; padding: 2px 10px; border-radius: 4px; cursor: pointer;
  background: rgba(248,81,73,.08); border: 1px solid rgba(248,81,73,.25);
  color: #f85149; font-family: 'JetBrains Mono', monospace; transition: all .2s; white-space: nowrap;
}
.eb-retry:hover { background: rgba(248,81,73,.16); }

/* ── 骨架屏 ──────────────────────────────── */
.skeleton { height: 72px; animation: shimmer 1.5s ease-in-out infinite; }
.pkg-skeleton {
  height: 72px; border-radius: 8px; padding: 14px;
  background: #161b22; border: 1px solid #21262d;
  display: flex; flex-direction: column; gap: 8px;
  animation: shimmer 1.5s ease-in-out infinite;
}
.skel-title { height: 10px; width: 40%; background: #21262d; border-radius: 4px; }
.skel-desc  { height: 8px; width: 70%; background: #21262d; border-radius: 4px; }

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── 统计行 ──────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.stat-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 7px;
  padding: 12px 14px;
  text-align: center;
  transition: border-color .2s;
}
.stat-card:hover { border-color: rgba(57,211,83,.3); }
.stat-val {
  font-size: 22px; font-weight: 800; line-height: 1.1;
  letter-spacing: -.02em;
}
.stat-val.green  { color: #39d353; text-shadow: 0 0 8px rgba(57,211,83,.4); }
.stat-val.cyan   { color: #58a6ff; text-shadow: 0 0 8px rgba(88,166,255,.4); }
.stat-val.yellow { color: #e3b341; }
.stat-val.purple { color: #bc8cff; }
.stat-lbl { font-size: 10px; color: #484f58; margin-top: 3px; text-transform: uppercase; letter-spacing: .06em; }

/* ── 搜索栏 ──────────────────────────────── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  transition: border-color .2s;
}
.search-bar:focus-within { border-color: rgba(57,211,83,.4); }
.search-icon { color: #39d353; font-size: 13px; flex-shrink: 0; }
.search-input {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 12px; color: #e6edf3; font-family: 'JetBrains Mono', monospace;
}
.search-input::placeholder { color: #484f58; }
.search-count { font-size: 11px; color: #484f58; flex-shrink: 0; }

/* ── 包列表 ──────────────────────────────── */
.pkg-list { display: flex; flex-direction: column; gap: 6px; }

.pkg-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color .2s;
}
.pkg-card:hover, .pkg-card.expanded { border-color: rgba(57,211,83,.3); }

/* 包头 */
.pkg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  cursor: pointer;
  gap: 12px;
}
.pkg-head:hover { background: rgba(255,255,255,.02); }

.pkg-head-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.pkg-icon { color: #39d353; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.pkg-meta { min-width: 0; }
.pkg-id {
  font-size: 13px; font-weight: 700; color: #39d353;
  font-family: 'JetBrains Mono', monospace; letter-spacing: .01em;
}
.pkg-desc {
  font-size: 11px; color: #7d8590; margin-top: 2px;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}

.pkg-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.pkg-ver-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 600;
  font-family: 'JetBrains Mono', monospace; white-space: nowrap;
}
.pkg-ver-badge.stable {
  background: rgba(57,211,83,.1); border: 1px solid rgba(57,211,83,.25); color: #39d353;
}
.pkg-ver-badge.pre {
  background: rgba(227,179,65,.1); border: 1px solid rgba(227,179,65,.25); color: #e3b341;
}
.pkg-dl-count { font-size: 11px; color: #484f58; white-space: nowrap; }
.expand-arrow { font-size: 12px; color: #7d8590; }

/* 标签行 */
.pkg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 14px 10px;
}
.pkg-tag {
  font-size: 10px; padding: 1px 6px; border-radius: 3px;
  background: rgba(88,166,255,.07); border: 1px solid rgba(88,166,255,.15);
  color: #58a6ff; letter-spacing: .03em;
}
.pkg-tag-more { font-size: 10px; color: #484f58; }

/* 下载量进度条 */
.pkg-dl-bar {
  height: 2px; background: #21262d; margin: 0 14px;
  border-radius: 1px; overflow: hidden; margin-bottom: 10px;
}
.pkg-dl-fill {
  height: 100%;
  background: linear-gradient(90deg, #39d353, #58a6ff);
  border-radius: 1px;
  transition: width 1s ease;
}

/* ── 版本历史（展开区）─────────────────── */
.pkg-versions {
  border-top: 1px solid #21262d;
  padding: 10px 14px 12px;
  background: rgba(0,0,0,.15);
}

.versions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.versions-title { font-size: 11px; color: #7d8590; text-transform: uppercase; letter-spacing: .06em; }
.versions-count { font-size: 11px; color: #484f58; }

.ver-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #21262d;
}
.ver-row:last-child { border-bottom: none; }
.ver-row.latest .ver-num { color: #39d353; }

.ver-left {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.ver-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #30363d; flex-shrink: 0;
}
.ver-dot.active { background: #39d353; box-shadow: 0 0 4px rgba(57,211,83,.7); }
.ver-num { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #c9d1d9; }
.ver-latest-badge {
  font-size: 9px; padding: 1px 5px; border-radius: 3px;
  background: rgba(57,211,83,.1); color: #39d353; border: 1px solid rgba(57,211,83,.25);
}
.ver-pre-badge {
  font-size: 9px; padding: 1px 5px; border-radius: 3px;
  background: rgba(227,179,65,.1); color: #e3b341; border: 1px solid rgba(227,179,65,.25);
}

.ver-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  justify-content: flex-end;
}
.ver-dl { font-size: 11px; color: #484f58; white-space: nowrap; flex-shrink: 0; }

.cmd-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  justify-content: flex-end;
}
.cmd-text {
  font-size: 11px; color: #7d8590;
  background: #0d1117; border: 1px solid #21262d; border-radius: 3px;
  padding: 2px 7px; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; max-width: 380px;
}
.copy-btn {
  font-size: 10px; padding: 2px 8px; border-radius: 3px; cursor: pointer;
  white-space: nowrap; flex-shrink: 0; font-family: 'JetBrains Mono', monospace;
  border: 1px solid rgba(57,211,83,.25); background: rgba(57,211,83,.07);
  color: #39d353; transition: all .2s;
}
.copy-btn:hover { background: rgba(57,211,83,.15); }
.copy-btn.copied { border-color: rgba(57,211,83,.5); background: rgba(57,211,83,.15); }

/* 展开动画 */
.expand-enter-active { transition: all .25s ease; }
.expand-leave-active { transition: all .2s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; transform: translateY(-6px); }

/* 无匹配 */
.no-match { text-align: center; padding: 2rem; color: #484f58; font-size: 13px; }

/* 演示横幅 */
.demo-banner {
  text-align: center; padding: 6px; font-size: 11px;
  background: rgba(227,179,65,.08); border: 1px solid rgba(227,179,65,.2);
  border-radius: 5px; color: #e3b341;
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .cmd-text { max-width: 180px; }
}
</style>
