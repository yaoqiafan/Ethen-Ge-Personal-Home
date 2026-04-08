// 完整的OpenClaw适配器 - 包含所有PF API端点
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const HTTP_PORT = 3001;
const WS_PORT = 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ==================== 模拟数据生成器 ====================

function generateSystemStatus() {
  return {
    system: {
      name: 'PF.AutoFramework',
      version: '1.0.0',
      status: 'running',
      uptime: 86400 + Math.floor(Math.random() * 1000),
      memoryUsage: 40 + Math.random() * 10,
      cpuUsage: 10 + Math.random() * 5
    },
    knowledgeBase: {
      status: 'healthy',
      documentCount: 128 + Math.floor(Math.random() * 10),
      totalSize: 15728640,
      lastUpdated: new Date().toISOString()
    },
    monitoring: {
      status: 'active',
      lastCheck: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 3600000).toISOString(),
      errorCount: 0
    }
  };
}

function generateFiles() {
  const files = [
    'PF_AutoFramework_知识库.md',
    'PF_AutoFramework_快速参考.md',
    '监控系统使用说明.md',
    'BOOTSTRAP.md',
    'IDENTITY.md',
    'SOUL.md',
    'USER.md',
    'MEMORY.md'
  ].map((name, i) => ({
    name,
    path: `/docs/${name}`,
    type: 'file',
    size: 1024 * (10 + i * 5),
    modified: new Date(Date.now() - i * 3600000).toISOString(),
    created: new Date(Date.now() - i * 86400000).toISOString(),
    extension: '.md',
    mimeType: 'text/markdown',
    permissions: 'rw-r--r--',
    checksum: `checksum_${i}`
  }));

  const directories = [
    { name: 'docs', fileCount: 8 },
    { name: 'scripts', fileCount: 5 },
    { name: 'config', fileCount: 3 },
    { name: 'logs', fileCount: 12 }
  ].map((dir, i) => ({
    name: dir.name,
    path: `/${dir.name}`,
    type: 'directory',
    fileCount: dir.fileCount,
    size: 1024 * dir.fileCount * 100,
    modified: new Date().toISOString()
  }));

  return { files, directories };
}

function generateLogs(limit = 20) {
  const levels = ['info', 'success', 'warning', 'error'];
  const sources = ['file.watcher', 'git.sync', 'system.monitor', 'api.gateway', 'websocket'];
  const messages = [
    '文件变更检测: docs/PF_AutoFramework_知识库.md',
    'Git同步完成: 已拉取最新代码',
    '系统监控: CPU使用率正常',
    'WebSocket连接已建立',
    'API请求处理完成',
    '知识库索引更新',
    '健康检查通过',
    '监控任务调度中'
  ];

  return Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
    id: `log_${Date.now()}_${i}`,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    level: levels[i % levels.length],
    source: sources[i % sources.length],
    message: `${messages[i % messages.length]} (${i + 1})`,
    data: { index: i, timestamp: Date.now() - i * 60000 }
  }));
}

// ==================== 通用响应包装器 ====================

function successResponse(data, message = '操作成功') {
  return {
    success: true,
    code: 200,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

function errorResponse(message, code = 500) {
  return {
    success: false,
    code,
    message,
    timestamp: new Date().toISOString()
  };
}

// ==================== API端点实现 ====================

// 1. 健康检查
app.get('/health', (req, res) => {
  res.json(successResponse({
    services: {
      http: `http://localhost:${HTTP_PORT}`,
      websocket: `ws://localhost:${WS_PORT}`,
      openclaw_gateway: 'http://localhost:18789'
    },
    status: 'healthy',
    uptime: process.uptime()
  }, 'OpenClaw适配器运行正常'));
});

// 2. 系统状态 (GET)
app.get('/api/v1/system/status', (req, res) => {
  res.json(successResponse(generateSystemStatus(), '系统状态获取成功'));
});

// 3. 刷新系统状态 (POST)
app.post('/api/v1/system/refresh', (req, res) => {
  setTimeout(() => {
    res.json(successResponse(generateSystemStatus(), '系统状态已刷新'));
  }, 500); // 模拟延迟
});

// 4. 健康检查 (GET)
app.get('/api/v1/health', (req, res) => {
  res.json(successResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'ok', latency: 12 + Math.random() * 10 },
      filesystem: { status: 'ok', freeSpace: 1024 * 1024 * 1024 },
      network: { status: 'ok', github: true, local: true }
    }
  }, '健康检查通过'));
});

