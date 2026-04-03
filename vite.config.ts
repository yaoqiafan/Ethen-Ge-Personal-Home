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
      // /api/nuget/* → http://101.43.39.163:8081/*
      '/api/nuget': {
        target: 'http://101.43.39.163:8081',
        rewrite: (path) => path.replace(/^\/api\/nuget/, ''),
        changeOrigin: true,
        secure: false,
      },
      // /api/ai/* → http://localhost:5000  (BFF 层，无需前端携带 Token)
      '/api/ai': {
        target: 'http://localhost:5000',
        rewrite: (path) => path.replace(/^\/api\/ai/, ''),
        changeOrigin: true,
      },
    },
  },
})
