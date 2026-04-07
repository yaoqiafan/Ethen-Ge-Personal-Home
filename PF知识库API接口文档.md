# PF.AutoFramework 知识库系统 API 接口文档

## 📋 文档概述

本文档定义了 PF.AutoFramework 知识库检测系统前后端交互的完整接口规范，包括数据格式、通讯协议、错误处理和安全性要求。

## 🎯 系统架构

```
前端网页 (HTML/JS) ← HTTP/WebSocket → 后端服务 (OpenClaw/Node.js) ← 文件系统/GitHub API
       ↓                                      ↓
   用户界面                             数据处理和业务逻辑
```

## 🔌 通讯协议

### **1. HTTP REST API**
- **协议**: HTTPS (生产环境) / HTTP (开发环境)
- **端口**: 8080 (默认)
- **编码**: UTF-8
- **格式**: JSON

### **2. WebSocket 实时通讯**
- **协议**: WS/WSS
- **端口**: 8081 (默认)
- **用途**: 实时监控数据推送

### **3. 文件系统访问**
- **协议**: 本地文件系统 API
- **路径**: `C:\Users\Administrator\.openclaw\workspace\`
- **权限**: 只读访问

## 📊 数据格式规范

### **通用响应格式**
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2026-04-07T16:32:00.000Z",
  "requestId": "req_1234567890"
}
```

### **错误响应格式**
```json
{
  "success": false,
  "code": 400,
  "message": "参数错误",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": "缺少必要参数: filePath",
    "stack": "可选，开发环境显示"
  },
  "timestamp": "2026-04-07T16:32:00.000Z",
  "requestId": "req_1234567890"
}
```

### **分页响应格式**
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## 🔍 API 接口列表

### **A. 系统状态接口**

#### **1. 获取系统状态**
```
GET /api/v1/system/status
```

**请求参数**: 无

**响应数据**:
```json
{
  "system": {
    "name": "PF.AutoFramework 知识库系统",
    "version": "1.0.0",
    "status": "running", // running, stopped, error
    "uptime": 3600, // 秒
    "memoryUsage": 45.2, // 百分比
    "cpuUsage": 12.5 // 百分比
  },
  "knowledgeBase": {
    "status": "healthy", // healthy, warning, error
    "documentCount": 5,
    "totalSize": 51200, // 字节
    "lastUpdated": "2026-04-07T15:30:00.000Z"
  },
  "monitoring": {
    "status": "active", // active, paused, stopped
    "lastCheck": "2026-04-07T16:00:00.000Z",
    "nextCheck": "2026-04-07T18:00:00.000Z",
    "errorCount": 0
  }
}
```

#### **2. 刷新系统状态**
```
POST /api/v1/system/refresh
```

**请求参数**: 无

**响应数据**: 同 GET /api/v1/system/status

### **B. 知识库文件接口**

#### **1. 获取文件列表**
```
GET /api/v1/knowledge/files
```

**查询参数**:
```typescript
{
  path?: string;      // 目录路径，默认为根目录
  type?: 'all' | 'md' | 'json' | 'script';  // 文件类型过滤
  page?: number;      // 页码，默认为1
  pageSize?: number;  // 每页数量，默认为20
  sortBy?: 'name' | 'size' | 'modified';  // 排序字段
  order?: 'asc' | 'desc';  // 排序顺序
}
```

**响应数据**:
```json
{
  "files": [
    {
      "name": "PF_AutoFramework_知识库.md",
      "path": "PF_AutoFramework_知识库.md",
      "type": "file",
      "size": 24576,
      "modified": "2026-04-07T15:30:00.000Z",
      "created": "2026-04-07T10:00:00.000Z",
      "extension": ".md",
      "mimeType": "text/markdown",
      "permissions": "rw-r--r--",
      "checksum": "sha256:abc123..."
    }
  ],
  "directories": [
    {
      "name": "scripts",
      "path": "scripts/",
      "type": "directory",
      "fileCount": 8,
      "size": 102400,
      "modified": "2026-04-07T15:30:00.000Z"
    }
  ]
}
```

