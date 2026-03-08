require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/database');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const uploadsRouter = require('./routes/uploads');
const chartsRouter = require('./routes/charts');
const dataRouter = require('./routes/data');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/charts', chartsRouter);
app.use('/api/data', dataRouter);

// 主路由
app.get('/', (req, res) => {
    res.json({ 
        message: 'ResearchLink API 运行中',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            posts: '/api/posts',
            uploads: '/api/uploads',
            charts: '/api/charts'
        }
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('错误:', err);
    res.status(err.status || 500).json({
        message: err.message || '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 启动服务器
async function startServer() {
    try {
        // 连接数据库
        await connectDB();
        
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
            console.log(`📊 环境：${process.env.NODE_ENV || 'development'}`);
        });
        
    } catch (err) {
        console.error('❌ 启动失败:', err);
        process.exit(1);
    }
}

startServer();
