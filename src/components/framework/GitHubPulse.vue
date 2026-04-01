<template>
  <div class="gh-pulse">

    <!-- ── 仓库配置 ───────────────────────── -->
    <div class="repo-config">
      <span class="repo-icon">◈</span>
      <span class="repo-label">GitHub 仓库</span>
      <div class="repo-input-wrap">
        <input
          v-model="repoInput"
          type="text"
          class="repo-input"
          placeholder="owner/repo-name"
          @keydown.enter="applyRepo"
        />
      </div>
      <button class="repo-btn" @click="applyRepo">连接</button>
      <span v-if="repoSlug" class="repo-connected">
        <span class="dot online"></span>
        <a :href="`https://github.com/${repoSlug}`" target="_blank" rel="noopener" class="repo-link">
          github.com/{{ repoSlug }}
        </a>
      </span>
    </div>

    <!-- 未配置提示 -->
    <div v-if="!repoSlug" class="unconfigured">
      <div class="unc-icon">⊞</div>
      <div class="unc-title">配置 GitHub 仓库</div>
      <div class="unc-hint">在上方输入框填入仓库路径（如 <code>octocat/Hello-World</code>），即可查看实时开发动态</div>
    </div>

    <template v-else>

      <!-- ── 加载中 ─────────────────────── -->
      <div v-if="loading" class="loading-grid">
        <div v-for="i in 3" :key="i" class="load-card skeleton"></div>
      </div>

      <!-- ── 错误 ───────────────────────── -->
      <div v-else-if="error" class="error-panel">
        <span class="err-icon">⚡</span>
        <span class="err-text">{{ error }}</span>
        <button class="retry-btn" @click="fetchAll">重试</button>
      </div>

      <!-- ── 数据 ───────────────────────── -->
      <template v-else-if="repo">

        <!-- Repo 统计卡 -->
        <div class="repo-stats">
          <div class="rs-card">
            <div class="rs-val">{{ repo.stargazers_count.toLocaleString() }}</div>
            <div class="rs-lbl">⭐ Stars</div>
          </div>
          <div class="rs-card">
            <div class="rs-val">{{ repo.forks_count.toLocaleString() }}</div>
            <div class="rs-lbl">⑂ Forks</div>
          </div>
          <div class="rs-card">
            <div class="rs-val">{{ repo.open_issues_count.toLocaleString() }}</div>
            <div class="rs-lbl">◎ Issues</div>
          </div>
          <div class="rs-card">
            <div class="rs-val rs-lang">{{ repo.language ?? 'N/A' }}</div>
            <div class="rs-lbl">⬡ 语言</div>
          </div>
        </div>

        <!-- Repo 描述 -->
        <div v-if="repo.description" class="repo-desc">
          <span class="rd-icon">›</span>
          {{ repo.description }}
        </div>

        <!-- 双栏布局：提交 + Issues -->
        <div class="pulse-grid">

          <!-- 最新提交 -->
          <div class="pulse-section">
            <div class="section-title">
              <span class="st-dot green"></span>
              最新提交
              <span class="section-count">{{ commits.length }}</span>
            </div>
            <div class="commit-list">
              <a
                v-for="c in commits"
                :key="c.sha"
                :href="c.html_url"
                target="_blank"
                rel="noopener"
                class="commit-row"
              >
                <div class="commit-sha">{{ c.sha.slice(0, 7) }}</div>
                <div class="commit-msg">{{ firstLine(c.commit.message) }}</div>
                <div class="commit-meta">
                  <span class="commit-author">{{ c.commit.author.name }}</span>
                  <span class="commit-time">{{ formatRelativeTime(c.commit.author.date) }}</span>
                </div>
              </a>
              <div v-if="!commits.length" class="empty-hint">暂无提交记录</div>
            </div>
          </div>

          <!-- Open Issues -->
          <div class="pulse-section">
            <div class="section-title">
              <span class="st-dot yellow"></span>
              开放 Issues
              <span class="section-count">{{ issues.length }}</span>
            </div>
            <div class="issue-list">
              <a
                v-for="issue in issues"
                :key="issue.number"
                :href="issue.html_url"
                target="_blank"
                rel="noopener"
                class="issue-row"
              >
                <span class="issue-num">#{{ issue.number }}</span>
                <div class="issue-body">
                  <div class="issue-title">{{ issue.title }}</div>
                  <div class="issue-meta">
                    <span
                      v-for="label in issue.labels.slice(0, 3)"
                      :key="label.name"
                      class="issue-label"
                      :style="{ borderColor: `#${label.color}`, color: `#${label.color}` }"
                    >
                      {{ label.name }}
                    </span>
                    <span class="issue-time">{{ formatRelativeTime(issue.created_at) }}</span>
                  </div>
                </div>
              </a>
              <div v-if="!issues.length" class="empty-hint">暂无开放 Issues</div>
            </div>
          </div>

        </div>
      </template>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getRepo, getCommits, getIssues,
  getConfiguredRepo, setConfiguredRepo,
  formatRelativeTime,
  type GitHubRepo, type GitHubCommit, type GitHubIssue,
} from '@/services/github'