#### **2. 获取文件内容**
```
GET /api/v1/knowledge/files/{filePath}/content
```

**查询参数**:
```typescript
{
  encoding?: 'utf8' | 'base64';  // 编码格式，默认为utf8
  lineStart?: number;            // 起始行号
  lineEnd?: number;              // 结束行号
  highlight?: boolean;           // 是否高亮语法
}
```

**响应数据**:
```json
{
  "file": {
    "name": "PF_AutoFramework_知识库.md",
    "path": "PF_AutoFramework_知识库.md",
    "size": 24576,
    "lines": 500,
    "encoding": "utf8"
  },
  "content": "# PF.AutoFramework 知识库\n\n## 概述\n...",
  "metadata": {
    "title": "PF.AutoFramework 知识库",
    "author": "小虾AI助手",
    "created": "2026-04-07T10:00:00.000Z",
    "modified": "2026-04-07T15:30:00.000Z",
    "wordCount": 5000,
    "readingTime": "25分钟"
  }
}
```

#### **3. 搜索文件内容**
```
GET /api/v1/knowledge/search
```

**查询参数**:
```typescript
{
  query: string;      // 搜索关键词
  scope?: 'all' | 'filename' | 'content';  // 搜索范围
  caseSensitive?: boolean;  // 是否区分大小写
  regex?: boolean;    // 是否使用正则表达式
  limit?: number;     // 结果数量限制
}
```

**响应数据**:
```json
{
  "query": "监控系统",
  "totalResults": 3,
  "results": [
    {
      "file": "PF_AutoFramework_监控系统使用说明.md",
      "path": "PF_AutoFramework_监控系统使用说明.md",
      "lineNumber": 42,
      "lineContent": "## 监控系统配置\n监控系统使用PowerShell脚本实现...",
      "score": 0.95,
      "context": {
        "before": "## 系统架构\n...",
        "after": "## 配置步骤\n..."
      }
    }
  ]
}
```

### **C. 监控系统接口**

#### **1. 启动监控**
```
POST /api/v1/monitoring/start
```

**请求体**:
```json
{
  "mode": "manual" | "scheduled",  // 运行模式
  "interval": 300,  // 间隔秒数（仅scheduled模式）
  "notify": true,   // 是否发送通知
  "checks": ["file", "git", "system"]  // 检查项目
}
```

**响应数据**:
```json
{
  "monitoring": {
    "status": "running",
    "mode": "manual",
    "startedAt": "2026-04-07T16:32:00.000Z",
    "pid": 12345,
    "checks": ["file", "git", "system"]
  }
}
```

#### **2. 停止监控**
```
POST /api/v1/monitoring/stop
```

**请求体**: 无

**响应数据**:
```json
{
  "monitoring": {
    "status": "stopped",
    "stoppedAt": "2026-04-07T16:33:00.000Z",
    "duration": 60  // 运行时长（秒）
  }
}
```

#### **3. 获取监控日志**
```
GET /api/v1/monitoring/logs
```

**查询参数**:
```typescript
{
  level?: 'all' | 'info' | 'warning' | 'error';  // 日志级别
  startTime?: string;  // ISO时间格式
  endTime?: string;    // ISO时间格式
  limit?: number;      // 日志条数限制
  offset?: number;     // 偏移量
}
```

**响应数据**:
```json
{
  "logs": [
    {
      "id": "log_123456",
      "timestamp": "2026-04-07T16:00:00.000Z",
      "level": "info",
      "source": "file-monitor",
      "message": "检测到知识库文件更新",
      "data": {
        "file": "PF_AutoFramework_知识库.md",
        "action": "modified"
      }
    }
  ],
  "total": 100,
  "hasMore": true
}
```

#### **4. 实时监控订阅 (WebSocket)**
```
WebSocket连接: ws://localhost:8081/api/v1/monitoring/stream
```

**连接参数**:
```json
{
  "token": "auth_token_here",
  "topics": ["file-changes", "system-status", "git-updates"]
}
```

