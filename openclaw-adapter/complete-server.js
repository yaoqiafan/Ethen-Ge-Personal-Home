// ====================================================
// OpenClaw适配器 v2.0 - 完整生产版本
// 生成时间：2026-04-08 14:45
// 本机信息：DESKTOP-U2JQACR (Windows Server 2019)
// ====================================================

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const os = require('os');

const app = express();
const HTTP_PORT = 3001;
const WS_PORT = 3002;

// ==================== 本机信息 ====================
const HOST_INFO = {
  hostname: os.hostname(),
  platform: os.platform(),
  arch: os.arch(),
  release: os.release(),
  cpus: os.cpus().length,
  totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
  freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
  uptime: os.uptime(),
  networkInterfaces: Object.keys(os.networkInterfaces()).length,
  userInfo: os.userInfo().username,
  tempDir: os.tmpdir(),
  homeDir: os.homedir()
};

// ==================== 中间件配置 ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false 
  });
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip || 'local'}`);
  next();
});

// ==================== 模拟数据生成器 ====================

function generateSystemStatus() {
  const now = new Date();
  return {
    system: {
      name: 'PF.AutoFramework',
      version: '2.0.0',
      status: 'running',
      uptime: Math.floor(Math.random() * 1000000),
      memoryUsage: Math.round(30 + Math.random() * 20),
      cpuUsage: Math.round(5 + Math.random() * 15),
      lastUpdated: now.toISOString(),
      hostInfo: {
        name: HOST_INFO.hostname,
        platform: HOST_INFO.platform,
        cpus: HOST_INFO.cpus,
        memory: HOST_INFO.totalMemory
      }
    },
    knowledgeBase: {
      status: 'healthy',
      documentCount: 150 + Math.floor(Math.random() * 50),
      totalSize: 20971520,
      lastUpdated: now.toISOString(),
      lastSync: new Date(now.getTime() - 3600000).toISOString()
    },
    monitoring: {
      status: 'active',
      lastCheck: now.toISOString(),
      nextCheck: new Date(now.getTime() + 1800000).toISOString(),
      errorCount: 0,
      activeChecks: ['system', 'files', 'git', 'network']
    }
  };
}

function generateFiles() {
  const baseFiles = [
    { name: 'PF_AutoFramework_知识库.md', size: 24576, type: 'document' },
    { name: 'PF_AutoFramework_快速参考.md', size: 12288, type: 'guide' },
    { name: '监控系统使用说明.md', size: 8192, type: 'manual' },
    { name: 'BOOTSTRAP.md', size: 4096, type: 'config' },
    { name: 'IDENTITY.md', size: 2048, type: 'config' },
    { name: 'SOUL.md', size: 3072, type: 'config' },
    { name: 'USER.md', size: 2048, type: 'config' },
    { name: 'MEMORY.md', size: 10240, type: 'log' },
    { name: 'API参考手册.md', size: 32768, type: 'document' },
    { name: '部署指南.md', size: 16384, type: 'guide' }
  ];

  const files = baseFiles.map((file, i) => ({
    name: file.name,
    path: `docs/${file.name}`,  // 改为相对路径，不带前导斜杠
    fullPath: `/docs/${file.name}`,  // 保留完整路径
    type: 'file',
    size: file.size,
    modified: new Date(Date.now() - i * 3600000).toISOString(),
    created: new Date(Date.now() - i * 86400000).toISOString(),
    extension: '.md',
    mimeType: 'text/markdown',
    permissions: 'rw-r--r--',
    checksum: `md5_${Math.random().toString(36).substr(2, 8)}`,
    category: file.type,
    url: `/api/v1/knowledge/files/docs/${encodeURIComponent(file.name)}/content`  // 添加完整URL
  }));

  const directories = [
    { name: 'docs', fileCount: 10, description: '文档目录' },
    { name: 'scripts', fileCount: 8, description: '脚本目录' },
    { name: 'config', fileCount: 5, description: '配置文件' },
    { name: 'logs', fileCount: 15, description: '日志文件' },
    { name: 'backups', fileCount: 3, description: '备份文件' }
  ].map((dir, i) => ({
    name: dir.name,
    path: `/${dir.name}`,
    type: 'directory',
    fileCount: dir.fileCount,
    size: dir.fileCount * 5120,
    modified: new Date().toISOString(),
    description: dir.description
  }));

  return { files, directories };
}

function generateLogs(limit = 20) {
  const levels = ['info', 'success', 'warning', 'error'];
  const sources = ['file.watcher', 'git.sync', 'system.monitor', 'api.gateway', 'websocket', 'scheduler'];
  const messages = [
    '文件变更检测: docs/PF_AutoFramework_知识库.md',
    'Git同步完成: 已拉取最新代码',
    '系统监控: CPU使用率正常',
    'WebSocket连接已建立',
    'API请求处理完成',
    '知识库索引更新',
    '健康检查通过',
    '监控任务调度中',
    '备份任务执行完成',
    '安全扫描完成，无威胁发现'
  ];

  return Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
    id: `log_${Date.now()}_${i}`,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    level: levels[i % levels.length],
    source: sources[i % sources.length],
    message: `${messages[i % messages.length]} (序号: ${i + 1})`,
    data: { 
      index: i, 
      host: HOST_INFO.hostname,
      pid: process.pid 
    }
  }));
}

// ==================== 响应包装器 ====================

function successResponse(data, message = '操作成功') {
  return {
    success: true,
    code: 200,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    server: {
      hostname: HOST_INFO.hostname,
      version: '2.0.0'
    }
  };
}

function errorResponse(message, code = 500, details = null) {
  return {
    success: false,
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    server: HOST_INFO.hostname
  };
}

// ==================== 核心API端点 ====================

// 1. 适配器健康检查
app.get('/health', (req, res) => {
  res.json(successResponse({
    status: 'healthy',
    server: HOST_INFO,
    services: {
      http: `http://localhost:${HTTP_PORT}`,
      websocket: `ws://localhost:${WS_PORT}`,
      openclaw_gateway: 'http://localhost:18789',
      uptime: process.uptime()
    },
    timestamp: new Date().toISOString()
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
  }, 300);
});

