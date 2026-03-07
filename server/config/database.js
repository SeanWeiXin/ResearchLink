const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/researchlink';

async function connectDB() {
    try {
        // 设置连接超时
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 秒超时
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB 连接成功');
        console.log(`📦 数据库：${mongoose.connection.db.databaseName}`);
        return mongoose.connection;
    } catch (err) {
        console.error('❌ MongoDB 连接失败:', err.message);
        console.error('');
        console.error('💡 提示：请确保 MongoDB 服务正在运行');
        console.error('   Windows 用户可以使用命令检查：net start MongoDB');
        console.error('   或者修改 .env 文件中的 MONGODB_URI 配置');
        console.error('');
        throw err;
    }
}

module.exports = { connectDB, mongoose };