**推送消息格式**:
```json
{
  "type": "file-change",
  "timestamp": "2026-04-07T16:32:00.000Z",
  "data": {
    "file": "PF_AutoFramework_知识库.md",
    "action": "modified",
    "size": 24576,
    "modified": "2026-04-07T16:32:00.000Z"
  }
}
```

### **D. GitHub仓库接口**

#### **1. 检查仓库状态**
```
GET /api/v1/github/status
```

**查询参数**:
```typescript
{
  repo: string;  // 仓库地址，默认为 "yaoqiafan/PF.AutoFramework"
  branch?: string;  // 分支名称，默认为 "main"
}
```

**响应数据**:
```json
{
  "repository": {
    "name": "PF.AutoFramework",
    "owner": "yaoqiafan",
    "url": "https://github.com/yaoqiafan/PF.AutoFramework",
    "description": "企业级桌面应用框架",
    "stars": 150,
    "forks": 30,
    "watchers": 45
  },
  "branch": {
    "name": "main",
    "commit": {
      "sha": "abc123def456...",
      "message": "修复监控系统bug",
      "author": "yaoqiafan",
      "date": "2026-04-07T14:30:00.000Z"
    },
    "behind": 0,
    "ahead": 0
  },
  "lastChecked": "2026-04-07T16:00:00.000Z",
  "isUpToDate": true
}
```

#### **2. 检查更新**
```
POST /api/v1/github/check-updates
```

**请求体**: 无

**响应数据**:
```json
{
  "hasUpdates": false,
  "latestCommit": {
    "sha": "abc123def456...",
    "message": "修复监控系统bug",
    "author": "yaoqiafan",
    "date": "2026-04-07T14:30:00.000Z"
  },
  "changes": [],
  "lastChecked": "2026-04-07T16:32:00.000Z"
}
```

#### **3. 拉取更新**
```
POST /api/v1/github/pull
```

**请求体**:
```json
{
  "force": false,  // 是否强制拉取
  "clean": false   // 是否清理未提交的更改
}
```

**响应数据**:
```json
{
  "success": true,
  "operation": "pull",
  "changes": [
    {
      "file": "src/MonitoringService.cs",
      "action": "updated",
      "diff": "+ added new feature\n- removed old code"
    }
  ],
  "summary": {
    "added": 2,
    "modified": 5,
    "deleted": 1
  }
}
```

### **E. 配置管理接口**

#### **1. 获取配置**
```
GET /api/v1/config
```

**查询参数**:
```typescript
{
  key?: string;  // 配置键名，为空则返回所有配置
}
```

**响应数据**:
```json
{
  "monitoring": {
    "enabled": true,
    "schedule": {
      "daily": ["12:00", "18:00"],
      "timezone": "Asia/Shanghai"
    },
    "checks": ["file", "git", "system"]
  },
  "notifications": {
    "email": {
      "enabled": false,
      "smtp": "smtp.example.com",
      "port": 587
    },
    "webhook": {
      "enabled": true,
      "url": "http://localhost:8080/webhook"
    }
  },
  "knowledgeBase": {
    "path": "C:\\Users\\Administrator\\.openclaw\\workspace",
    "autoUpdate": true,
    "backup": {
      "enabled": true,
      "interval": "daily",
      "keep": 7
    }
  }
}
```

#### **2. 更新配置**
```
PUT /api/v1/config
```

**请求体**:
```json
{
  "monitoring": {
    "schedule": {
      "daily": ["09:00", "12:00", "15:00", "18:00"]
    }
  }
}
```

**响应数据**: 更新后的完整配置

#### **3. 重置配置**
```
DELETE /api/v1/config
```

**查询参数**:
```typescript
{
  section?: string;  // 配置章节，为空则重置所有配置
}
```

**响应数据**: 重置后的默认配置

### **F. 工具和实用接口**

#### **1. 导出数据**
```
GET /api/v1/export
```

