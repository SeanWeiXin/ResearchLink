const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 验证 JWT token 中间件
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: '未授权访问' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'token 无效或已过期' });
    }
};

// 权限验证中间件
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: '请先登录' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: '权限不足' });
        }

        next();
    };
};

module.exports = { authMiddleware, roleMiddleware, JWT_SECRET };
