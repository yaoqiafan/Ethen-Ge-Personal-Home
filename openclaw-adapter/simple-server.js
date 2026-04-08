// 最简化的OpenClaw适配器
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const HTTP_PORT = 3001;
const WS_PORT = 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ==================== HTTP API ====================

// 1. 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OpenClaw适配器运行正常',
    timestamp: new Date().toISOString(),
    services: {
      http: `http://localhost:${HTTP_PORT}`,
      websocket: `ws://localhost:${WS_PORT}`,
      openclaw_gateway: 'http://localhost:18789'
    }
  });
});

// 2. 系统状态 (PFSystemStatus需要)
app.get('/api/v1/system/status', (req, res) => {
  res.json({
    success: true,
    code: 200,
    message: '系统状态获取成功',
    data: {
      system: {
        name: 'PF.AutoFramework',
        version: '1.0.0',
        status: 'running',
        uptime: 86400,
        memoryUsage: 45.2,
        cpuUsage: 12.8
      },
      knowledgeBase: {
        status: 'healthy',
        documentCount: 128,
        totalSize: 15728640,
        lastUpdated: new Date().toISOString()
      },
      monitoring: {
        status: 'active',
        lastCheck: new Date().toISOString(),
        nextCheck: new Date(Date.now() + 3600000).toISOString(),
        errorCount: 0
      }
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}`
  });
});

// 3. 健康检查端点
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    code: 200,
    message: '健康检查通过',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'ok', latency: 12 },
        filesystem: { status: 'ok', freeSpace: 1024 * 1024 * 1024 },
        network: { status: 'ok', github: true, local: true }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 4. 文件列表 (PFFileManager需要)
app.get('/api/v1/knowledge/files', (req, res) => {
  const { type = 'all', sortBy = 'name' } = req.query;
  
  res.json({
    success: true,
    code: 200,
    message: '文件列表获取成功',
    data: {
      files: [
        {
          name: 'PF_AutoFramework_知识库.md',
          path: '/docs/PF_AutoFramework_知识库.md',
          type: 'file',
          size: 24576,
          modified: new Date().toISOString(),
          created: new Date(Date.now() - 86400000).toISOString(),
          extension: '.md',
          mimeType: 'text/markdown',
          permissions: 'rw-r--r--',
          checksum: 'abc123'
        },
        {
          name: '快速参考.md',
          path: '/docs/快速参考.md',
          type: 'file',
          size: 12288,
          modified: new Date().toISOString(),
          created: new Date(Date.now() - 43200000).toISOString(),
          extension: '.md',
          mimeType: 'text/markdown',
          permissions: 'rw-r--r--',
          checksum: 'def456'
        }
      ],
      directories: [
        {
          name: 'docs',
          path: '/docs',
          type: 'directory',
          fileCount: 2,
          size: 36864,
          modified: new Date().toISOString()
        },
        {
          name: 'scripts',
          path: '/scripts',
          type: 'directory',
          fileCount: 5,
          size: 30720,
          modified: new Date().toISOString()
        }
      ]
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}`
  });
});

// 5. 文件内容
app.get('/api/v1/knowledge/files/:path/content', (req, res) => {
  const filePath = req.params.path;
  
  res.json({
    success: true,
    code: 200,
    message: '文件内容获取成功',
    data: {
      file: {
        name: filePath.split('/').pop() || 'unknown',
        path: filePath,
        size: 1024,
        lines: 10,
        encoding: 'utf-8'
      },
      content: `# ${filePath.split('/').pop() || '文件'}\n\n这是${filePath}的模拟内容。\n\n## 文件信息\n- 路径：${filePath}\n- 大小：1KB\n- 类型：文本文件\n\n## 内容示例\n这是一个模拟的文件内容，用于前端测试。`,
      metadata: {
        title: filePath.split('/').pop()?.replace('.md', '') || '未命名',
        author: '系统',
        created: new Date(Date.now() - 86400000).toISOString(),
        modified: new Date().toISOString(),
        wordCount: 50,
        readingTime: '1分钟'
      }
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}`
  });
});

// 6. 监控日志 (PFMonitorConsole需要)
app.get('/api/v1/monitoring/logs', (req, res) => {
  const { limit = 20 } = req.query;
  
  const logs = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    id: `log_${Date.now()}_${i}`,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    level: i % 10 === 0 ? 'error' : i % 5 === 0 ? 'warning' : 'info',
    source: ['file.watcher', 'git.sync', 'system.monitor'][i % 3],
    message: `日志条目 ${i + 1}: 系统运行正常 ${i % 3 === 0 ? '(文件监控中)' : i % 3 === 1 ? '(Git同步)' : '(系统监控)'}`,
    data: { index: i, timestamp: Date.now() - i * 60000 }
  }));
  
  res.json({
    success: true,
    code: 200,
    message: '日志获取成功',
    data: {
      logs: logs,
      total: logs.length,
      hasMore: false
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}`
  });
});