// 5. 系统诊断 (GET)
app.get('/api/v1/diagnostics', (req, res) => {
  res.json(successResponse({
    system: {
      platform: 'OpenClaw适配器',
      arch: 'x64',
      nodeVersion: process.version,
      memory: {
        total: 1024 * 1024 * 1024,
        free: 512 * 1024 * 1024,
        used: 512 * 1024 * 1024
      }
    },
    services: {
      api: 'running',
      websocket: 'running',
      monitoring: 'active'
    },
    issues: []
  }, '系统诊断完成'));
});

// 6. 文件列表 (GET)
app.get('/api/v1/knowledge/files', (req, res) => {
  const { type = 'all', sortBy = 'name', order = 'asc' } = req.query;
  const { files, directories } = generateFiles();
  
  // 简单的过滤和排序
  let filteredFiles = files;
  if (type !== 'all') {
    filteredFiles = files.filter(f => f.extension === `.${type}`);
  }
  
  res.json(successResponse({ files: filteredFiles, directories }, '文件列表获取成功'));
});

// 7. 文件内容 (GET)
app.get('/api/v1/knowledge/files/:path/content', (req, res) => {
  const filePath = req.params.path;
  const fileName = filePath.split('/').pop() || 'unknown';
  
  res.json(successResponse({
    file: {
      name: fileName,
      path: filePath,
      size: 1024 * 50,
      lines: 100,
      encoding: 'utf-8'
    },
    content: `# ${fileName}\n\n## 文件内容\n\n这是${fileName}的模拟内容。\n\n### 文件信息\n- 路径: ${filePath}\n- 大小: 50KB\n- 类型: Markdown文档\n- 生成时间: ${new Date().toLocaleString()}\n\n### 示例内容\n这是一个模拟的文件内容，用于前端测试和演示。\n实际使用时会显示真实的文件内容。`,
    metadata: {
      title: fileName.replace('.md', ''),
      author: '系统管理员',
      created: new Date(Date.now() - 86400000).toISOString(),
      modified: new Date().toISOString(),
      wordCount: 150,
      readingTime: '2分钟'
    }
  }, '文件内容获取成功'));
});

// 8. 全文搜索 (GET)
app.get('/api/v1/knowledge/search', (req, res) => {
  const { query } = req.query;
  
  res.json(successResponse({
    query: query || '',
    totalResults: 3,
    results: [
      {
        file: 'PF_AutoFramework_知识库.md',
        path: '/docs/PF_AutoFramework_知识库.md',
        lineNumber: 42,
        lineContent: `找到关于"${query}"的搜索结果`,
        score: 0.85,
        context: {
          before: '上一行内容...',
          after: '下一行内容...'
        }
      },
      {
        file: '快速参考.md',
        path: '/docs/快速参考.md',
        lineNumber: 15,
        lineContent: `相关参考: ${query}`,
        score: 0.72,
        context: {
          before: '参考文档...',
          after: '更多信息...'
        }
      }
    ]
  }, '搜索完成'));
});

// 9. 监控日志 (GET)
app.get('/api/v1/monitoring/logs', (req, res) => {
  const { limit = 20, level = 'all' } = req.query;
  const logs = generateLogs(limit);
  
  // 按级别过滤
  const filteredLogs = level === 'all' 
    ? logs 
    : logs.filter(log => log.level === level);
  
  res.json(successResponse({
    logs: filteredLogs,
    total: filteredLogs.length,
    hasMore: false
  }, '日志获取成功'));
});

// 10. 启动监控 (POST) - 前端需要的端点！
app.post('/api/v1/monitoring/start', (req, res) => {
  console.log('启动监控请求:', req.body);
  
  setTimeout(() => {
    res.json(successResponse({
      monitoring: {
        status: 'running',
        mode: req.body.mode || 'manual',
        startedAt: new Date().toISOString(),
        pid: process.pid,
        checks: req.body.checks || ['file', 'git', 'system'],
        duration: 0
      }
    }, '监控已启动'));
  }, 300);
});

