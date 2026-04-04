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
      // /api/ai/* → http://localhost:18789/v1/*（IIS 生产环境由 web.config 注入 Authorization）
      '/api/ai': {
        target: 'http://localhost:18789',
        rewrite: (path) => path.replace(/^\/api\/ai/, '/v1'),
        changeOrigin: true,
        headers: {
          'Authorization': 'Bearer d6b3b76d798363c11793033e60a71ccc819242716b002149',
        },
      },
    },
  },
})

