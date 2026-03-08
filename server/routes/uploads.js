const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const Upload = require('../models/Upload');
const User = require('../models/User');
const { excelAnalyzer } = require('../services/excelAnalyzer');
const { previewGenerator } = require('../services/previewGenerator');

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

        // 读取文件并使用智能体分析
        console.log('📊 开始分析 Excel 文件:', req.file.originalname);
        const buffer = fs.readFileSync(req.file.path);
        const analysisResult = await excelAnalyzer.analyze(buffer, req.file.originalname);
        console.log('✅ 分析完成，置信度:', analysisResult.overallConfidence.toFixed(2) + '%');

        // 转换为纯 JSON 对象（MongoDB 兼容）
        const firstSheet = analysisResult.sheets[0];
        const firstBlock = firstSheet?.dataBlocks[0];
        
        const columns = (firstBlock?.columns || []).map(col => ({
          name: col.name,
          type: col.type,
          format: col.format || undefined,
          sample: col.sample?.slice(0, 5).map(s => {
            if (s instanceof Date) return s.toISOString();
            if (typeof s === 'object') return JSON.stringify(s);
            return s;
          }) || []
        }));

        const dataBlocks = (firstSheet?.dataBlocks || []).map(b => ({
          blockId: b.blockId,
          blockName: b.blockName || undefined,
          startRow: b.startRow,
          endRow: b.endRow,
          rowCount: b.data.length
        }));

        const previewRows = previewGenerator.generateFromAnalysis(firstSheet, 0, 20)?.previewData || [];

        // 创建上传记录（包含智能分析结果）
        const upload = new Upload({
            user: req.user.userId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimeType: req.file.mimetype,
            status: 'processed',
            metadata: {
                // 使用第一个工作表的第一个数据块
                rowCount: firstBlock?.data.length || 0,
                columnCount: firstBlock?.columns.length || 0,
                sheetNames: analysisResult.sheets.map(s => s.sheetName),
                columns: columns,
                dataType: firstSheet?.dataType,
                confidence: analysisResult.overallConfidence,
                dataBlocks: dataBlocks,
                // 生成预览数据（前 20 行）
                previewRows: previewRows,
                // 警告信息
                warnings: firstSheet?.warnings || []
            }
        });

        await upload.save();

        // 更新用户的上传列表
        user.uploads.push(upload._id);
        await user.save();

        console.log('💾 上传记录已保存');

        res.status(201).json({
            message: '上传并解析成功',
            upload: {
                id: upload._id,
                filename: upload.originalName,
                size: upload.size,
                status: upload.status,
                createdAt: upload.createdAt,
                metadata: {
                    rowCount: upload.metadata.rowCount,
                    columnCount: upload.metadata.columnCount,
                    sheetNames: upload.metadata.sheetNames,
                    columns: upload.metadata.columns,
                    dataType: upload.metadata.dataType,
                    confidence: upload.metadata.confidence,
                    warnings: upload.metadata.warnings
                }
            }
        });
    } catch (err) {
        console.error('❌ 上传文件错误:', err);
        res.status(500).json({ 
            message: '上传失败：' + err.message,
            error: err.message
        });
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