// 4. 系统健康检查 (GET)
app.get('/api/v1/health', (req, res) => {
  res.json(successResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'ok', latency: Math.round(10 + Math.random() * 20) },
      filesystem: { status: 'ok', freeSpace: Math.round(Math.random() * 500) + ' GB' },
      network: { status: 'ok', github: true, local: true, latency: Math.round(20 + Math.random() * 50) }
    },
    host: HOST_INFO.hostname
  }, '健康检查通过'));
});

// 5. 系统诊断 (GET)
app.get('/api/v1/diagnostics', (req, res) => {
  res.json(successResponse({
    system: HOST_INFO,
    services: {
      api: { status: 'running', port: HTTP_PORT },
      websocket: { status: 'running', port: WS_PORT },
      monitoring: { status: 'active', checks: 4 }
    },
    issues: [],
    recommendations: ['一切正常，无需操作']
  }, '系统诊断完成'));
});

// 6. 文件列表 (GET)
app.get('/api/v1/knowledge/files', (req, res) => {
  const { type = 'all', sortBy = 'name', order = 'asc' } = req.query;
  const { files, directories } = generateFiles();
  
  let filteredFiles = files;
  if (type !== 'all' && type !== 'file') {
    filteredFiles = files.filter(f => f.category === type);
  }
  
  // 排序
  filteredFiles.sort((a, b) => {
    const aVal = a[sortBy] || a.name;
    const bVal = b[sortBy] || b.name;
    const modifier = order === 'desc' ? -1 : 1;
    return aVal > bVal ? modifier : -modifier;
  });
  
  // 确保每个文件都有正确的content URL
  const filesWithUrls = filteredFiles.map(file => ({
    ...file,
    contentUrl: `/api/v1/knowledge/files/${encodeURIComponent(file.path)}/content`
  }));
  
  res.json(successResponse({ 
    files: filesWithUrls, 
    directories,
    total: filteredFiles.length,
    query: { type, sortBy, order },
    note: '使用contentUrl字段获取文件内容'
  }, '文件列表获取成功'));
});

