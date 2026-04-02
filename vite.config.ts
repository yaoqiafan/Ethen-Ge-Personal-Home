import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './', 
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // 开发环境代理：规避 HTTP 混合内容限制
      // /api/nuget/* → http://101.43.39.163:8081/*
      '/api/nuget': {
        target: 'http://101.43.39.163:8081',
        rewrite: (path) => path.replace(/^\/api\/nuget/, ''),
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
