import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { templateCompilerOptions } from '@tresjs/core'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: templateCompilerOptions,
      },
    }),
  ],
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

      // OpenClaw WebSocket 代理（需在 /api/v1 之前，Vite 按顺序匹配，更具体的路径优先）
      // dev:  /api/v1/ws → ws://localhost:3002  (OpenClaw 适配器 WS，桥接至网关 18789)
      // prod: IIS rewrite /api/v1/ws → ws://localhost:3002
      '/api/v1/ws': {
        target: 'ws://localhost:3002',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/ws/, ''),
      },

      // OpenClaw HTTP REST 适配器代理
      // dev:  /api/v1/* → http://localhost:3001/api/v1/*  (OpenClaw 适配器 HTTP)
      // prod: IIS rewrite /api/v1/* → http://localhost:3001/api/v1/*
      '/api/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
