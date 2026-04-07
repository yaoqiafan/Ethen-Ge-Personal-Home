# PF.AutoFramework 知识库系统 API 接口文档（续）

## 🛠️ 错误处理规范

### **HTTP 状态码**
| 状态码 | 说明 | 典型场景 |
|--------|------|----------|
| 200 | 成功 | 请求成功完成 |
| 201 | 创建成功 | 资源创建成功 |
| 400 | 请求错误 | 参数验证失败 |
| 401 | 未授权 | 缺少或无效的认证 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 409 | 冲突 | 资源状态冲突 |
| 422 | 无法处理 | 业务逻辑错误 |
| 429 | 请求过多 | 频率限制 |
| 500 | 服务器错误 | 内部服务器错误 |
| 503 | 服务不可用 | 服务维护中 |

### **错误码定义**
```typescript
enum ErrorCode {
  // 通用错误 (1000-1999)
  VALIDATION_ERROR = 1001,
  AUTHENTICATION_FAILED = 1002,
  PERMISSION_DENIED = 1003,
  RESOURCE_NOT_FOUND = 1004,
  RESOURCE_CONFLICT = 1005,
  RATE_LIMIT_EXCEEDED = 1006,
  
  // 文件系统错误 (2000-2999)
  FILE_NOT_FOUND = 2001,
  FILE_ACCESS_DENIED = 2002,
  FILE_TOO_LARGE = 2003,
  INVALID_FILE_FORMAT = 2004,
  DISK_SPACE_INSUFFICIENT = 2005,
  
  // 监控系统错误 (3000-3999)
  MONITOR_ALREADY_RUNNING = 3001,
  MONITOR_NOT_RUNNING = 3002,
  MONITOR_CONFIG_INVALID = 3003,
  GIT_OPERATION_FAILED = 3004,
  
  // 配置错误 (4000-4999)
  CONFIG_INVALID = 4001,
  CONFIG_READ_ONLY = 4002,
  
  // 系统错误 (5000-5999)
  INTERNAL_ERROR = 5001,
  SERVICE_UNAVAILABLE = 5002,
  DATABASE_ERROR = 5003,
  NETWORK_ERROR = 5004
}
```

### **错误处理示例**
```javascript
// 前端错误处理
async function handleApiCall() {
  try {
    const response = await api.someMethod();
    return response.data;
  } catch (error) {
    if (error.response) {
      // HTTP 错误
      switch (error.response.status) {
        case 401:
          // 重新登录
          redirectToLogin();
          break;
        case 403:
          // 显示权限不足
          showPermissionError();
          break;
        case 404:
          // 资源不存在
          showNotFoundError();
          break;
        case 429:
          // 请求过多
          showRateLimitError(error.response.data.retryAfter);
          break;
        default:
          // 其他错误
          showGenericError(error.response.data.message);
      }
    } else if (error.request) {
      // 网络错误
      showNetworkError();
    } else {
      // 代码错误
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
}
```

## 🔒 安全性规范

### **1. 输入验证**
```javascript
// 服务端验证示例
const Joi = require('joi');

const fileSchema = Joi.object({
  path: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9_\-./]+$/)
    .max(255),
  encoding: Joi.string()
    .valid('utf8', 'base64')
    .default('utf8'),
  lineStart: Joi.number()
    .integer()
    .min(1)
    .optional(),
  lineEnd: Joi.number()
    .integer()
    .min(Joi.ref('lineStart'))
    .optional()
});
```

### **2. 输出过滤**
```javascript
// 敏感信息过滤
function sanitizeFileInfo(file) {
  return {
    name: file.name,
    path: file.path,
    size: file.size,
    modified: file.modified,
    // 不返回完整路径、权限等敏感信息
  };
}
```

### **3. CORS 配置**
```javascript
// Express.js CORS 配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24小时
}));
```

### **4. 速率限制**
```javascript
// Express-rate-limit 配置
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: {
    success: false,
    code: 429,
    message: '请求过于频繁，请稍后再试',
    retryAfter: 900 // 15分钟
  }
});

app.use('/api/', apiLimiter);
```

## 📈 性能优化

### **1. 缓存策略**
```javascript
// Redis 缓存示例
const redis = require('redis');
const client = redis.createClient();

async function getSystemStatusWithCache() {
  const cacheKey = 'system:status';
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const status = await calculateSystemStatus();
  
  // 缓存5分钟
  await client.setex(cacheKey, 300, JSON.stringify(status));
  
  return status;
}
```

### **2. 分页和懒加载**
```javascript
// 分页查询
async function getFilesPaginated(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  return {
    items: await db.query('SELECT * FROM files LIMIT ? OFFSET ?', [pageSize, offset]),
    pagination: {
      page,
      pageSize,
      total: await db.query('SELECT COUNT(*) as count FROM files'),
      totalPages: Math.ceil(total / pageSize)
    }
  };
}
```

