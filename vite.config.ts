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

      // PF 知识库 HTTP REST：/api/pf/* → http://localhost:8080/api/*
      // 生产环境由 IIS URL Rewrite 将 /pf/* 转发至 http://localhost:8080/*（同源，无 CORS）
      '/api/pf': {
        target: 'http://localhost:8080',
        rewrite: (path) => path.replace(/^\/api\/pf/, '/api'),
        changeOrigin: true,
        secure: false,
      },

      // PF 知识库 WebSocket：/api/pf-ws/* → ws://localhost:8081/*
      // Vite 在收到 Upgrade: websocket 请求头时自动升级为 WS 代理
      '/api/pf-ws': {
        target: 'ws://localhost:8081',
        rewrite: (path) => path.replace(/^\/api\/pf-ws/, ''),
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})

