# OpenClaw适配器

## 概述
这是一个连接Vue前端和OpenClaw网关的适配器服务。它模拟了PF.AutoFramework的API接口，让前端可以正常显示数据，同时通过WebSocket与OpenClaw实时通信。

## 架构
```
Vue前端 → 适配器HTTP API (3001端口) → 模拟数据响应
Vue前端 → 适配器WebSocket (3002端口) → OpenClaw网关WebSocket (18789端口)
```

## 安装和启动

### 1. 安装适配器
```bash
cd openclaw-adapter
# 运行安装脚本（Windows）
install.bat
# 或手动安装
npm install
```

### 2. 启动适配器
```bash
# 方法1：使用启动脚本
start.bat

# 方法2：直接运行
node server.js

# 方法3：开发模式（需要nodemon）
npm run dev
```

### 3. 启动Vue前端
```bash
cd ..
npm run dev
```

## 访问地址
- **适配器健康检查**: http://localhost:3001/health
- **Vue前端**: http://localhost:5173
- **适配器WebSocket**: ws://localhost:3002

## API接口

适配器实现了以下PF.AutoFramework API接口：

### 系统状态
- `GET /api/v1/system/status` - 获取系统状态
- `GET /api/v1/system/refresh` - 刷新系统状态（POST）
- `GET /api/v1/health` - 健康检查
- `GET /api/v1/diagnostics` - 系统诊断

### 知识库文件
- `GET /api/v1/knowledge/files` - 获取文件列表
- `GET /api/v1/knowledge/files/{path}/content` - 获取文件内容
- `GET /api/v1/knowledge/search` - 全文搜索

### 监控日志
- `GET /api/v1/monitoring/logs` - 获取监控日志
- `POST /api/v1/monitoring/start` - 启动监控
- `POST /api/v1/monitoring/stop` - 停止监控

### GitHub集成
- `GET /api/v1/github/status` - GitHub状态
- `POST /api/v1/github/check-updates` - 检查更新
- `POST /api/v1/github/pull` - 拉取代码

## 配置说明

### 环境变量
- `VITE_PF_API_URL=http://localhost:3001/api/v1` - API地址
- `VITE_PF_WS_URL=ws://localhost:3002` - WebSocket地址

### OpenClaw网关配置
适配器会自动连接到OpenClaw网关：
- HTTP: http://localhost:18789
- WebSocket: ws://localhost:18789/ws
- Token: 从openclaw.json自动读取

## 故障排除

### 1. 端口冲突
如果3001或3002端口被占用，修改`server.js`中的端口号：
```javascript
const PORT = 3001; // 修改为其他端口
const WS_PORT = 3002; // 修改为其他端口
```

### 2. OpenClaw网关未运行
确保OpenClaw网关正在运行：
```bash
openclaw gateway status
openclaw gateway start
```

### 3. 前端无法连接
检查：
1. 适配器是否运行（http://localhost:3001/health）
2. 环境变量是否正确（.env.development）
3. Vite代理配置是否正确（vite.config.ts）

### 4. WebSocket连接失败
检查：
1. OpenClaw WebSocket是否可用（ws://localhost:18789/ws）
2. 防火墙是否阻止了WebSocket连接

## 开发说明

### 添加新的API接口
在`server.js`中添加新的路由：
```javascript
app.get('/api/v1/new-endpoint', async (req, res) => {
  // 实现逻辑
});
```

### 修改模拟数据
修改对应的响应数据生成逻辑。

### 连接到真实后端
如果要连接到真实的PF.AutoFramework后端，修改`server.js`中的API调用逻辑，将模拟数据替换为真实API调用。

## 许可证
MIT