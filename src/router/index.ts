import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import EnterView from '@/views/EnterView.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import FrameworkView from '@/views/FrameworkView.vue'
import AIToolboxView from '@/views/AIToolboxView.vue'
import GarageView from '@/views/GarageView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'enter',
    component: EnterView,
  },
  {
    path: '/',
    component: AppLayout,
    children: [
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
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
