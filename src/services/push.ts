// 推送通知服务
// 支持 Bark (iOS) 和 Server酱 (ServerChan)
// 配置：VITE_PUSH_URL 或 VITE_PUSH_KEY 环境变量

import type { OrderPayload } from '@/types/kitchen'
// 引入 Server酱 3 官方 SDK
import { scSend } from 'serverchan-sdk'

// ── 推送渠道配置 ───────────────────────────────────────────────────────────────
// Bark:      https://api.day.app/{key}/{title}/{body}
// ServerChan: 通过 serverchan-sdk 调用

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

/** Server酱 3 推送（使用官方 SDK） */
async function pushViaServerChan(title: string, body: string): Promise<void> {
  const key = PUSH_KEY || PUSH_URL
  if (!key) throw new Error('未配置 Server酱 Key（VITE_PUSH_KEY）')

  // SDK 需要的是纯 Key（如 SCTxxx），为了兼容，如果填了完整 URL，我们从中提取出 Key
  const sendKey = key.startsWith('http') 
    ? key.split('/').pop()?.replace('.send', '') || key 
    : key

  try {
    // 调用官方 SDK 发送推送，支持第四个参数传入 tags（可选）
    const response = await scSend(sendKey, title, body, { tags: '厨房订单|新点单' })
    
    // 检查返回值（Server酱 3 成功时通常 code 为 0）
    if (response && response.code !== 0) {
      throw new Error(response.message || '未知错误')
    }
  } catch (error: any) {
    throw new Error(`Server酱 SDK 推送失败: ${error.message || error}`)
  }
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

  // 根据 URL 或 Key 特征判断渠道
  const endpoint = PUSH_URL || PUSH_KEY
  
  if (
    endpoint.includes('sctapi.ftqq.com') || 
    endpoint.includes('sc.ftqq.com') ||
    endpoint.startsWith('SCT')||
    endpoint.startsWith('sct')
  ) {
    await pushViaServerChan(title, body)
  } else {
    // 默认 Bark
    await pushViaBark(title, body)
  }
}