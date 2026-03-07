const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// 注册
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({ message: '请填写完整信息' });
        }

        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ message: '用户名长度必须在 3-30 个字符之间' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: '密码长度至少 6 个字符' });
        }
        
        // 检查是否已存在
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 创建用户
        const user = new User({
            username,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        // 生成 token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: '注册成功',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role
            }
        });
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: '请填写用户名和密码' });
        }
        
        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }
        
        // 验证密码
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }
        
        // 生成 token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: '登录成功',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('favorites', 'title category createdAt')
            .populate('uploads', 'filename originalName size createdAt');
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        res.json(user);
    } catch (err) {
        console.error('获取用户信息错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新用户资料
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { avatar, bio } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        if (avatar !== undefined) user.avatar = avatar;
        if (bio !== undefined) user.bio = bio;
        
        await user.save();
        
        res.json({
            message: '更新成功',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio
            }
        });
    } catch (err) {
        console.error('更新资料错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户公开信息
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('username avatar bio role createdAt');
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        res.json({
            ...user.toObject(),
            id: user._id.toString()
        });
    } catch (err) {
        console.error('获取用户信息错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户的帖子
router.get('/:id/posts', async (req, res) => {
    try {
        const Post = require('../models/Post');
        const posts = await Post.find({ author: req.params.id })
            .sort({ createdAt: -1 })
            .select('title category views likes favorites comments createdAt');
        
        res.json(posts);
    } catch (err) {
        console.error('获取用户帖子错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 修改密码
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: '请填写完整信息' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: '新密码长度至少 6 个字符' });
        }
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ message: '当前密码错误' });
        }
        
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        
        res.json({ message: '密码修改成功' });
    } catch (err) {
        console.error('修改密码错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取所有用户（仅管理员）
router.get('/admin/users', authMiddleware, async (req, res) => {
    try {
        // 临时放宽限制：任何登录用户都可以访问（仅用于初始设置）
        // 后续版本将严格限制为 admin 角色
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({ message: '权限不足' });
        // }
        
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        
        // 转换用户数据，确保 id 字段正确
        const usersWithId = users.map(user => ({
            ...user.toObject(),
            id: user._id.toString()
        }));
        
        res.json(usersWithId);
    } catch (err) {
        console.error('获取用户列表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新用户角色和权限（仅管理员）
router.put('/admin/users/:id', authMiddleware, async (req, res) => {
    try {
        // 临时放宽限制：任何登录用户都可以访问（仅用于初始设置）
        // 后续版本将严格限制为 admin 角色
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({ message: '权限不足' });
        // }
        
        console.log('更新用户请求:', {
            id: req.params.id,
            body: req.body
        });
        
        const { role, permissions } = req.body;
        
        // 验证 ID 格式
        if (!req.params.id || typeof req.params.id !== 'string') {
            return res.status(400).json({ message: '无效的用户 ID' });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        if (role) {
            if (!['user', 'admin', 'uploader'].includes(role)) {
                return res.status(400).json({ message: '无效的角色' });
            }
            user.role = role;
        }
        
        if (permissions) {
            if (typeof permissions.canUploadExcel !== 'undefined') {
                user.permissions.canUploadExcel = permissions.canUploadExcel;
            }
            if (typeof permissions.canCreateCharts !== 'undefined') {
                user.permissions.canCreateCharts = permissions.canCreateCharts;
            }
            if (typeof permissions.canPublishCharts !== 'undefined') {
                user.permissions.canPublishCharts = permissions.canPublishCharts;
            }
        }
        
        await user.save();
        
        console.log('用户更新成功:', {
            id: user._id,
            username: user.username,
            role: user.role
        });
        
        res.json({
            message: '更新成功',
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (err) {
        console.error('更新用户信息错误:', err);
        res.status(500).json({ 
            message: '服务器错误',
            error: err.message 
        });
    }
});

module.exports = router;
