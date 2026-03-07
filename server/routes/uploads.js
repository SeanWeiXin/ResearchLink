const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const Upload = require('../models/Upload');
const User = require('../models/User');

// 配置文件存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型，请上传 Excel 或 CSV 文件'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

// 上传 Excel 文件
router.post('/excel', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '请选择要上传的文件' });
        }

        // 检查用户权限
        const user = await User.findById(req.user.userId);
        if (!user || !user.permissions?.canUploadExcel) {
            return res.status(403).json({ message: '您没有上传 Excel 文件的权限' });
        }

        // 创建上传记录
        const upload = new Upload({
            user: req.user.userId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimeType: req.file.mimetype,
            status: 'uploaded'
        });

        await upload.save();

        // 更新用户的上传列表
        user.uploads.push(upload._id);
        await user.save();

        res.status(201).json({
            message: '上传成功',
            upload: {
                id: upload._id,
                filename: upload.originalName,
                size: upload.size,
                status: upload.status,
                createdAt: upload.createdAt
            }
        });
    } catch (err) {
        console.error('上传文件错误:', err);
        res.status(500).json({ message: '上传失败：' + err.message });
    }
});

// 获取用户的上传列表
router.get('/my-uploads', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;

        let query = { user: req.user.userId };
        if (status) {
            query.status = status;
        }

        const uploads = await Upload.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .populate('charts', 'title chartType');

        const total = await Upload.countDocuments(query);

        res.json({
            uploads,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalUploads: total
            }
        });
    } catch (err) {
        console.error('获取上传列表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取单个上传文件详情
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id)
            .populate('user', 'username')
            .populate('charts', 'title chartType thumbnail');

        if (!upload) {
            return res.status(404).json({ message: '文件不存在' });
        }

        // 检查权限
        const canAccess = upload.user._id.toString() === req.user.userId || 
                         upload.permissions?.isPublic ||
                         upload.permissions?.allowedUsers?.includes(req.user.userId);

        if (!canAccess) {
            return res.status(403).json({ message: '无权限访问' });
        }

        res.json(upload);
    } catch (err) {
        console.error('获取文件详情错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新文件处理配置
router.put('/:id/config', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id);
        
        if (!upload) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (upload.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限修改' });
        }

        const { processingConfig } = req.body;
        if (processingConfig) {
            upload.processingConfig = processingConfig;
        }

        upload.status = 'processed';
        await upload.save();

        res.json({
            message: '配置更新成功',
            upload
        });
    } catch (err) {
        console.error('更新配置错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新文件权限
router.put('/:id/permissions', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id);
        
        if (!upload) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (upload.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限修改' });
        }

        const { isPublic, allowedUsers } = req.body;
        if (isPublic !== undefined) {
            upload.permissions.isPublic = isPublic;
        }
        if (allowedUsers) {
            upload.permissions.allowedUsers = allowedUsers;
        }

        await upload.save();

        res.json({
            message: '权限更新成功',
            upload
        });
    } catch (err) {
        console.error('更新权限错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除上传文件
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id);
        
        if (!upload) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (upload.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限删除' });
        }

        // 删除文件
        if (fs.existsSync(upload.path)) {
            fs.unlinkSync(upload.path);
        }

        await Upload.findByIdAndDelete(req.params.id);

        // 更新用户
        await User.findByIdAndUpdate(req.user.userId, {
            $pull: { uploads: upload._id }
        });

        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除文件错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;
