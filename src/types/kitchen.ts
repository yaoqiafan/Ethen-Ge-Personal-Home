export type DishCategory = '荤菜' | '素菜' | '汤羹' | '主食' | '小吃'

export const DISH_CATEGORIES: DishCategory[] = ['荤菜', '素菜', '汤羹', '主食', '小吃']

export const CATEGORY_ICONS: Record<DishCategory, string> = {
  荤菜: '🥩',
  素菜: '🥦',
  汤羹: '🍲',
  主食: '🍚',
  小吃: '🍡',
}

export interface Dish {
  id: string
  name: string
  category: DishCategory
  description: string
  imageUrl: string
  available: boolean
  price: number
  createdAt: string
  isCustom?: boolean   // 用户在点单时自己写的，不在主菜单中
}

export interface CartItem {
  dish: Dish
  quantity: number
  submittedQty?: number  // 已成功推送给大厨的数量，undefined / 0 表示未提交
  preferences?: string[] // 忌口，如 ['不吃葱', '少油']
}

export interface OrderPayload {
  items: CartItem[]
  note: string
  submittedAt: string
}

export type SessionStatus = 'active' | 'closed'

export interface OrderSession {
  id: string
  name: string           // 工单名称，如"周五晚上烧烤"
  status: SessionStatus
  items: CartItem[]      // 共享的购物车内容
  createdAt: string
  updatedAt: string
}
