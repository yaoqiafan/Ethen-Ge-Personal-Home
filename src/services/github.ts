// GitHub REST API v3 客户端
// 未认证请求限速：60次/小时。如需更高限额，可配置 VITE_GITHUB_TOKEN

const GITHUB_API = 'https://api.github.com'

function buildHeaders(): HeadersInit {
  const token = import.meta.env.VITE_GITHUB_TOKEN as string | undefined
  return {
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
}

export interface GitHubRepo {
  full_name: string
  name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  watchers_count: number
  language: string | null
  updated_at: string
  pushed_at: string
  html_url: string
  default_branch: string
  topics: string[]
  license: { name: string } | null
  size: number
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
  html_url: string
  author: { login: string; avatar_url: string } | null
}

export interface GitHubIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  created_at: string
  html_url: string
  user: { login: string }
  labels: Array<{ name: string; color: string }>
  comments: number
}

export interface GitHubRelease {
  id: number
  tag_name: string
  name: string | null
  body: string | null
  created_at: string
  published_at: string
  html_url: string
  prerelease: boolean
  draft: boolean
  author: { login: string; avatar_url: string }
  assets: Array<{
    id: number
    name: string
    size: number
    download_count: number
    browser_download_url: string
    content_type: string
  }>
}

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: buildHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 404) throw new Error('仓库不存在或为私有仓库')
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    if (remaining === '0') throw new Error('GitHub API 请求频率已达上限，请稍后重试')
    throw new Error('GitHub API 访问被拒绝 (403)')
  }
  if (!res.ok) throw new Error(`GitHub API 错误: ${res.status}`)
  return res.json() as Promise<T>
}

// 从 localStorage 持久化 GitHub 仓库配置
const STORAGE_KEY = 'pf_github_repo'

export function getConfiguredRepo(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ''
}

export function setConfiguredRepo(slug: string): void {
  localStorage.setItem(STORAGE_KEY, slug)
}

export const getRepo = (slug: string) =>
  ghFetch<GitHubRepo>(`/repos/${slug}`)

export const getCommits = (slug: string, perPage = 10) =>
  ghFetch<GitHubCommit[]>(`/repos/${slug}/commits?per_page=${perPage}`)

export const getIssues = (slug: string) =>
  ghFetch<GitHubIssue[]>(`/repos/${slug}/issues?state=open&per_page=10&sort=created&direction=desc`)

export const getReleases = (slug: string) =>
  ghFetch<GitHubRelease[]>(`/repos/${slug}/releases?per_page=20`)

// 格式化工具
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 30) return new Date(dateStr).toLocaleDateString('zh-CN')
  if (days > 0) return `${days} 天前`
  if (hours > 0) return `${hours} 小时前`
  if (mins > 0) return `${mins} 分钟前`
  return '刚刚'
}