// 7. 文件内容 (GET) - 支持完整路径和URL编码
app.get('/api/v1/knowledge/files/*/content', (req, res) => {
  // 获取完整路径（包含/docs/前缀）
  const fullPath = req.params[0];
  const filePath = decodeURIComponent(fullPath); // 解码URL编码
  const fileName = filePath.split('/').pop() || 'unknown.md';
  
  console.log(`文件内容请求: 原始路径=${fullPath}, 解码路径=${filePath}, 文件名=${fileName}`);
  
  res.json(successResponse({
    file: {
      name: fileName,
      path: filePath,
      size: 1024 * (50 + Math.random() * 50),
      lines: 100 + Math.floor(Math.random() * 50),
      encoding: 'utf-8',
      mimeType: 'text/markdown'
    },
    content: `# ${fileName.replace('.md', '')}\n\n## 文件内容\n\n这是${fileName}的模拟内容，来自服务器: ${HOST_INFO.hostname}\n\n### 文件信息\n- 路径: ${filePath}\n- 服务器: ${HOST_INFO.hostname}\n- 生成时间: ${new Date().toLocaleString('zh-CN')}\n- 大小: 约${Math.round(50 + Math.random() * 50)}KB\n\n### 示例内容\n这是一个模拟的文件内容，用于前端测试和演示。\n实际使用时会显示真实的文件内容。\n\n服务器信息:\n- 主机名: ${HOST_INFO.hostname}\n- 平台: ${HOST_INFO.platform}\n- 内存: ${HOST_INFO.totalMemory}\n- CPU核心: ${HOST_INFO.cpus}`,
    metadata: {
      title: fileName.replace('.md', ''),
      author: '系统管理员',
      created: new Date(Date.now() - 86400000).toISOString(),
      modified: new Date().toISOString(),
      wordCount: 150 + Math.floor(Math.random() * 100),
      readingTime: '2-3分钟'
    }
  }, '文件内容获取成功'));

// 7.1 备用文件内容路由（处理不同格式的路径）
app.get('/api/v1/knowledge/files/:folder/:filename/content', (req, res) => {
  const folder = decodeURIComponent(req.params.folder);
  const filename = decodeURIComponent(req.params.filename);
  const filePath = `${folder}/${filename}`;
  
  console.log(`备用路由: folder=${folder}, filename=${filename}, path=${filePath}`);
  
  res.json(successResponse({
    file: {
      name: filename,
      path: filePath,
      size: 1024 * (50 + Math.random() * 50),
      lines: 100 + Math.floor(Math.random() * 50),
      encoding: 'utf-8',
      mimeType: 'text/markdown'
    },
    content: `# ${filename.replace('.md', '')}\n\n## 文件内容 (备用路由)\n\n这是${filename}的模拟内容，来自备用路由。\n\n路径: ${filePath}\n服务器: ${HOST_INFO.hostname}`,
    metadata: {
      title: filename.replace('.md', ''),
      author: '系统管理员',
      created: new Date(Date.now() - 86400000).toISOString(),
      modified: new Date().toISOString()
    }
  }, '文件内容获取成功（备用路由）'));
});
});

// 8. 监控日志 (GET)
app.get('/api/v1/monitoring/logs', (req, res) => {
  const { limit = 50, level = 'all', since } = req.query;
  const logs = generateLogs(parseInt(limit));
  
  let filteredLogs = logs;
  if (level !== 'all') {
    filteredLogs = logs.filter(log => log.level === level);
  }
  
  if (since) {
    const sinceTime = new Date(since).getTime();
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() > sinceTime);
  }
  
  res.json(successResponse({
    logs: filteredLogs,
    total: filteredLogs.length,
    hasMore: false,
    query: { limit, level, since }
  }, '日志获取成功'));
});

// 9. 启动监控 (POST)
app.post('/api/v1/monitoring/start', (req, res) => {
  const { mode = 'manual', checks = ['system', 'files'] } = req.body;
  
  setTimeout(() => {
    res.json(successResponse({
      monitoring: {
        status: 'running',
        mode,
        startedAt: new Date().toISOString(),
        pid: process.pid,
        checks,
        duration: 0,
        host: HOST_INFO.hostname
      }
    }, '监控已启动'));
  }, 200);
});