**查询参数**:
```typescript
{
  type: 'logs' | 'config' | 'files' | 'all';  // 导出类型
  format: 'json' | 'csv' | 'txt' | 'html';  // 导出格式
  startTime?: string;  // 开始时间
  endTime?: string;    // 结束时间
}
```

**响应头**:
```
Content-Type: application/json
Content-Disposition: attachment; filename="export_20260407.json"
```

#### **2. 系统诊断**
```
GET /api/v1/diagnostics
```

**响应数据**:
```json
{
  "system": {
    "platform": "win32",
    "arch": "x64",
    "nodeVersion": "v18.15.0",
    "memory": {
      "total": 8589934592,
      "free": 3221225472,
      "used": 5368709120
    }
  },
  "services": {
    "fileWatcher": "running",
    "gitMonitor": "running",
    "webServer": "running",
    "database": "connected"
  },
  "issues": [
    {
      "level": "warning",
      "message": "监控日志文件过大",
      "suggestion": "清理或归档旧日志"
    }
  ]
}
```

#### **3. 健康检查**
```
GET /api/v1/health
```

**响应数据**:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-07T16:32:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 12
    },
    "filesystem": {
      "status": "healthy",
      "freeSpace": 107374182400
    },
    "network": {
      "status": "healthy",
      "github": true,
      "local": true
    }
  }
}
```

## 🔐 认证和授权

### **认证方式**
1. **API Token** (推荐)
   ```
   Authorization: Bearer {token}
   ```

2. **Basic Auth** (开发环境)
   ```
   Authorization: Basic {base64(username:password)}
   ```

### **权限控制**
```typescript
enum Permission {
  READ = 'read',      // 读取权限
  WRITE = 'write',    // 写入权限
  EXECUTE = 'execute', // 执行权限
  ADMIN = 'admin'     // 管理员权限
}

interface User {
  id: string;
  username: string;
  permissions: Permission[];
}
```

### **Token管理**
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET /api/v1/auth/profile
```

## 📡 WebSocket 实时通讯协议

### **连接建立**
```javascript
const ws = new WebSocket('ws://localhost:8081/api/v1/ws');

ws.onopen = () => {
  // 发送认证消息
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_token_here'
  }));
};
```

### **消息格式**
```json
{
  "type": "event_type",
  "id": "msg_123456",
  "timestamp": "2026-04-07T16:32:00.000Z",
  "data": {},
  "metadata": {}
}
```

### **事件类型**
| 事件类型 | 说明 | 数据格式 |
|----------|------|----------|
| `file.change` | 文件变更 | `{file, action, size, modified}` |
| `monitoring.start` | 监控启动 | `{mode, pid, checks}` |
| `monitoring.stop` | 监控停止 | `{duration, reason}` |
| `git.update` | Git更新 | `{commit, changes, summary}` |
| `system.alert` | 系统告警 | `{level, message, source}` |
| `log.entry` | 日志条目 | `{level, message, source, data}` |
| `status.update` | 状态更新 | `{component, status, metrics}` |

### **客户端命令**
```json
// 订阅主题
{
  "type": "subscribe",
  "topics": ["file.change", "monitoring.*"]
}

// 取消订阅
{
  "type": "unsubscribe",
  "topics": ["file.change"]
}

// 请求历史数据
{
  "type": "history",
  "topic": "file.change",
  "limit": 100
}
```

## 📝 前端调用示例