// 11. 停止监控 (POST) - 前端需要的端点！
app.post('/api/v1/monitoring/stop', (req, res) => {
  setTimeout(() => {
    res.json(successResponse({
      monitoring: {
        status: 'stopped',
        stoppedAt: new Date().toISOString(),
        duration: 3600
      }
    }, '监控已停止'));
  }, 300);
});

// 12. GitHub状态 (GET)
app.get('/api/v1/github/status', (req, res) => {
  const { repo = 'yaoqiafan/PF.AutoFramework', branch = 'main' } = req.query;
  
  res.json(successResponse({
    repository: {
      name: 'PF.AutoFramework',
      owner: 'yaoqiafan',
      url: 'https://github.com/yaoqiafan/PF.AutoFramework',
      description: '工业自动化软件框架',
      stars: 128,
      forks: 32,
      watchers: 45
    },
    branch: {
      name: branch,
      commit: {
        sha: 'abc123def456',
        message: '更新文档和示例',
        author: 'yaoqiafan',
        date: new Date().toISOString()
      },
      behind: 0,
      ahead: 0
    },
    lastChecked: new Date().toISOString(),
    isUpToDate: true
  }, 'GitHub状态获取成功'));
});

// 13. GitHub检查更新 (POST) - 前端需要的端点！
app.post('/api/v1/github/check-updates', (req, res) => {
  setTimeout(() => {
    res.json(successResponse({
      hasUpdates: false,
      latestCommit: {
        sha: 'xyz789',
        message: '最新的提交消息',
        author: '系统',
        date: new Date().toISOString()
      },
      changes: [],
      lastChecked: new Date().toISOString()
    }, 'GitHub更新检查完成'));
  }, 500);
});

// 14. GitHub拉取代码 (POST) - 前端需要的端点！
app.post('/api/v1/github/pull', (req, res) => {
  setTimeout(() => {
    res.json(successResponse({
      success: true,
      operation: 'pull',
      changes: [
        { file: 'README.md', action: 'modified', diff: '+更新文档' },
        { file: 'src/main.js', action: 'modified', diff: '+修复bug' }
      ],
      summary: { added: 0, modified: 2, deleted: 0 }
    }, 'GitHub拉取完成'));
  }, 800);
});

// 15. 配置获取 (GET)
app.get('/api/v1/config', (req, res) => {
  const { key } = req.query;
  
  const config = {
    system: {
      name: 'PF.AutoFramework',
      version: '1.0.0',
      environment: 'development'
    },
    api: {
      baseUrl: '/api/v1',
      timeout: 30000
    },
    monitoring: {
      enabled: true,
      interval: 60000
    },
    knowledgeBase: {
      path: '/docs',
      maxSize: 104857600
    }
  };
  
  if (key) {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
      if (value === undefined) break;
    }
    res.json(successResponse(value, '配置获取成功'));
  } else {
    res.json(successResponse(config, '配置获取成功'));
  }
});

// 16. 配置更新 (PUT)
app.put('/api/v1/config', (req, res) => {
  setTimeout(() => {
    res.json(successResponse(req.body, '配置更新成功'));
  }, 300);
});

// 17. 配置重置 (DELETE)
app.delete('/api/v1/config', (req, res) => {
  const { section } = req.query;
  
  setTimeout(() => {
    res.json(successResponse({
      reset: section || 'all',
      timestamp: new Date().toISOString()
    }, '配置重置成功'));
  }, 300);
});

// 18. 处理未找到的路由
app.use('*', (req, res) => {
  console.warn(`未找到路由: ${req.method} ${req.originalUrl}`);
  res.status(404).json(errorResponse(`未找到路由: ${req.method} ${req.originalUrl}`, 404));
});