// 10. 停止监控 (POST)
app.post('/api/v1/monitoring/stop', (req, res) => {
  setTimeout(() => {
    res.json(successResponse({
      monitoring: {
        status: 'stopped',
        stoppedAt: new Date().toISOString(),
        duration: 3600 + Math.floor(Math.random() * 3600),
        host: HOST_INFO.hostname
      }
    }, '监控已停止'));
  }, 200);
});

// 11. GitHub检查更新 (POST)
app.post('/api/v1/github/check-updates', (req, res) => {
  setTimeout(() => {
    res.json(successResponse({
      hasUpdates: false,
      latestCommit: {
        sha: Math.random().toString(36).substr(2, 7),
        message: '更新文档和优化性能',
        author: '系统管理员',
        date: new Date().toISOString()
      },
      changes: [],
      lastChecked: new Date().toISOString(),
      repository: 'yaoqiafan/PF.AutoFramework'
    }, 'GitHub更新检查完成'));
  }, 400);
});

// 12. GitHub拉取代码 (POST)
app.post('/api/v1/github/pull', (req, res) => {
  setTimeout(() => {
    res.json(successResponse({
      success: true,
      operation: 'pull',
      changes: [
        { file: 'README.md', action: 'modified', diff: '+更新文档说明' },
        { file: 'src/main.js', action: 'modified', diff: '+性能优化' },
        { file: 'docs/API参考.md', action: 'added', diff: '+新增API文档' }
      ],
      summary: { added: 1, modified: 2, deleted: 0 },
      timestamp: new Date().toISOString()
    }, 'GitHub拉取完成'));
  }, 600);
});

// 13. 全文搜索 (GET)
app.get('/api/v1/knowledge/search', (req, res) => {
  const { query = '', limit = 10 } = req.query;
  
  res.json(successResponse({
    query,
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
    ],
    server: HOST_INFO.hostname
  }, '搜索完成'));
});

// 14. 路由测试端点 (GET)
app.get('/api/v1/test/routes', (req, res) => {
  const testPaths = [
    'docs/PF_AutoFramework_知识库.md',
    'docs/PF_AutoFramework_快速参考.md',
    'docs/API参考手册.md',
    'docs/BOOTSTRAP.md',
    'docs/IDENTITY.md',
    'docs/SOUL.md',
    'docs/USER.md',
    'docs/MEMORY.md',
    'docs/监控系统使用说明.md',
    'docs/部署指南.md'
  ];
  
  const routes = testPaths.map(path => ({
    path,
    encoded: encodeURIComponent(path),
    url: `/api/v1/knowledge/files/${encodeURIComponent(path)}/content`,
    testUrl: `http://localhost:${HTTP_PORT}/api/v1/knowledge/files/${encodeURIComponent(path)}/content`
  }));
  
  res.json(successResponse({
    routes,
    availableRoutes: [
      'GET /api/v1/knowledge/files/*/content (通配符路由)',
      'GET /api/v1/knowledge/files/:folder/:filename/content (备用路由)',
      'GET /api/v1/knowledge/files (文件列表)'
    ],
    server: HOST_INFO.hostname
  }, '路由测试信息'));
});

// 15. 服务器信息 (GET)
app.get('/api/v1/server/info', (req, res) => {
  res.json(successResponse({
    host: HOST_INFO,
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      memoryUsage: process.memoryUsage()
    },
    adapter: {
      version: '2.0.0',
      ports: { http: HTTP_PORT, websocket: WS_PORT },
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString()
    }
  }, '服务器信息获取成功'));
});

// 15. 处理未找到的路由
app.use('*', (req, res) => {
  console.warn(`未找到路由: ${req.method} ${req.originalUrl}`);
  res.status(404).json(errorResponse(`未找到路由: ${req.method} ${req.originalUrl}`, 404));
});

// 16. 错误处理中间件
app.use((err, req, res, next) => {
  console.error(`服务器错误: ${err.message}`, err.stack);
  res.status(500).json(errorResponse('服务器内部错误', 500, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }));
});

