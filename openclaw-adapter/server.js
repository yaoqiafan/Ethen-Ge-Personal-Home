const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001;

// OpenClaw网关配置
const OPENCLAW_GATEWAY = 'http://localhost:18789';
const OPENCLAW_TOKEN = 'd35fefbd61c79bac0feedcc07ce68132f38b2c287a2fb439';

// 中间件
app.use(cors());
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OpenClaw适配器运行正常',
    timestamp: new Date().toISOString(),
    openclaw: {
      gateway: OPENCLAW_GATEWAY,
      status: 'connected'
    }
  });
});

// 系统状态模拟（PFSystemStatus）
app.get('/api/v1/system/status', async (req, res) => {
  try {
    // 模拟系统状态数据
    const status = {
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
    };
    
    res.json({
      success: true,
      code: 200,
      message: '系统状态获取成功',
      data: status,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: `系统状态获取失败: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 知识库文件列表（PFFileManager）
app.get('/api/v1/knowledge/files', async (req, res) => {
  try {
    const { type = 'all', sortBy = 'name', order = 'asc' } = req.query;
    
    // 模拟文件数据
    const files = [
      {
        name: 'PF_AutoFramework_知识库.md',
        path: '/docs/PF_AutoFramework_知识库.md',
        type: 'file',
        size: 24576,
        modified: '2026-04-07T10:30:00Z',
        created: '2026-04-07T10:00:00Z',
        extension: '.md',
        mimeType: 'text/markdown',
        permissions: 'rw-r--r--',
        checksum: 'abc123'
      },
      {
        name: 'PF_AutoFramework_快速参考.md',
        path: '/docs/PF_AutoFramework_快速参考.md',
        type: 'file',
        size: 12288,
        modified: '2026-04-07T11:15:00Z',
        created: '2026-04-07T11:00:00Z',
        extension: '.md',
        mimeType: 'text/markdown',
        permissions: 'rw-r--r--',
        checksum: 'def456'
      },
      {
        name: '监控系统使用说明.md',
        path: '/docs/监控系统使用说明.md',
        type: 'file',
        size: 8192,
        modified: '2026-04-07T12:45:00Z',
        created: '2026-04-07T12:30:00Z',
        extension: '.md',
        mimeType: 'text/markdown',
        permissions: 'rw-r--r--',
        checksum: 'ghi789'
      }
    ];
    
    const directories = [
      {
        name: 'docs',
        path: '/docs',
        type: 'directory',
        fileCount: 3,
        size: 45056,
        modified: '2026-04-07T12:45:00Z'
      },
      {
        name: 'scripts',
        path: '/scripts',
        type: 'directory',
        fileCount: 5,
        size: 30720,
        modified: '2026-04-07T13:20:00Z'
      }
    ];
    
    res.json({
      success: true,
      code: 200,
      message: '文件列表获取成功',
      data: { files, directories },
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: `文件列表获取失败: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 文件内容（PFFileManager）
app.get('/api/v1/knowledge/files/:path/content', async (req, res) => {
  try {
    const filePath = req.params.path;
    
    // 模拟文件内容
    const content = `# ${filePath.split('/').pop()}

这是文件 ${filePath} 的模拟内容。

## 文件信息
- 路径：${filePath}
- 大小：24.5 KB
- 最后修改：${new Date().toISOString()}
- 类型：Markdown文档

## 内容示例
这是一个模拟的文件内容，用于测试前端文件预览功能。

实际使用时，这里会显示真实的文件内容。`;

    res.json({
      success: true,
      code: 200,
      message: '文件内容获取成功',
      data: {
        file: {
          name: filePath.split('/').pop(),
          path: filePath,
          size: 24576,
          lines: 15,
          encoding: 'utf-8'
        },
        content: content,
        metadata: {
          title: filePath.split('/').pop().replace('.md', ''),
          author: '系统管理员',
          created: '2026-04-07T10:00:00Z',
          modified: new Date().toISOString(),
          wordCount: 120,
          readingTime: '1分钟'
        }
      },
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: `文件内容获取失败: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 搜索（PFFileManager）
app.get('/api/v1/knowledge/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    // 模拟搜索结果
    const results = [
      {
        file: 'PF_AutoFramework_知识库.md',
        path: '/docs/PF_AutoFramework_知识库.md',
        lineNumber: 42,
        lineContent: `这是关于 ${query} 的搜索结果示例`,
        score: 0.85,
        context: {
          before: '上一行内容...',
          after: '下一行内容...'
        }
      }
    ];
    
    res.json({
      success: true,
      code: 200,
      message: '搜索成功',
      data: {
        query: query,
        totalResults: results.length,
        results: results
      },
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: `搜索失败: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 监控日志（PFMonitorConsole）
app.get('/api/v1/monitoring/logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // 模拟监控日志
    const logs = Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
      id: `log_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      level: i % 10 === 0 ? 'error' : i % 5 === 0 ? 'warning' : 'info',
      source: i % 3 === 0 ? 'file.watcher' : i % 3 === 1 ? 'git.sync' : 'system.monitor',
      message: `模拟日志条目 ${i + 1}: 系统运行正常`,
      data: { index: i }
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
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: `日志获取失败: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// WebSocket代理（用于PFMonitorConsole）
const wss = new WebSocket.Server({ port: 3002 });

wss.on('connection', (ws) => {
  console.log('WebSocket客户端已连接');
  
  // 连接到OpenClaw WebSocket
  const openclawWs = new WebSocket(`ws://localhost:18789/ws`);
  
  openclawWs.on('open', () => {
    console.log('已连接到OpenClaw WebSocket');
    
    // 转发消息
    ws.on('message', (message) => {
      console.log('收到客户端消息:', message.toString());
      openclawWs.send(message);
    });
    
    openclawWs.on('message', (message) => {
      console.log('收到OpenClaw消息:', message.toString());
      ws.send(message);
    });
  });
  
  openclawWs.on('error', (error) => {
    console.error('OpenClaw WebSocket连接错误:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'WebSocket连接失败',
      timestamp: new Date().toISOString()
    }));
  });
  
  ws.on('close', () => {
    console.log('WebSocket客户端已断开');
    openclawWs.close();
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`OpenClaw适配器服务已启动`);
  console.log(`HTTP API: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:3002`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`=========================================`);
  console.log(`前端配置:`);
  console.log(`- VITE_PF_API_URL=http://localhost:${PORT}/api/v1`);
  console.log(`- VITE_PF_WS_URL=ws://localhost:3002`);
  console.log(`=========================================`);
});