// 7. 启动监控 (POST)
app.post('/api/v1/monitoring/start', (req, res) => {
  res.json({
    success: true,
    code: 200,
    message: '监控已启动',
    data: {
      monitoring: {
        status: 'running',
        mode: 'manual',
        startedAt: new Date().toISOString(),
        checks: ['file', 'system']
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 8. 停止监控 (POST)
app.post('/api/v1/monitoring/stop', (req, res) => {
  res.json({
    success: true,
    code: 200,
    message: '监控已停止',
    data: {
      monitoring: {
        status: 'stopped',
        stoppedAt: new Date().toISOString()
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 9. 处理未找到的路由
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    code: 404,
    message: `未找到路由: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// ==================== WebSocket服务器 ====================

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log(`[${new Date().toLocaleTimeString()}] WebSocket客户端已连接`);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    message: '已连接到OpenClaw适配器',
    timestamp: new Date().toISOString(),
    clientCount: wss.clients.size
  }));
  
  // 定时发送心跳
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }));
    }
  }, 30000);
  
  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[${new Date().toLocaleTimeString()}] 收到消息:`, data.type);
      
      // 回应消息
      ws.send(JSON.stringify({
        type: 'ack',
        originalType: data.type,
        timestamp: new Date().toISOString(),
        received: true
      }));
      
      // 如果是订阅请求，发送一些模拟数据
      if (data.type === 'subscribe') {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'log.entry',
            data: {
              id: `log_${Date.now()}`,
              timestamp: new Date().toISOString(),
              level: 'info',
              source: 'adapter',
              message: '已订阅监控主题，开始接收实时日志'
            }
          }));
        }, 1000);
      }
    } catch (error) {
      console.error('消息解析错误:', error);
    }
  });
  
  // 连接关闭
  ws.on('close', () => {
    console.log(`[${new Date().toLocaleTimeString()}] WebSocket客户端已断开`);
    clearInterval(heartbeat);
  });
  
  // 错误处理
  ws.on('error', (error) => {
    console.error(`[${new Date().toLocaleTimeString()}] WebSocket错误:`, error);
  });
});

// ==================== 启动服务器 ====================

// 启动HTTP服务器
const server = app.listen(HTTP_PORT, () => {
  console.log('='.repeat(50));
  console.log('OpenClaw简化适配器已启动');
  console.log('='.repeat(50));
  console.log(`HTTP API:  http://localhost:${HTTP_PORT}`);
  console.log(`WebSocket: ws://localhost:${WS_PORT}`);
  console.log('');
  console.log('可用端点:');
  console.log(`  • 健康检查: http://localhost:${HTTP_PORT}/health`);
  console.log(`  • 系统状态: http://localhost:${HTTP_PORT}/api/v1/system/status`);
  console.log(`  • 文件列表: http://localhost:${HTTP_PORT}/api/v1/knowledge/files`);
  console.log(`  • 监控日志: http://localhost:${HTTP_PORT}/api/v1/monitoring/logs`);
  console.log('');
  console.log('前端配置:');
  console.log('  • VITE_PF_API_URL=/api/v1');
  console.log('  • VITE_PF_WS_URL=');
  console.log('');
  console.log('Vite代理配置已包含在 vite.config.ts 中');
  console.log('='.repeat(50));
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('HTTP服务器已关闭');
    wss.close(() => {
      console.log('WebSocket服务器已关闭');
      process.exit(0);
    });
  });
});