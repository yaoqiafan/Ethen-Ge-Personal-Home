// BaGet V3 API 客户端
// 开发环境：Vite proxy /api/nuget → http://101.43.39.163:5000
// 生产环境：VITE_BAGET_URL=http://101.43.39.163:5000（需开放 5000 端口）
//           或配置 IIS/Nginx 反代 /nuget/ → localhost:5000

// 开发时走 Vite proxy（/api/nuget），生产时走环境变量指定的完整 URL
const BASE = import.meta.env.VITE_BAGET_URL
  ? `${import.meta.env.VITE_BAGET_URL}`
  : '/api/nuget'

export interface NuGetVersion {
  version: string
  downloads: number
}

export interface NuGetPackage {
  id: string
  version: string       // 最新版本
  description: string
  authors: string[]
  totalDownloads: number
  tags: string[]
  versions: NuGetVersion[]  // 版本列表（倒序，最新在前）
  iconUrl?: string
  projectUrl?: string
  published?: string
}

export interface NuGetSearchResponse {
  totalHits: number
  data: NuGetPackage[]
}

export async function searchPackages(
  query = 'PF.',
  take = 100,
  includePrerelease = true,
): Promise<NuGetSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    take: String(take),
    prerelease: String(includePrerelease),
    semVerLevel: '2.0.0',
  })

  const res = await fetch(`${BASE}/v3/search?${params}`, {
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error(`BaGet 响应异常 (${res.status}): ${res.statusText}`)
  }

  const json = await res.json()

  // 标准化 BaGet 响应（兼容不同版本字段命名差异）
  const data: NuGetPackage[] = (json.data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    totalDownloads: Number(p.totalDownloads ?? p.downloads ?? 0),
    tags: Array.isArray(p.tags)
      ? p.tags as string[]
      : typeof p.tags === 'string'
        ? (p.tags as string).split(' ').filter(Boolean)
        : [],
    authors: Array.isArray(p.authors) ? p.authors as string[] : [String(p.authors ?? 'Unknown')],
    versions: ((p.versions ?? []) as Array<Record<string, unknown>>)
      .map(v => ({
        version: String(v.version ?? ''),
        downloads: Number(v.downloads ?? 0),
      }))
      .reverse(), // 最新版本优先
  }))

  return {
    totalHits: Number(json.totalHits ?? data.length),
    data,
  }
}

// ── 演示数据（私服不可访问时使用）───────────────────
export const DEMO_PACKAGES: NuGetPackage[] = [
  {
    id: 'PF.Core',
    version: '1.3.0',
    description: '工业自动化框架核心层，提供 IoC 容器、事件聚合器与模块化基础架构，基于 Prism 设计理念深度定制。',
    authors: ['Ethen Ge'],
    totalDownloads: 2341,
    tags: ['industrial', 'automation', 'ioc', 'prism', 'core'],
    versions: [
      { version: '1.3.0', downloads: 127 },
      { version: '1.2.4', downloads: 389 },
      { version: '1.2.3', downloads: 445 },
      { version: '1.1.0', downloads: 1380 },
    ],
  },
  {
    id: 'PF.Infrastructure',
    version: '1.2.1',
    description: '基础设施层：日志（NLog）、配置中心、数据持久化适配器、SQLite/SQL Server 双驱动支持。',
    authors: ['Ethen Ge'],
    totalDownloads: 1876,
    tags: ['infrastructure', 'logging', 'configuration', 'sqlite'],
    versions: [
      { version: '1.2.1', downloads: 234 },
      { version: '1.2.0', downloads: 512 },
      { version: '1.1.0', downloads: 1130 },
    ],
  },
  {
    id: 'PF.Modules.SecsGem',
    version: '0.9.2-beta',
    description: 'SECS/GEM 工业通信协议适配模块，支持 HSMS 主动/被动连接模式，完整实现 SECS-II 消息解析。',
    authors: ['Ethen Ge'],
    totalDownloads: 654,
    tags: ['secs', 'gem', 'hsms', 'semiconductor', 'protocol'],
    versions: [
      { version: '0.9.2-beta', downloads: 98 },
      { version: '0.9.1-beta', downloads: 156 },
      { version: '0.8.0', downloads: 400 },
    ],
  },
  {
    id: 'PF.Modules.Modbus',
    version: '1.0.5',
    description: 'Modbus TCP/RTU 通信模块，支持线圈、寄存器的批量读写，内置连接池与断线重连机制。',
    authors: ['Ethen Ge'],
    totalDownloads: 987,
    tags: ['modbus', 'tcp', 'rtu', 'plc', 'protocol'],
    versions: [
      { version: '1.0.5', downloads: 201 },
      { version: '1.0.3', downloads: 334 },
      { version: '1.0.0', downloads: 452 },
    ],
  },
  {
    id: 'PF.UI.Controls',
    version: '0.6.0-alpha',
    description: '工业风 WPF 控件库：状态指示灯、工艺流程图组件、报警列表、历史趋势图（基于 LiveCharts2）。',
    authors: ['Ethen Ge'],
    totalDownloads: 312,
    tags: ['wpf', 'ui', 'controls', 'industrial', 'charts'],
    versions: [
      { version: '0.6.0-alpha', downloads: 67 },
      { version: '0.5.2', downloads: 245 },
    ],
  },
  {
    id: 'PF.Diagnostics',
    version: '1.1.0',
    description: '运行时诊断工具包：设备健康检查、心跳上报、性能计数器采集，支持 WebSocket 实时推送。',
    authors: ['Ethen Ge'],
    totalDownloads: 445,
    tags: ['diagnostics', 'health', 'monitoring', 'websocket'],
    versions: [
      { version: '1.1.0', downloads: 134 },
      { version: '1.0.0', downloads: 311 },
    ],
  },
]
