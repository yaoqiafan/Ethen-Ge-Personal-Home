<template>
  <div class="release-panel">

    <!-- 同步 GitHub 配置提示 -->
    <div v-if="!repoSlug" class="unconfigured">
      <div class="unc-icon">📥</div>
      <div class="unc-title">请先在「实时动态」面板配置 GitHub 仓库</div>
      <div class="unc-hint">Release 下载列表从已配置的 GitHub 仓库自动同步</div>
    </div>

    <template v-else>

      <div class="panel-header">
        <div class="panel-title">
          <span class="pt-dot"></span>
          Release 归档
        </div>
        <span class="panel-repo">{{ repoSlug }}</span>
        <button class="refresh-btn" :disabled="loading" @click="fetchReleases">
          <span :class="{ spin: loading }">↻</span>
        </button>
      </div>

      <div v-if="loading" class="loading-list">
        <div v-for="i in 3" :key="i" class="load-item skeleton"></div>
      </div>

      <div v-else-if="error" class="error-inline">
        <span class="ei-icon">⚡</span>
        {{ error }}
        <button class="retry-btn" @click="fetchReleases">重试</button>
      </div>

      <div v-else-if="!releases.length" class="empty-state">
        暂无发布版本。推送 Git Tag 并创建 GitHub Release 后，此处将自动列出。
      </div>

      <div v-else class="release-list">
        <div
          v-for="rel in releases"
          :key="rel.id"
          class="release-card"
          :class="{ prerelease: rel.prerelease }"
        >
          <!-- Release 头部 -->
          <div class="rel-head">
            <div class="rel-head-left">
              <span class="rel-tag">{{ rel.tag_name }}</span>
              <span v-if="rel.prerelease" class="pre-badge">预发布</span>
              <span v-if="rel.draft" class="draft-badge">草稿</span>
              <span class="rel-name">{{ rel.name ?? rel.tag_name }}</span>
            </div>
            <div class="rel-head-right">
              <span class="rel-date">{{ formatDate(rel.published_at) }}</span>
              <a
                :href="rel.html_url"
                target="_blank"
                rel="noopener"
                class="rel-github-link"
                title="在 GitHub 上查看"
              >↗</a>
            </div>
          </div>

          <!-- Changelog 摘要 -->
          <div v-if="rel.body" class="rel-body">
            <pre class="changelog-text">{{ trimChangelog(rel.body) }}</pre>
          </div>

          <!-- 发布物（Assets） -->
          <div v-if="rel.assets.length" class="rel-assets">
            <div class="assets-title">发布物</div>
            <div class="asset-list">
              <a
                v-for="asset in rel.assets"
                :key="asset.id"
                :href="asset.browser_download_url"
                class="asset-row"
                :download="asset.name"
              >
                <span class="asset-icon">{{ assetIcon(asset.name) }}</span>
                <span class="asset-name">{{ asset.name }}</span>
                <span class="asset-size">{{ formatBytes(asset.size) }}</span>
                <span class="asset-dl">↓ {{ asset.download_count }}</span>
                <span class="asset-download-btn">下载</span>
              </a>
            </div>
          </div>

          <!-- 源码包（GitHub 自动生成） -->
          <div class="rel-source">
            <div class="assets-title">源码归档</div>
            <div class="asset-list">
              <a
                :href="`https://github.com/${repoSlug}/archive/refs/tags/${rel.tag_name}.zip`"
                class="asset-row"
                target="_blank"
                rel="noopener"
              >
                <span class="asset-icon">◫</span>
                <span class="asset-name">Source code (zip)</span>
                <span class="asset-size">自动生成</span>
                <span class="asset-dl"></span>
                <span class="asset-download-btn">下载</span>
              </a>
              <a
                :href="`https://github.com/${repoSlug}/archive/refs/tags/${rel.tag_name}.tar.gz`"
                class="asset-row"
                target="_blank"
                rel="noopener"
              >
                <span class="asset-icon">◫</span>
                <span class="asset-name">Source code (tar.gz)</span>
                <span class="asset-size">自动生成</span>
                <span class="asset-dl"></span>
                <span class="asset-download-btn">下载</span>
              </a>
            </div>
          </div>

        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getReleases,
  getConfiguredRepo,
  formatBytes,
  type GitHubRelease,
} from '@/services/github'

const repoSlug = ref(getConfiguredRepo())
const loading = ref(false)
const error = ref('')
const releases = ref<GitHubRelease[]>([])

