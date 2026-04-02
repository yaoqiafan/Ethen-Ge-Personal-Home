// 推送通知服务
// 支持 Bark (iOS) 和 Server酱 (ServerChan)
// 配置：VITE_PUSH_URL 或 VITE_PUSH_KEY 环境变量

import type { OrderPayload } from '@/types/kitchen'

// ── 推送渠道配置 ───────────────────────────────────────────────────────────────
// Bark:      https://api.day.app/{key}/{title}/{body}
// ServerChan: POST https://sctapi.ftqq.com/{key}.send  { title, desp }

const PUSH_URL: string = import.meta.env.VITE_PUSH_URL as string ?? ''
const PUSH_KEY: string = import.meta.env.VITE_PUSH_KEY as string ?? ''

function buildOrderText(order: OrderPayload): { title: string; body: string } {
  const lines = order.items.map(
    item => `${item.dish.name} × ${item.quantity}`
  )
  const title = `🍽️ 新点单 — ${order.items.length} 道菜`
  const body = [
    ...lines,
    '',
    order.note ? `备注：${order.note}` : '',
    `时间：${new Date(order.submittedAt).toLocaleString('zh-CN')}`,
  ].filter(l => l !== '').join('\n')

  return { title, body }
}

/** Bark 推送（GET 请求格式） */
async function pushViaBark(title: string, body: string): Promise<void> {
  const key = PUSH_KEY || PUSH_URL
  if (!key) throw new Error('未配置 Bark Key（VITE_PUSH_KEY）')
  const base = key.startsWith('http') ? key : `https://api.day.app/${key}`
  const url = `${base}/${encodeURIComponent(title)}/${encodeURIComponent(body)}?sound=minuet&icon=https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/food.png`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Bark 推送失败 (${res.status})`)
}

/** Server酱 推送（POST 请求格式） */
async function pushViaServerChan(title: string, body: string): Promise<void> {
  const key = PUSH_KEY || PUSH_URL
  if (!key) throw new Error('未配置 Server酱 Key（VITE_PUSH_KEY）')
  const url = key.startsWith('http') ? key : `https://sctapi.ftqq.com/${key}.send`
  const form = new FormData()
  form.append('title', title)
  form.append('desp', body.replace(/\n/g, '\n\n'))
  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Server酱 推送失败 (${res.status})`)
}

/**
 * 发送点单推送
 * 自动识别 URL/Key 格式选择渠道；未配置时仅 console.log（开发调试模式）
 */
export async function sendOrderPush(order: OrderPayload): Promise<void> {
  const { title, body } = buildOrderText(order)

  if (!PUSH_URL && !PUSH_KEY) {
    // 开发模式：打印到控制台
    console.log('[PushService] 未配置推送，订单内容：\n', title, '\n', body)
    return
  }

  // 根据 URL 特征判断渠道
  const endpoint = PUSH_URL || PUSH_KEY
  if (endpoint.includes('sctapi.ftqq.com') || endpoint.includes('sc.ftqq.com')) {
    await pushViaServerChan(title, body)
  } else {
    // 默认 Bark
    await pushViaBark(title, body)
  }
}
