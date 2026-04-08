<template>
  <div class="env-debug-view">
    <h1>环境变量调试页面</h1>
    <p>此页面用于诊断前端环境变量配置问题</p>
    
    <EnvDebug />
    
    <div class="instructions">
      <h3>问题诊断步骤：</h3>
      <ol>
        <li>检查"环境变量"部分，确保VITE_PF_API_URL和VITE_PF_WS_URL已设置</li>
        <li>点击"测试API连接"按钮，检查API是否可达</li>
        <li>如果API测试失败，检查：
          <ul>
            <li>适配器是否运行（http://localhost:3001/health）</li>
            <li>Vite代理配置是否正确（vite.config.ts）</li>
            <li>环境变量文件是否正确（.env.development）</li>
          </ul>
        </li>
        <li>检查"计算出的配置"，确保WebSocket URL计算正确</li>
      </ol>
      
      <h3>当前配置要求：</h3>
      <ul>
        <li><code>VITE_PF_API_URL=/api/v1</code>（相对路径，通过Vite代理）</li>
        <li><code>VITE_PF_WS_URL=</code>（空，由代码动态计算）</li>
        <li>适配器运行在：http://localhost:3001</li>
        <li>WebSocket运行在：ws://localhost:3002</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import EnvDebug from '@/components/EnvDebug.vue'
</script>

<style scoped>
.env-debug-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.instructions {
  margin-top: 30px;
  padding: 20px;
  background: #e8f4fd;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.instructions h3 {
  color: #0056b3;
  margin-top: 0;
}

.instructions ol, .instructions ul {
  margin: 10px 0;
  padding-left: 20px;
}

.instructions li {
  margin: 5px 0;
}

code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}
</style>