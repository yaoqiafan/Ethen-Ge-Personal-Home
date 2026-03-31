import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('./views/HomeView.vue'),
  },
  {
    path: '/framework',
    name: 'framework',
    component: () => import('./views/FrameworkView.vue'),
  },
  {
    path: '/ai-toolbox',
    name: 'ai-toolbox',
    component: () => import('./views/AIToolboxView.vue'),
  },
  {
    path: '/garage',
    name: 'garage',
    component: () => import('./views/GarageView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