async function fetchReleases() {
  if (!repoSlug.value) return
  loading.value = true
  error.value = ''
  try {
    releases.value = await getReleases(repoSlug.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

function trimChangelog(body: string): string {
  const lines = body.split('\n').filter(l => l.trim())
  return lines.slice(0, 10).join('\n') + (lines.length > 10 ? '\n...' : '')
}

function assetIcon(name: string): string {
  if (name.endsWith('.zip') || name.endsWith('.tar.gz') || name.endsWith('.tgz')) return '◫'
  if (name.endsWith('.nupkg') || name.endsWith('.snupkg')) return '◈'
  if (name.endsWith('.exe') || name.endsWith('.msi')) return '⊞'
  if (name.endsWith('.dll')) return '⬡'
  return '◉'
}

onMounted(fetchReleases)
</script>

<style scoped>
.release-panel { display: flex; flex-direction: column; gap: 12px; }

/* ── 未配置 ──────────────────────────────── */
.unconfigured {
  text-align: center; padding: 3rem; border: 1px dashed #30363d; border-radius: 8px;
}
.unc-icon  { font-size: 28px; margin-bottom: 8px; }
.unc-title { font-size: 13px; font-weight: 600; color: #7d8590; margin-bottom: 4px; }
.unc-hint  { font-size: 12px; color: #484f58; }

/* ── 面板头 ──────────────────────────────── */
.panel-header {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; background: #0d1117;
  border: 1px solid #21262d; border-radius: 6px;
}
.panel-title {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 600; color: #c9d1d9;
}
.pt-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #39d353; box-shadow: 0 0 5px rgba(57,211,83,.7);
}
.panel-repo { font-size: 11px; color: #58a6ff; flex: 1; }
.refresh-btn {
  font-size: 13px; background: transparent; border: 1px solid #30363d;
  color: #7d8590; border-radius: 4px; cursor: pointer; padding: 2px 6px;
  transition: all .2s;
}
.refresh-btn:hover { border-color: #39d353; color: #39d353; }
.spin { display: inline-block; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 加载 ────────────────────────────────── */
.loading-list { display: flex; flex-direction: column; gap: 8px; }
.load-item.skeleton {
  height: 80px; border-radius: 8px; background: #161b22;
  border: 1px solid #21262d; animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ── 错误 ────────────────────────────────── */
.error-inline {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  background: rgba(248,81,73,.05); border: 1px solid rgba(248,81,73,.2); border-radius: 6px;
  font-size: 12px; color: #f85149;
}
.ei-icon { flex-shrink: 0; }
.retry-btn {
  margin-left: auto; font-size: 11px; padding: 2px 8px;
  background: transparent; border: 1px solid rgba(248,81,73,.3);
  color: #f85149; border-radius: 3px; cursor: pointer;
}

/* ── 空态 ────────────────────────────────── */
.empty-state {
  padding: 2rem; text-align: center; font-size: 12px; color: #484f58;
  border: 1px dashed #30363d; border-radius: 8px; line-height: 1.7;
}

/* ── Release 列表 ────────────────────────── */
.release-list { display: flex; flex-direction: column; gap: 8px; }

.release-card {
  background: #161b22; border: 1px solid #21262d; border-radius: 8px;
  overflow: hidden; transition: border-color .2s;
}
.release-card:hover { border-color: rgba(57,211,83,.3); }
.release-card.prerelease { border-color: rgba(227,179,65,.2); }
.release-card.prerelease:hover { border-color: rgba(227,179,65,.5); }

/* Release 头 */
.rel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; gap: 10px; flex-wrap: wrap;
}
.rel-head-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.rel-tag {
  font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700;
  color: #39d353; background: rgba(57,211,83,.1); border: 1px solid rgba(57,211,83,.25);
  padding: 1px 8px; border-radius: 4px;
}
.pre-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 10px;
  background: rgba(227,179,65,.1); border: 1px solid rgba(227,179,65,.25); color: #e3b341;
}
.draft-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 10px;
  background: rgba(139,148,158,.1); border: 1px solid rgba(139,148,158,.25); color: #7d8590;
}
.rel-name { font-size: 13px; color: #c9d1d9; }

.rel-head-right { display: flex; align-items: center; gap: 10px; }
.rel-date { font-size: 11px; color: #484f58; }
.rel-github-link { font-size: 13px; color: #58a6ff; text-decoration: none; }
.rel-github-link:hover { color: #79c0ff; }

/* Changelog */
.rel-body {
  padding: 0 14px 10px;
  border-bottom: 1px solid #21262d;
}
.changelog-text {
  font-size: 11px; color: #7d8590; white-space: pre-wrap;
  font-family: 'JetBrains Mono', monospace; line-height: 1.7;
  margin: 0; background: #0d1117; padding: 8px 10px; border-radius: 4px;
  max-height: 120px; overflow-y: auto;
}

/* Assets */
.rel-assets, .rel-source {
  padding: 10px 14px;
  border-bottom: 1px solid #21262d;
}
.rel-source { border-bottom: none; }
.assets-title {
  font-size: 10px; color: #484f58; text-transform: uppercase;
  letter-spacing: .07em; margin-bottom: 6px;
}
.asset-list { display: flex; flex-direction: column; gap: 3px; }
.asset-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: 5px; background: #0d1117; border: 1px solid #21262d;
  text-decoration: none; transition: border-color .15s;
  cursor: pointer;
}
.asset-row:hover { border-color: rgba(57,211,83,.3); }

.asset-icon { font-size: 12px; color: #58a6ff; flex-shrink: 0; }
.asset-name {
  flex: 1; font-size: 12px; color: #c9d1d9;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: 'JetBrains Mono', monospace;
}
.asset-size { font-size: 10px; color: #484f58; flex-shrink: 0; }
.asset-dl   { font-size: 10px; color: #484f58; width: 40px; text-align: right; flex-shrink: 0; }
.asset-download-btn {
  font-size: 10px; padding: 1px 8px; border-radius: 3px;
  background: rgba(57,211,83,.08); border: 1px solid rgba(57,211,83,.2);
  color: #39d353; flex-shrink: 0;
}
.asset-row:hover .asset-download-btn { background: rgba(57,211,83,.15); }
</style>