### **3. 压缩和优化**
```javascript
// 启用Gzip压缩
const compression = require('compression');
app.use(compression({
  level: 6,
  threshold: 1024 // 大于1KB才压缩
}));
```

## 🧪 测试规范

### **单元测试示例**
```javascript
// 使用Jest进行测试
const { PFKnowledgeAPI } = require('./pf-knowledge-api');
const axios = require('axios');

jest.mock('axios');

describe('PFKnowledgeAPI', () => {
  let api;
  
  beforeEach(() => {
    api = new PFKnowledgeAPI('http://localhost:8080/api/v1');
  });
  
  test('获取系统状态成功', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          system: { status: 'running' },
          knowledgeBase: { status: 'healthy' }
        }
      }
    };
    
    axios.get.mockResolvedValue(mockResponse);
    
    const result = await api.getSystemStatus();
    
    expect(result.system.status).toBe('running');
    expect(result.knowledgeBase.status).toBe('healthy');
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/system/status',
      expect.any(Object)
    );
  });
  
  test('文件不存在时抛出错误', async () => {
    const mockError = {
      response: {
        status: 404,
        data: { message: '文件不存在' }
      }
    };
    
    axios.get.mockRejectedValue(mockError);
    
    await expect(api.getFileContent('nonexistent.md'))
      .rejects
      .toThrow('文件不存在');
  });
});
```

### **集成测试示例**
```javascript
// 使用Supertest进行API测试
const request = require('supertest');
const app = require('../app');

describe('知识库API集成测试', () => {
  let authToken;
  
  beforeAll(async () => {
    // 获取认证token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test', password: 'test123' });
    
    authToken = response.body.data.token;
  });
  
  test('GET /api/v1/system/status 返回系统状态', async () => {
    const response = await request(app)
      .get('/api/v1/system/status')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.system).toHaveProperty('status');
    expect(response.body.data.knowledgeBase).toHaveProperty('documentCount');
  });
  
  test('POST /api/v1/monitoring/start 启动监控', async () => {
    const response = await request(app)
      .post('/api/v1/monitoring/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mode: 'manual' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.monitoring.status).toBe('running');
  });
});
```

## 📋 部署配置

### **环境变量配置**
```bash
# .env 文件
NODE_ENV=production
PORT=8080
WS_PORT=8081
DATABASE_URL=postgresql://user:password@localhost:5432/pf_knowledge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
GITHUB_TOKEN=your_github_token_here
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### **Docker 配置**
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080

# 暴露端口
EXPOSE 8080 8081

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/pf_knowledge
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=pf_knowledge
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## 📚 文档生成

### **OpenAPI/Swagger 配置**
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: PF.AutoFramework 知识库系统 API
  version: 1.0.0
  description: 知识库检测和管理系统API文档

servers:
  - url: http://localhost:8080/api/v1
    description: 开发服务器

paths:
  /system/status:
    get:
      summary: 获取系统状态
      description: 返回系统当前状态信息
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SystemStatus'
        '401':
          description: 未授权
        '500':
          description: 服务器错误

components:
  schemas:
    SystemStatus:
      type: object
      properties:
        system:
          $ref: '#/components/schemas/SystemInfo'
        knowledgeBase:
          $ref: '#/components/schemas/KnowledgeBaseInfo'
        monitoring:
          $ref: '#/components/schemas/MonitoringInfo'
```

## 🚀 快速开始指南

### **1. 安装依赖**
```bash
# 克隆项目
git clone https://github.com/your-org/pf-knowledge-system.git
cd pf-knowledge-system

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### **2. 配置环境**
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
nano .env
```

### **3. 启动服务**
```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd ../frontend
npm run serve
```

### **4. 访问系统**
- 前端界面: http://localhost:3000
- API文档: http://localhost:8080/api-docs
- 健康检查: http://localhost:8080/api/v1/health

## 📞 技术支持

### **问题排查**
1. **检查日志**: `tail -f logs/app.log`
2. **验证配置**: `node scripts/validate-config.js`
3. **测试连接**: `node scripts/test-connections.js`

### **监控指标**
- API响应时间: `api_response_time_seconds`
- 请求成功率: `api_request_success_rate`
- 系统负载: `system_load_average`
- 内存使用: `process_resident_memory_bytes`

### **联系支持**
- 问题反馈: issues@example.com
- 紧急支持: support@example.com
- 文档: https://docs.pf-knowledge.example.com

---

## 🎯 总结

本文档提供了 PF.AutoFramework 知识库系统的完整 API 接口规范，包括：

1. **完整的接口定义** - 覆盖所有系统功能
2. **详细的数据格式** - 请求和响应规范
3. **前端集成示例** - Vue.js 和 React 示例
4. **安全性规范** - 认证、授权和输入验证
5. **性能优化** - 缓存、分页和压缩
6. **测试规范** - 单元测试和集成测试
7. **部署配置** - Docker 和环境变量
8. **问题排查** - 监控和日志

按照本文档规范开发，可以确保前后端高效、安全地交互，构建稳定可靠的知识库管理系统。