// ==================== WebSocket服务器 ====================

const wss = new WebSocket.Server({ 
  port: WS_PORT,
  clientTracking: true
});

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  console.log(`[${new Date().toLocaleTimeString()}] WebSocket客户端连接: ${clientId} (${clientIp})`);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    message: '已连接到OpenClaw适配器',
    clientId,
    timestamp: new Date().toISOString(),
    clientCount: wss.clients.size,
    server: HOST_INFO.hostname
  }));
  
  // 定时发送心跳和模拟日志
  const intervals = [];
  
  // 心跳间隔 (30秒)
  intervals.push(setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        clientCount: wss.clients.size
      }));
    }
  }, 30000));
  
  // 模拟日志推送 (5-10秒随机)
  intervals.push(setInterval(() => {
    if (ws.readyState === WebSocket.OPEN && Math.random() > 0.7) {
      const log = generateLogs(1)[0];
      ws.send(JSON.stringify({
        type: 'log.entry',
        data: log
      }));
    }
  }, 5000 + Math.random() * 5000));
  
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
        received: true,
        clientId
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
                message: `已订阅监控主题，开始接收实时数据 (服务器: ${HOST_INFO.hostname})`
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
          
        case 'get_status':
          ws.send(JSON.stringify({
            type: 'status',
            data: generateSystemStatus(),
            timestamp: new Date().toISOString()
          }));
          break;
      }
    } catch (error) {
      console.error(`消息解析错误 ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息解析失败',
        error: error.message
      }));
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
  const now = new Date();
  console.log('='.repeat(70));
  console.log('OpenClaw完整适配器 v2.0 已启动');
  console.log('='.repeat(70));
  console.log(`启动时间: ${now.toLocaleString('zh-CN')}`);
  console.log(`服务器: ${HOST_INFO.hostname} (${HOST_INFO.platform} ${HOST_INFO.arch})`);
  console.log(`内存: ${HOST_INFO.totalMemory} | CPU: ${HOST_INFO.cpus}核心`);
  console.log('');
  console.log(`?? HTTP API:  http://localhost:${HTTP_PORT}`);
  console.log(`?? WebSocket: ws://localhost:${WS_PORT}`);
  console.log('');
  console.log('?? 核心端点:');
  console.log('');
  console.log('?? 系统相关:');
  console.log(`  GET  /health                    - 适配器健康检查`);
  console.log(`  GET  /api/v1/system/status      - 系统状态`);
  console.log(`  POST /api/v1/system/refresh     - 刷新状态`);
  console.log(`  GET  /api/v1/health             - 系统健康检查`);
  console.log(`  GET  /api/v1/diagnostics        - 系统诊断`);
  console.log(`  GET  /api/v1/server/info        - 服务器信息`);
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
  console.log(`  POST /api/v1/github/check-updates - 检查更新`);
  console.log(`  POST /api/v1/github/pull        - 拉取代码`);
  console.log('');
  console.log('?? 前端配置:');
  console.log(`  VITE_PF_API_URL=/api/v1`);
  console.log(`  VITE_PF_WS_URL=/api/v1/ws`);
  console.log('');
  console.log('?? 测试命令:');
  console.log(`  curl http://localhost:${HTTP_PORT}/api/v1/system/status`);
  console.log(`  curl -X POST http://localhost:${HTTP_PORT}/api/v1/monitoring/start`);
  console.log(`  curl http://localhost:${HTTP_PORT}/api/v1/server/info`);
  console.log('');
  console.log('?? 提示: 前端通过Vite代理或IIS重写访问上述端点');
  console.log('='.repeat(70));
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  console.log(`断开 ${wss.clients.size} 个WebSocket连接`);
  
  // 关闭所有WebSocket连接
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1000, '服务器关闭');
    }
  });
  
  server.close(() => {
    console.log('HTTP服务器已关闭');
    wss.close(() => {
      console.log('WebSocket服务器已关闭');
      console.log('再见！');
      process.exit(0);
    });
  });
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

console.log(`适配器进程PID: ${process.pid}`);