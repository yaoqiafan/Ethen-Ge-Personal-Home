import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import EnterView from '@/views/EnterView.vue'
import DashboardView from '@/views/DashboardView.vue'
import FrameworkView from '@/views/FrameworkView.vue'
import AIToolboxView from '@/views/AIToolboxView.vue'
import GarageView from '@/views/GarageView.vue'
import KitchenView from '@/views/KitchenView.vue'
import KitchenPublicView from '@/views/KitchenPublicView.vue'
import GameRoomView from '@/views/GameRoomView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/menu',
    name: 'menu',
    component: KitchenPublicView,
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'enter',
        component: EnterView,
        meta: { title: '首页', titleCN: 'Home' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: '控制台', titleCN: '主控台' },
      },
      {
        path: 'framework',
        name: 'framework',
        component: FrameworkView,
        meta: { title: 'PF.AutoFramework', titleCN: '工业框架' },
      },
      {
        path: 'ai-toolbox',
        name: 'ai-toolbox',
        component: AIToolboxView,
        meta: { title: 'AI Toolbox', titleCN: 'AI 百宝箱' },
      },
      {
        path: 'garage',
        name: 'garage',
        component: GarageView,
        meta: { title: '数字车库', titleCN: 'Digital Garage' },
      },
      {
        path: 'kitchen',
        name: 'kitchen',
        component: KitchenView,
        meta: { title: '家庭厨房', titleCN: 'Family Kitchen' },
      },
      {
        path: 'game-room',
        name: 'game-room',
        component: GameRoomView,
        meta: { title: '游戏室', titleCN: 'Game Room' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
