# ResearchLink 使用指南

## 快速开始

### 方法一：使用启动脚本（推荐）

Windows 用户可以直接运行启动脚本：

```powershell
.\start.ps1
```

脚本会自动：
1. 检查 Node.js 安装
2. 启动后端服务器（http://localhost:5000）
3. 启动前端应用（http://localhost:5173）

### 方法二：手动启动

#### 1. 启动后端

```bash
cd server
npm install    # 首次运行需要安装依赖
npm run dev    # 启动开发服务器
```

#### 2. 启动前端（新终端）

```bash
cd client
npm install    # 首次运行需要安装依赖
npm run dev    # 启动开发服务器
```

## 功能使用

### 1. 用户注册和登录

1. 访问 http://localhost:5173
2. 点击"登录/注册"按钮
3. 选择"注册"创建新账户
4. 填写用户名、邮箱和密码
5. 注册成功后自动登录

### 2. 发布帖子

1. 登录后点击导航栏的"发帖"按钮
2. 填写帖子标题和内容
3. 选择分类（博客/分享/提问/资源）
4. 添加标签（可选）
5. 点击"发布"

### 3. 浏览和互动

#### 浏览帖子
- 首页显示所有帖子
- 使用分类筛选查看特定类型
- 使用搜索框搜索关键词

#### 查看详情
- 点击帖子卡片查看详情
- 可以点赞、收藏
- 可以发表评论

#### 评论
1. 在帖子详情页底部输入评论
2. 点击"发表评论"
3. 支持回复他人评论

### 4. 个人中心

访问个人中心（/profile）可以：
- 查看自己的帖子
- 查看收藏的帖子
- 编辑个人资料（头像、简介）
- 修改密码

### 5. Excel 数据处理（需要权限）

#### 上传 Excel 文件

```bash
# 使用 API 测试工具（如 Postman）
POST http://localhost:5000/api/uploads/excel
Headers:
  Authorization: Bearer <your_token>
  Content-Type: multipart/form-data

Body:
  file: <选择 Excel 文件>
```

#### 查看上传历史

```bash
GET http://localhost:5000/api/uploads/my-uploads
Headers:
  Authorization: Bearer <your_token>
```

#### 获取文件分析结果

```bash
GET http://localhost:5000/api/uploads/:id
Headers:
  Authorization: Bearer <your_token>
```

返回结果包含：
- 文件元数据
- 列信息分析
- AI 分析结果
- 图表配置建议

## 权限管理

### 获取上传权限

默认情况下，新用户没有上传 Excel 的权限。需要管理员在数据库中授予：

```javascript
// 在 MongoDB 中执行
db.users.updateOne(
  { username: "your_username" },
  { 
    $set: { 
      "permissions.canUploadExcel": true,
      "permissions.canCreateCharts": true,
      "permissions.canPublishCharts": true
    }
  }
)
```

### 检查权限

在个人中心可以看到自己的权限信息。

## API 测试

### 使用 curl 测试

#### 注册
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456"}'
```

#### 登录
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

#### 获取帖子列表
```bash
curl http://localhost:5000/api/posts
```

#### 创建帖子（需要登录）
```bash
curl -X POST http://localhost:5000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"title":"测试帖子","content":"这是内容","category":"user"}'
```

### 使用 Postman

1. 导入 API 集合（可选）
2. 设置环境变量：
   - `api_url`: http://localhost:5000/api
   - `token`: 登录后获取的 JWT token
3. 发送请求测试

## 数据格式示例

### 时间序列数据示例

创建一个 Excel 文件，包含以下列：

| date       | value1 | value2 |
|------------|--------|--------|
| 2024-01-01 | 100    | 50     |
| 2024-01-02 | 105    | 52     |
| 2024-01-03 | 103    | 51     |
| ...        | ...    | ...    |

系统会自动识别：
- date 列为时间列
- value1 和 value2 为数值列
- 数据频率为 daily
- 推荐图表类型为折线图

### 支持的日期格式

- `2024-01-01` (YYYY-MM-DD)
- `2024/01/01` (YYYY/MM/DD)
- `01-01-2024` (DD-MM-YYYY)
- `01/01/2024` (DD/MM/YYYY)
- `2024-01-01T10:00:00` (ISO 8601)

## 常见问题

### Q1: 前端无法连接后端？

**A:** 检查以下几点：
1. 后端是否正常启动（http://localhost:5000）
2. 前端 `.env` 文件中的 `VITE_API_URL` 是否正确
3. 浏览器控制台是否有 CORS 错误

### Q2: 登录状态丢失？

**A:** 可能的原因：
1. Token 过期（默认 7 天）
2. 清除了浏览器缓存
3. 后端 JWT_SECRET 被修改

解决方法：重新登录即可。

### Q3: 上传 Excel 失败？

**A:** 检查：
1. 是否已登录
2. 是否有上传权限
3. 文件格式是否为 .xlsx/.xls/.csv
4. 文件大小是否超过 50MB

### Q4: 数据库连接失败？

**A:** 确保 MongoDB 正在运行：
```bash
# Windows 检查服务
net start MongoDB

# 或使用 MongoDB Compass 检查连接
```

### Q5: 如何重置数据库？

**A:** 删除并重新创建：
```bash
# 使用 MongoDB Shell
use researchlink
db.dropDatabase()
```

## 开发技巧

### 1. 热重载

后端使用 nodemon，前端使用 Vite，都支持热重载。
修改代码后会自动刷新。

### 2. 调试

#### 后端调试
在 VS Code 中安装 CodeLLDB 扩展，或使用 console.log。

#### 前端调试
使用浏览器开发者工具（F12）。

### 3. 查看日志

#### 后端日志
在终端查看，或在 `server/.env` 中配置日志级别。

#### 前端日志
在浏览器控制台查看。

## 性能优化建议

1. **数据库索引**
   - 已为常用查询字段添加索引
   - 可根据实际需求添加更多索引

2. **前端优化**
   - 使用 React.memo 优化组件渲染
   - 实现虚拟滚动处理大数据列表
   - 使用懒加载

3. **缓存策略**
   - 使用 Redis 缓存热点数据
   - 实现 HTTP 缓存头

## 安全建议

1. **生产环境配置**
   - 修改 JWT_SECRET 为强随机字符串
   - 启用 HTTPS
   - 配置 CORS 白名单

2. **密码安全**
   - 使用 bcryptjs 加密
   - 要求密码最小长度

3. **文件上传安全**
   - 验证文件类型
   - 限制文件大小
   - 扫描恶意软件

## 下一步

参考 PROJECT_SUMMARY.md 了解已完成功能和待开发功能。

祝使用愉快！