const repoSlug = ref(getConfiguredRepo())
const repoInput = ref(repoSlug.value)

const loading = ref(false)
const error = ref('')
const repo = ref<GitHubRepo | null>(null)
const commits = ref<GitHubCommit[]>([])
const issues = ref<GitHubIssue[]>([])

async function fetchAll() {
  if (!repoSlug.value) return
  loading.value = true
  error.value = ''
  try {
    const [r, c, i] = await Promise.all([
      getRepo(repoSlug.value),
      getCommits(repoSlug.value, 10),
      getIssues(repoSlug.value),
    ])
    repo.value = r
    commits.value = c
    issues.value = i
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function applyRepo() {
  const slug = repoInput.value.trim().replace(/^https?:\/\/github\.com\//, '')
  if (!slug) return
  repoSlug.value = slug
  repoInput.value = slug
  setConfiguredRepo(slug)
  fetchAll()
}

function firstLine(msg: string): string {
  return msg.split('\n')[0].slice(0, 72)
}

onMounted(() => {
  if (repoSlug.value) fetchAll()
})
</script>

<style scoped>
.gh-pulse { display: flex; flex-direction: column; gap: 12px; }

/* ── 仓库配置栏 ─────────────────────────── */
.repo-config {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  flex-wrap: wrap;
}
.repo-icon  { color: #39d353; font-size: 13px; }
.repo-label { font-size: 11px; color: #7d8590; flex-shrink: 0; }

.repo-input-wrap { flex: 1; min-width: 180px; }
.repo-input {
  width: 100%; background: #161b22; border: 1px solid #30363d;
  border-radius: 4px; padding: 4px 8px; font-size: 12px;
  color: #e6edf3; outline: none; font-family: 'JetBrains Mono', monospace;
  transition: border-color .2s;
}
.repo-input:focus { border-color: rgba(57,211,83,.4); }

.repo-btn {
  font-size: 11px; padding: 4px 12px; border-radius: 4px;
  background: rgba(57,211,83,.08); border: 1px solid rgba(57,211,83,.25);
  color: #39d353; cursor: pointer; font-family: 'JetBrains Mono', monospace;
  transition: all .2s; flex-shrink: 0;
}
.repo-btn:hover { background: rgba(57,211,83,.18); }

.repo-connected { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.dot { width: 7px; height: 7px; border-radius: 50%; }
.dot.online { background: #39d353; box-shadow: 0 0 5px rgba(57,211,83,.8); }
.repo-link { font-size: 11px; color: #58a6ff; text-decoration: none; }
.repo-link:hover { text-decoration: underline; }

/* ── 未配置态 ────────────────────────────── */
.unconfigured {
  text-align: center; padding: 3rem 1.5rem;
  border: 1px dashed #30363d; border-radius: 8px;
}
.unc-icon  { font-size: 28px; color: #30363d; margin-bottom: 8px; }
.unc-title { font-size: 14px; font-weight: 600; color: #7d8590; margin-bottom: 6px; }
.unc-hint  { font-size: 12px; color: #484f58; line-height: 1.7; }
.unc-hint code { background: #21262d; padding: 1px 5px; border-radius: 3px; }

/* ── 加载态 ──────────────────────────────── */
.loading-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.load-card.skeleton { height: 120px; border-radius: 8px; background: #161b22; border: 1px solid #21262d; animation: shimmer 1.5s ease-in-out infinite; }
@keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ── 错误态 ──────────────────────────────── */
.error-panel {
  display: flex; align-items: center; gap: 10px; padding: 12px;
  background: rgba(248,81,73,.05); border: 1px solid rgba(248,81,73,.2); border-radius: 6px;
}
.err-icon { color: #f85149; }
.err-text { flex: 1; font-size: 12px; color: #f85149; }
.retry-btn {
  font-size: 11px; padding: 3px 10px;
  background: transparent; border: 1px solid rgba(248,81,73,.3);
  color: #f85149; border-radius: 4px; cursor: pointer; font-family: 'JetBrains Mono', monospace;
}

/* ── Repo 统计 ───────────────────────────── */
.repo-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
}
.rs-card {
  background: #161b22; border: 1px solid #21262d; border-radius: 7px;
  padding: 10px; text-align: center; transition: border-color .2s;
}
.rs-card:hover { border-color: rgba(57,211,83,.3); }
.rs-val { font-size: 18px; font-weight: 800; color: #e6edf3; }
.rs-val.rs-lang { font-size: 13px; }
.rs-lbl { font-size: 10px; color: #484f58; margin-top: 2px; }

.repo-desc {
  font-size: 12px; color: #7d8590;
  padding: 8px 12px; background: #161b22; border: 1px solid #21262d;
  border-radius: 5px; display: flex; align-items: flex-start; gap: 6px;
}
.rd-icon { color: #39d353; flex-shrink: 0; }

/* ── 双栏 ────────────────────────────────── */
.pulse-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: start;
}

.pulse-section {
  background: #161b22; border: 1px solid #21262d; border-radius: 8px;
  overflow: hidden;
}

.section-title {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 12px; border-bottom: 1px solid #21262d;
  font-size: 11px; color: #7d8590; text-transform: uppercase; letter-spacing: .07em;
}
.st-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.st-dot.green  { background: #39d353; box-shadow: 0 0 5px rgba(57,211,83,.7); }
.st-dot.yellow { background: #e3b341; box-shadow: 0 0 5px rgba(227,179,65,.7); }
.section-count {
  margin-left: auto; font-size: 11px;
  background: #21262d; padding: 1px 6px; border-radius: 10px;
}

/* ── 提交列表 ────────────────────────────── */
.commit-list { display: flex; flex-direction: column; }
.commit-row {
  padding: 8px 12px; border-bottom: 1px solid #21262d;
  text-decoration: none; transition: background .15s;
  display: block;
}
.commit-row:last-child { border-bottom: none; }
.commit-row:hover { background: rgba(255,255,255,.02); }

.commit-sha {
  font-size: 10px; color: #39d353;
  font-family: 'JetBrains Mono', monospace; margin-bottom: 2px;
}
.commit-msg {
  font-size: 12px; color: #c9d1d9; line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.commit-meta {
  display: flex; gap: 8px; margin-top: 3px; align-items: center;
}
.commit-author { font-size: 10px; color: #58a6ff; }
.commit-time   { font-size: 10px; color: #484f58; margin-left: auto; }

/* ── Issue 列表 ──────────────────────────── */
.issue-list { display: flex; flex-direction: column; }
.issue-row {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 8px 12px; border-bottom: 1px solid #21262d;
  text-decoration: none; transition: background .15s;
}
.issue-row:last-child { border-bottom: none; }
.issue-row:hover { background: rgba(255,255,255,.02); }

.issue-num {
  font-size: 10px; color: #7d8590;
  font-family: 'JetBrains Mono', monospace; flex-shrink: 0; padding-top: 1px;
}
.issue-body { min-width: 0; }
.issue-title {
  font-size: 12px; color: #c9d1d9; line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.issue-meta { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
.issue-label {
  font-size: 9px; padding: 1px 5px; border-radius: 3px;
  border-width: 1px; border-style: solid; background: transparent; opacity: 0.8;
}
.issue-time { font-size: 10px; color: #484f58; margin-left: auto; }

.empty-hint { padding: 16px 12px; font-size: 12px; color: #484f58; text-align: center; }

@media (max-width: 700px) {
  .repo-stats { grid-template-columns: repeat(2, 1fr); }
  .pulse-grid { grid-template-columns: 1fr; }
}
</style>
