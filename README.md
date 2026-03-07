# ResearchLink - 交互式论坛与数据分析平台

一个集成了论坛功能和 Excel 数据处理分析的交互式网页应用。

## 功能特性

### 第一阶段：基础论坛功能 ✅

- ✅ 用户注册/登录
- ✅ 发帖/回帖功能
- ✅ 收藏/点赞功能
- ✅ 用户个人页面
- ✅ 帖子分类和标签
- ✅ 搜索和筛选

### 第二阶段：Excel 数据处理 🚧

- ✅ Excel 文件上传
- ✅ 数据格式智能识别
- ✅ 时间序列数据检测
- 🚧 图表生成和配置
- 🚧 图表展示和分享
- 🚧 权限管理系统

## 技术栈

### 后端
- Node.js + Express
- MongoDB + Mongoose
- JWT 认证
- Multer 文件上传
- XLSX 数据处理

### 前端
- React + TypeScript
- Vite 构建工具
- Ant Design UI 组件库
- React Router 路由
- Zustand 状态管理
- Axios HTTP 客户端

## 快速开始

### 环境要求
- Node.js >= 16
- MongoDB >= 4.4
- npm 或 yarn

### 安装步骤

#### 1. 安装后端依赖

```bash
cd server
npm install
```

#### 2. 配置环境变量

编辑 `server/.env` 文件：

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/researchlink
JWT_SECRET=your-secret-key-change-in-production
```

#### 3. 启动后端服务器

```bash
cd server
npm run dev
```

服务器将在 http://localhost:5000 启动

#### 4. 安装前端依赖

```bash
cd client
npm install
```

#### 5. 配置前端环境变量

编辑 `client/.env` 文件：

```env
VITE_API_URL=http://localhost:5000/api
```

#### 6. 启动前端开发服务器

```bash
cd client
npm run dev
```

前端将在 http://localhost:5173 启动

## API 文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新用户资料

### 帖子接口

- `GET /api/posts` - 获取帖子列表
- `GET /api/posts/:id` - 获取单个帖子
- `POST /api/posts` - 创建新帖子
- `PUT /api/posts/:id` - 更新帖子
- `DELETE /api/posts/:id` - 删除帖子
- `POST /api/posts/:id/comments` - 添加评论
- `POST /api/posts/:id/like` - 点赞
- `POST /api/posts/:id/favorite` - 收藏

### 上传接口

- `POST /api/uploads/excel` - 上传 Excel 文件
- `GET /api/uploads/my-uploads` - 获取我的上传列表
- `GET /api/uploads/:id` - 获取上传详情
- `DELETE /api/uploads/:id` - 删除上传

### 图表接口

- `POST /api/charts` - 创建图表
- `GET /api/charts` - 获取图表列表
- `GET /api/charts/:id` - 获取图表详情
- `PUT /api/charts/:id` - 更新图表
- `DELETE /api/charts/:id` - 删除图表

## 项目结构

```
ResearchLink/
├── server/                 # 后端代码
│   ├── config/            # 配置文件
│   ├── middleware/        # 中间件
│   ├── models/            # 数据模型
│   ├── routes/            # 路由
│   ├── services/          # 业务逻辑
│   ├── uploads/           # 上传文件存储
│   └── server.js          # 入口文件
├── client/                # 前端代码
│   ├── src/
│   │   ├── api/          # API 客户端
│   │   ├── components/   # 组件
│   │   ├── pages/        # 页面
│   │   ├── store/        # 状态管理
│   │   ├── utils/        # 工具函数
│   │   └── App.tsx       # 应用入口
│   └── package.json
└── README.md
```

## 开发说明

### 权限系统

系统支持三种用户角色：
- `user` - 普通用户（默认）
- `uploader` - 可上传 Excel 文件的用户
- `admin` - 管理员

权限控制：
- 普通用户：发帖、评论、收藏
- uploader：上传 Excel、创建图表
- admin：所有权限

### 数据格式支持

支持的 Excel 数据格式：
- 时间序列数据（日期 + 数值）
- 横截面数据
- 面板数据

支持的文件类型：
- .xlsx (Excel 2007+)
- .xls (Excel 97-2003)
- .csv

### 图表类型

系统支持以下图表类型：
- 折线图（时间序列）
- 柱状图
- 面积图
- 散点图
- 饼图

## 下一步开发计划

1. ✅ 基础论坛功能完成
2. ✅ Excel 上传和解析
3. 🚧 图表生成和配置界面
4. 🚧 权限管理完善
5. 🚧 AI 智能识别优化
6. 🚧 实时通知系统
7. 🚧 移动端适配

## 常见问题

### Q: 如何给用户授予 uploader 权限？

A: 直接在数据库中修改用户记录：

```javascript
db.users.updateOne(
  { username: "your_username" },
  { $set: { 
    "permissions.canUploadExcel": true,
    "permissions.canCreateCharts": true,
    "permissions.canPublishCharts": true
  }}
)
```

### Q: 上传的 Excel 文件存储在哪里？

A: 默认存储在 `server/uploads/` 目录下。

### Q: 如何修改数据库连接？

A: 编辑 `server/.env` 文件中的 `MONGODB_URI` 配置。

## 许可证

ISC

## 贡献

欢迎提交 Issue 和 Pull Request！
