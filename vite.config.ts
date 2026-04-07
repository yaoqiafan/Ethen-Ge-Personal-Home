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
    },
  },
})

