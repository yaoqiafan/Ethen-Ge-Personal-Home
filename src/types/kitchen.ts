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
}

export interface CartItem {
  dish: Dish
  quantity: number
}

export interface OrderPayload {
  items: CartItem[]
  note: string
  submittedAt: string
}