### **JavaScript 封装类**
```javascript
class PFKnowledgeAPI {
  constructor(baseURL = 'http://localhost:8080/api/v1', token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  // 设置认证头
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // 系统状态
  async getSystemStatus() {
    return this.request('/system/status');
  }

  async refreshSystemStatus() {
    return this.request('/system/refresh', { method: 'POST' });
  }

  // 文件操作
  async getFiles(path = '', options = {}) {
    const params = new URLSearchParams({
      path,
      ...options
    });
    return this.request(`/knowledge/files?${params}`);
  }

  async getFileContent(filePath, options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/knowledge/files/${encodeURIComponent(filePath)}/content?${params}`);
  }

  async searchFiles(query, options = {}) {
    const params = new URLSearchParams({ query, ...options });
    return this.request(`/knowledge/search?${params}`);
  }

  // 监控控制
  async startMonitoring(options = {}) {
    return this.request('/monitoring/start', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async stopMonitoring() {
    return this.request('/monitoring/stop', { method: 'POST' });
  }

  async getMonitoringLogs(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/monitoring/logs?${params}`);
  }

  // GitHub操作
  async getGitHubStatus(repo = 'yaoqiafan/PF.AutoFramework') {
    const params = new URLSearchParams({ repo });
    return this.request(`/github/status?${params}`);
  }

  async checkGitHubUpdates() {
    return this.request('/github/check-updates', { method: 'POST' });
  }

  async pullGitHubUpdates(options = {}) {
    return this.request('/github/pull', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  // 配置管理
  async getConfig(key = null) {
    const params = key ? new URLSearchParams({ key }) : '';
    return this.request(`/config?${params}`);
  }

  async updateConfig(config) {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  // 工具函数
  async exportData(type, format = 'json', options = {}) {
    const params = new URLSearchParams({ type, format, ...options });
    return this.request(`/export?${params}`);
  }

  async getDiagnostics() {
    return this.request('/diagnostics');
  }

  async healthCheck() {
    return this.request('/health');
  }
}

// 使用示例
const api = new PFKnowledgeAPI('http://localhost:8080/api/v1', 'your_token');

// 获取系统状态
api.getSystemStatus().then(data => {
  console.log('系统状态:', data);
}).catch(error => {
  console.error('获取状态失败:', error);
});
```

### **Vue.js 示例组件**
```vue
<template>
  <div class="knowledge-system">
    <!-- 系统状态 -->
    <div class="status-card">
      <h3>系统状态</h3>
      <div v-if="loading">加载中...</div>
      <div v-else>
        <p>知识库状态: {{ systemStatus.knowledgeBase.status }}</p>
        <p>文档数量: {{ systemStatus.knowledgeBase.documentCount }}</p>
        <button @click="refreshStatus">刷新状态</button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list">
      <h3>知识库文件</h3>
      <ul>
        <li v-for="file in files" :key="file.path">
          {{ file.name }} ({{ formatSize(file.size) }})
          <button @click="viewFile(file.path)">查看</button>
        </li>
      </ul>
    </div>

    <!-- 监控控制 -->
    <div class="monitor-control">
      <h3>监控控制</h3>
      <button @click="startMonitor" :disabled="monitoringStatus === 'running'">
        启动监控
      </button>
      <button @click="stopMonitor" :disabled="monitoringStatus !== 'running'">
        停止监控
      </button>
      <div class="logs">
        <div v-for="log in logs" :key="log.id" :class="`log-${log.level}`">
          [{{ formatTime(log.timestamp) }}] {{ log.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { PFKnowledgeAPI } from './pf-knowledge-api.js';

export default {
  name: 'KnowledgeSystem',
  data() {
    return {
      api: null,
      loading: false,
      systemStatus: {},
      files: [],
      logs: [],
      monitoringStatus: 'stopped',
      wsConnection: null
    };
  },
  mounted() {
    this.api = new PFKnowledgeAPI('http://localhost:8080/api/v1');
    this.loadData();
    this.setupWebSocket();
  },
  methods: {
    async loadData() {
      this.loading = true;
      try {
        // 并行加载数据
        const [status, files, logs] = await Promise.all([
          this.api.getSystemStatus(),
          this.api.getFiles(),
          this.api.getMonitoringLogs({ limit: 10 })
        ]);
        
        this.systemStatus = status;
        this.files = files.files;
        this.logs = logs.logs;
        this.monitoringStatus = status.monitoring.status;
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async refreshStatus() {
      try {
        const status = await this.api.refreshSystemStatus();
        this.systemStatus = status;
        this.monitoringStatus = status.monitoring.status;
      } catch (error) {
        console.error('刷新状态失败:', error);
      }
    },
    
    async viewFile(filePath) {
      try {
        const content = await this.api.getFileContent(filePath);
        // 显示文件内容
        this.$emit('view-file', content);
      } catch (error) {
        console.error('打开文件失败:', error);
      }
    },
    
    async startMonitor() {
      try {
        const result = await this.api.startMonitoring({
          mode: 'manual',
          checks: ['file', 'git', 'system']
        });
        this.monitoringStatus = result.monitoring.status;
      } catch (error) {
        console.error('启动监控失败:', error);
      }
    },
    
    async stopMonitor() {
      try {
        const result = await this.api.stopMonitoring();
        this.monitoringStatus = result.monitoring.status;
      } catch (error) {
        console.error('停止监控失败:', error);
      }
    },
    
    setupWebSocket() {
      this.wsConnection = new WebSocket('ws://localhost:8081/api/v1/ws');
      
      this.wsConnection.onopen = () => {
        // 订阅监控事件
        this.wsConnection.send(JSON.stringify({
          type: 'subscribe',
          topics: ['file.change', 'monitoring.*', 'log.entry']
        }));
      };
      
      this.wsConnection.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('WebSocket错误:', error);
      };
    },
    
    handleWebSocketMessage(message) {
      switch (message.type) {
        case 'file.change':
          this.handleFileChange(message.data);
          break;
        case 'monitoring.start':
        case 'monitoring.stop':
          this.monitoringStatus = message.data.status;
          break;
        case 'log.entry':
          this.logs.unshift(message.data);
          if (this.logs.length > 100) this.logs.pop();
          break;
        case 'system.alert':
          this.showAlert(message.data);
          break;
      }
    },
    
    handleFileChange(data) {
      // 更新文件列表
      const fileIndex = this.files.findIndex(f => f.path === data.file);
      if (fileIndex !== -1) {
        this.files[fileIndex].size = data.size;
        this.files[fileIndex].modified = data.modified;
      }
      
      // 添加日志
      this.logs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `文件变更: ${data.file} (${data.action})`,
        source: 'file-monitor'
      });
    },
    
    showAlert(alert) {
      // 显示系统告警
      console.warn(`系统告警 [${alert.level}]: ${alert.message}`);
      // 可以在这里添加UI通知
    },
    
    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },
    
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('zh-CN');
    }
  },
  beforeDestroy() {
    if (this.wsConnection) {
      this.wsConnection.close();
    }
  }
};
</script>

<style scoped>
.knowledge-system {
  padding: 20px;
}

.status-card, .file-list, .monitor-control {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.log-info {
  color: #007bff;
}

.log-warning {
  color: #ffc107;
}

.log-error {
  color: #dc3545;
}
</style>
```

### **React 示例组件**
```jsx
import React, { useState, useEffect } from 'react';
import { PFKnowledgeAPI } from './pf-knowledge-api';

const KnowledgeSystem = () => {
  const [api] = useState(new PFKnowledgeAPI('http://localhost:8080/api/v1'));
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState({});
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [monitoringStatus, setMonitoringStatus] = useState('stopped');
  const [wsConnection, setWsConnection] = useState(null);

  useEffect(() => {
    loadData();
    setupWebSocket();
    
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [status, filesData, logsData] = await Promise.all([
        api.getSystemStatus(),
        api.getFiles(),
        api.getMonitoringLogs({ limit: 10 })
      ]);
      
      setSystemStatus(status);
      setFiles(filesData.files);
      setLogs(logsData.logs);
      setMonitoringStatus(status.monitoring.status);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const status = await api.refreshSystemStatus();
      setSystemStatus(status);
      setMonitoringStatus(status.monitoring.status);
    } catch (error) {
      console.error('刷新状态失败:', error);
    }
  };

  const startMonitor = async () => {
    try {
      const result = await api.startMonitoring({
        mode: 'manual',
        checks: ['file', 'git', 'system']
      });
      setMonitoringStatus(result.monitoring.status);
    } catch (error) {
      console.error('启动监控失败