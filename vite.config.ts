import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // /nuget/* → http://101.43.39.163:8081/* （与 IIS 生产路径保持一致；dev 目标为远端 BaGet）
      '/nuget': {
        target: 'http://101.43.39.163:8081',
        rewrite: (path) => path.replace(/^\/nuget/, ''),
        changeOrigin: true,
        secure: false,
      },

      // OpenClaw WebSocket代理（需在 /api/v1 之前，Vite 按顺序匹配，更具体的路径优先）
      '/api/v1/ws': {
        target: 'ws://localhost:3002',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/ws/, ''),
      },

      // OpenClaw HTTP REST 适配器代理
      '/api/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '/api/v1'),
      },
    },
  },
})