// ==================== WebSocket服务器 ====================

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`[${new Date().toLocaleTimeString()}] WebSocket客户端连接: ${clientId}`);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    message: '已连接到OpenClaw适配器',
    clientId,
    timestamp: new Date().toISOString(),
    clientCount: wss.clients.size
  }));
  
  // 定时发送心跳和模拟日志
  const intervals = [];
  
  // 心跳间隔
  intervals.push(setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }));
    }
  }, 30000));
  
  // 模拟日志推送
  intervals.push(setInterval(() => {
    if (ws.readyState === WebSocket.OPEN && Math.random() > 0.7) {
      const log = generateLogs(1)[0];
      ws.send(JSON.stringify({
        type: 'log.entry',
        data: log
      }));
    }
  }, 5000));
  
  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[${new Date().toLocaleTimeString()}] 收到消息 ${clientId}:`, data.type);
      
      // 回应消息
      ws.send(JSON.stringify({
        type: 'ack',
        originalType: data.type,
        timestamp: new Date().toISOString(),
        received: true
      }));
      
      // 处理特定类型的消息
      switch (data.type) {
        case 'subscribe':
          ws.send(JSON.stringify({
            type: 'subscribed',
            topics: data.topics || ['*'],
            timestamp: new Date().toISOString()
          }));
          
          // 发送一些初始数据
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'log.entry',
              data: {
                id: `init_${Date.now()}`,
                timestamp: new Date().toISOString(),
                level: 'success',
                source: 'websocket',
                message: '已订阅监控主题，开始接收实时数据'
              }
            }));
          }, 100);
          break;
          
        case 'unsubscribe':
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            topics: data.topics || [],
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString(),
            original: data.timestamp
          }));
          break;
      }
    } catch (error) {
      console.error(`消息解析错误 ${clientId}:`, error);
    }
  });
  
  // 连接关闭
  ws.on('close', () => {
    console.log(`[${new Date().toLocaleTimeString()}] WebSocket客户端断开: ${clientId}`);
    intervals.forEach(clearInterval);
  });
  
  // 错误处理
  ws.on('error', (error) => {
    console.error(`WebSocket错误 ${clientId}:`, error);
    intervals.forEach(clearInterval);
  });
});

// ==================== 启动服务器 ====================

// 启动HTTP服务器
const server = app.listen(HTTP_PORT, () => {
  console.log('='.repeat(60));
  console.log('OpenClaw完整适配器已启动');
  console.log('='.repeat(60));
  console.log(`HTTP API:  http://localhost:${HTTP_PORT}`);
  console.log(`WebSocket: ws://localhost:${WS_PORT}`);
  console.log('');
  console.log('?? 可用端点:');
  console.log('');
  console.log('?? 系统相关:');
  console.log(`  GET  /health                    - 适配器健康检查`);
  console.log(`  GET  /api/v1/system/status      - 系统状态`);
  console.log(`  POST /api/v1/system/refresh     - 刷新状态`);
  console.log(`  GET  /api/v1/health             - 系统健康检查`);
  console.log(`  GET  /api/v1/diagnostics        - 系统诊断`);
  console.log('');
  console.log('?? 文件相关:');
  console.log(`  GET  /api/v1/knowledge/files    - 文件列表`);
  console.log(`  GET  /api/v1/knowledge/files/*  - 文件内容`);
  console.log(`  GET  /api/v1/knowledge/search   - 全文搜索`);
  console.log('');
  console.log('?? 监控相关:');
  console.log(`  GET  /api/v1/monitoring/logs    - 监控日志`);
  console.log(`  POST /api/v1/monitoring/start   - 启动监控`);
  console.log(`  POST /api/v1/monitoring/stop    - 停止监控`);
  console.log('');
  console.log('?? GitHub相关:');
  console.log(`  GET  /api/v1/github/status      - GitHub状态`);
  console.log(`  POST /api/v1/github/check-updates - 检查更新`);
  console.log(`  POST /api/v1/github/pull        - 拉取代码`);
  console.log('');
  console.log('?? 配置相关:');
  console.log(`  GET  /api/v1/config             - 获取配置`);
  console.log(`  PUT  /api/v1/config             - 更新配置`);
  console.log(`  DELETE /api/v1/config           - 重置配置`);
  console.log('');
  console.log('?? 前端配置:');
  console.log(`  VITE_PF_API_URL=/api/v1`);
  console.log(`  VITE_PF_WS_URL=`);
  console.log('');
  console.log('?? 测试命令:');
  console.log(`  curl http://localhost:${HTTP_PORT}/api/v1/system/status`);
  console.log(`  curl -X POST http://localhost:${HTTP_PORT}/api/v1/monitoring/start`);
  console.log('');
  console.log('='.repeat(60));
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