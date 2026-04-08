<template>
  <div class="env-debug">
    <h2>环境变量调试组件</h2>
    
    <div class="section">
      <h3>1. 当前模式</h3>
      <pre>{{ modeInfo }}</pre>
    </div>
    
    <div class="section">
      <h3>2. 环境变量</h3>
      <table>
        <thead>
          <tr>
            <th>变量名</th>
            <th>值</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key) in envVars" :key="key">
            <td>{{ key }}</td>
            <td><code>{{ value || '(空)' }}</code></td>
            <td :class="value ? 'has-value' : 'no-value'">
              {{ value ? '✅ 已设置' : '❌ 未设置' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h3>3. 计算出的配置</h3>
      <pre>{{ computedConfig }}</pre>
    </div>
    
    <div class="section">
      <h3>4. API测试</h3>
      <button @click="testAPI" :disabled="testing">测试API连接</button>
      <div v-if="apiResult">
        <pre>{{ apiResult }}</pre>
      </div>
    </div>
    
    <div class="section">
      <h3>5. 当前页面信息</h3>
      <pre>{{ pageInfo }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 环境变量（通过import.meta.env访问）
const envVars = ref({
  'VITE_PF_API_URL': import.meta.env.VITE_PF_API_URL,
  'VITE_PF_WS_URL': import.meta.env.VITE_PF_WS_URL,
  'VITE_OPENCLAW_TOKEN': import.meta.env.VITE_OPENCLAW_TOKEN,
  'VITE_ICP_NUMBER': import.meta.env.VITE_ICP_NUMBER,
  'MODE': import.meta.env.MODE,
  'DEV': import.meta.env.DEV,
  'PROD': import.meta.env.PROD,
  'BASE_URL': import.meta.env.BASE_URL
})

// 当前模式信息
const modeInfo = computed(() => ({
  模式: import.meta.env.MODE,
  开发模式: import.meta.env.DEV ? '是' : '否',
  生产模式: import.meta.env.PROD ? '是' : '否',
  环境文件: import.meta.env.MODE === 'development' ? '.env.development' : '.env.production'
}))

// 计算出的配置（模拟pfKnowledgeService.ts逻辑）
const computedConfig = computed(() => {
  function buildWsUrl(): string {
    const override = import.meta.env.VITE_PF_WS_URL
    if (override) return override
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProto}//${window.location.host}/api/v1/ws`
  }
  
  return {
    BASE_URL: import.meta.env.VITE_PF_API_URL || '/api/v1',
    WS_URL: buildWsUrl(),
    计算过程: {
      原始WS_URL: import.meta.env.VITE_PF_WS_URL,
      当前协议: window.location.protocol,
      当前主机: window.location.host,
      最终WS_URL: buildWsUrl()
    }
  }
})

// 页面信息
const pageInfo = ref({})
const apiResult = ref('')
const testing = ref(false)

onMounted(() => {
  pageInfo.value = {
    完整URL: window.location.href,
    协议: window.location.protocol,
    主机: window.location.host,
    端口: window.location.port,
    路径: window.location.pathname,
    来源: window.location.origin
  }
})

async function testAPI() {
  testing.value = true
  apiResult.value = '测试中...\n'
  
  try {
    // 测试1: 直接访问适配器
    apiResult.value += '1. 测试适配器健康检查...\n'
    const healthRes = await fetch('http://localhost:3001/health')
    const healthData = await healthRes.json()
    apiResult.value += `   结果: ${healthData.message}\n`
    
    // 测试2: 通过Vite代理访问API
    apiResult.value += '\n2. 测试Vite代理API...\n'
    const apiRes = await fetch('/api/v1/system/status')
    const apiData = await apiRes.json()
    apiResult.value += `   结果: ${apiData.message}\n`
    apiResult.value += `   系统: ${apiData.data?.system?.name || '未知'}\n`
    apiResult.value += `   状态: ${apiData.data?.system?.status || '未知'}\n`
    
    // 测试3: 测试文件API
    apiResult.value += '\n3. 测试文件API...\n'
    const filesRes = await fetch('/api/v1/knowledge/files')
    const filesData = await filesRes.json()
    apiResult.value += `   结果: ${filesData.message}\n`
    apiResult.value += `   文件数: ${filesData.data?.files?.length || 0}\n`
    apiResult.value += `   目录数: ${filesData.data?.directories?.length || 0}\n`
    
    apiResult.value += '\n✅ 所有API测试通过！'
  } catch (error: any) {
    apiResult.value += `\n❌ 测试失败: ${error.message}\n`
    apiResult.value += `堆栈: ${error.stack || '无堆栈信息'}`
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.env-debug {
  font-family: monospace;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  margin: 20px;
}

.section {
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 5px;
  border: 1px solid #ddd;
}

h2, h3 {
  color: #333;
  margin-top: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px 12px;
  border: 1px solid #ddd;
  text-align: left;
}

th {
  background: #f0f0f0;
}

.has-value {
  color: green;
}

.no-value {
  color: red;
}

pre {
  background: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
}

button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #0056b3;
}
</style>