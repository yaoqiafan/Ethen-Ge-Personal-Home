const axios = require('axios');
const WebSocket = require('ws');

async function testAdapter() {
  console.log('=== OpenClaw适配器连接测试 ===\n');
  
  // 测试HTTP API
  console.log('1. 测试HTTP API连接...');
  try {
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log(`✅ 健康检查: ${healthResponse.data.message}`);
    console.log(`   状态: ${JSON.stringify(healthResponse.data.openclaw)}\n`);
  } catch (error) {
    console.log(`❌ 健康检查失败: ${error.message}\n`);
    return;
  }
  
  // 测试系统状态API
  console.log('2. 测试系统状态API...');
  try {
    const statusResponse = await axios.get('http://localhost:3001/api/v1/system/status');
    console.log(`✅ 系统状态: ${statusResponse.data.message}`);
    console.log(`   系统名称: ${statusResponse.data.data.system.name}`);
    console.log(`   知识库文档数: ${statusResponse.data.data.knowledgeBase.documentCount}\n`);
  } catch (error) {
    console.log(`❌ 系统状态API失败: ${error.message}\n`);
  }
  
  // 测试文件列表API
  console.log('3. 测试文件列表API...');
  try {
    const filesResponse = await axios.get('http://localhost:3001/api/v1/knowledge/files');
    console.log(`✅ 文件列表: ${filesResponse.data.message}`);
    console.log(`   文件数量: ${filesResponse.data.data.files.length}`);
    console.log(`   目录数量: ${filesResponse.data.data.directories.length}\n`);
  } catch (error) {
    console.log(`❌ 文件列表API失败: ${error.message}\n`);
  }
  
  // 测试WebSocket连接
  console.log('4. 测试WebSocket连接...');
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3002');
    
    ws.on('open', () => {
      console.log('✅ WebSocket连接成功');
      ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      console.log('   已发送ping消息\n');
    });
    
    ws.on('message', (data) => {
      console.log(`✅ 收到WebSocket消息: ${data.toString().substring(0, 100)}...\n`);
      ws.close();
      resolve();
    });
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocket连接失败: ${error.message}\n`);
      resolve();
    });
    
    ws.on('close', () => {
      console.log('WebSocket连接已关闭\n');
      resolve();
    });
    
    // 超时处理
    setTimeout(() => {
      console.log('⚠️ WebSocket连接超时\n');
      ws.close();
      resolve();
    }, 5000);
  });
}

// 运行测试
testAdapter().then(() => {
  console.log('=== 测试完成 ===');
  console.log('\n下一步:');
  console.log('1. 启动适配器: node server.js');
  console.log('2. 启动Vue前端: npm run dev');
  console.log('3. 访问: http://localhost:5173');
  process.exit(0);
}).catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});