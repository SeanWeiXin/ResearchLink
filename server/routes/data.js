const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Upload = require('../models/Upload');
const User = require('../models/User');
const dataStorage = require('../services/dataStorage');
const fs = require('fs');
const path = require('path');

/**
 * 获取用户的数据列表
 * GET /api/data/my-data
 */
router.get('/my-data', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const skip = (page - 1) * limit;

        // 获取当前用户
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 查询条件
        let query = { user: req.user.userId };
        
        // 搜索条件
        if (search) {
            query['metadata.dataColumns.displayName'] = new RegExp(search, 'i');
        }

        const uploads = await Upload.find(query)
            .select('originalName size metadata.dataColumns metadata.sheetNames dataStoragePath storageMetadata isVerified createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Upload.countDocuments(query);

        // 构建数据列表
        const dataList = uploads.map(upload => ({
            id: upload._id,
            excelName: upload.originalName,
            sheetNames: upload.metadata?.sheetNames || [],
            columns: upload.metadata?.dataColumns?.map(col => ({
                displayName: col.displayName,
                unit: col.unit,
                source: col.source,
                frequency: col.frequency,
                totalRows: col.totalRows
            })) || [],
            totalColumns: upload.metadata?.columnCount || 0,
            totalRows: upload.metadata?.rowCount || 0,
            storagePath: upload.dataStoragePath,
            isVerified: upload.isVerified,
            createdAt: upload.createdAt
        }));

        res.json({
            data: dataList,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total
            }
        });
    } catch (err) {
        console.error('获取数据列表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

/**
 * 获取单个数据集详情
 * GET /api/data/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id)
            .populate('user', 'username role');

        if (!upload) {
            return res.status(404).json({ message: '数据不存在' });
        }

        // 检查权限
        const isOwner = upload.user._id.toString() === req.user.userId;
        const user = await User.findById(req.user.userId);
        const isAdmin = user?.role === 'admin';

        if (!isOwner && !isAdmin && !upload.permissions?.isPublic) {
            return res.status(403).json({ message: '无权限访问' });
        }

        // 如果已存储，从文件系统读取数据
        let storedData = null;
        if (upload.dataStoragePath && fs.existsSync(upload.dataStoragePath)) {
            try {
                const metadataFiles = fs.readdirSync(upload.dataStoragePath)
                    .filter(f => f.endsWith('_metadata.json'));
                
                const metadataList = metadataFiles.map(file => {
                    const content = fs.readFileSync(path.join(upload.dataStoragePath, file), 'utf8');
                    return JSON.parse(content);
                });

                storedData = metadataList;
            } catch (err) {
                console.error('读取存储数据失败:', err);
            }
        }

        res.json({
            id: upload._id,
            excelName: upload.originalName,
            sheetNames: upload.metadata?.sheetNames || [],
            columns: upload.metadata?.dataColumns || [],
            totalColumns: upload.metadata?.columnCount || 0,
            totalRows: upload.metadata?.rowCount || 0,
            storagePath: upload.dataStoragePath,
            storageMetadata: upload.storageMetadata,
            storedData,
            isVerified: upload.isVerified,
            isPublic: upload.permissions?.isPublic,
            owner: upload.user.username,
            createdAt: upload.createdAt,
            updatedAt: upload.updatedAt
        });
    } catch (err) {
        console.error('获取数据详情错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

/**
 * 获取数据预览
 * GET /api/data/:id/preview
 */
router.get('/:id/preview', authMiddleware, async (req, res) => {
    try {
        const { sheetName, limit = 100 } = req.query;
        const upload = await Upload.findById(req.params.id);

        if (!upload) {
            return res.status(404).json({ message: '数据不存在' });
        }

        // 检查权限
        const isOwner = upload.user.toString() === req.user.userId;
        if (!isOwner && !upload.permissions?.isPublic) {
            return res.status(403).json({ message: '无权限访问' });
        }

        // 从存储文件读取数据
        let previewData = [];
        if (upload.dataStoragePath && fs.existsSync(upload.dataStoragePath)) {
            const files = fs.readdirSync(upload.dataStoragePath);
            const dataFile = files.find(f => 
                f.endsWith('.json') && !f.includes('_metadata')
            );

            if (dataFile) {
                const content = fs.readFileSync(path.join(upload.dataStoragePath, dataFile), 'utf8');
                const allData = JSON.parse(content);
                previewData = allData.slice(0, parseInt(limit));
            }
        }

        // 如果文件数据不可用，使用 MongoDB 中的预览数据
        if (previewData.length === 0 && upload.metadata?.dataColumns?.length > 0) {
            const firstColumn = upload.metadata.dataColumns[0];
            if (firstColumn.previewRows) {
                previewData = firstColumn.previewRows;
            }
        }

        res.json({
            data: previewData,
            totalRows: upload.metadata?.rowCount || previewData.length,
            columns: upload.metadata?.dataColumns?.map(col => ({
                displayName: col.displayName,
                unit: col.unit,
                source: col.source,
                frequency: col.frequency
            })) || []
        });
    } catch (err) {
        console.error('获取数据预览错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

/**
 * 更新元数据
 * PUT /api/data/:id/metadata
 */
router.put('/:id/metadata', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id);

        if (!upload) {
            return res.status(404).json({ message: '数据不存在' });
        }

        // 检查权限（仅所有者可编辑）
        if (upload.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限修改' });
        }

        const { columns } = req.body;

        if (columns && Array.isArray(columns)) {
            // 更新列元数据
            upload.metadata.dataColumns = upload.metadata.dataColumns.map(col => {
                const updated = columns.find(c => c.columnIndex === col.columnIndex);
                if (updated) {
                    return {
                        ...col,
                        displayName: updated.displayName || col.displayName,
                        unit: updated.unit || col.unit,
                        source: updated.source || col.source,
                        frequency: updated.frequency || col.frequency,
                        timeRange: updated.timeRange || col.timeRange
                    };
                }
                return col;
            });
        }

        await upload.save();

        res.json({
            message: '元数据更新成功',
            data: upload
        });
    } catch (err) {
        console.error('更新元数据错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

/**
 * 删除数据
 * DELETE /api/data/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id);

        if (!upload) {
            return res.status(404).json({ message: '数据不存在' });
        }

        // 检查权限：只有所有者或管理员可以删除
        const user = await User.findById(req.user.userId);
        const isOwner = upload.user.toString() === req.user.userId;
        const isAdmin = user?.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: '无权限删除' });
        }

        // 删除存储的数据文件
        if (upload.dataStoragePath && fs.existsSync(upload.dataStoragePath)) {
            fs.rmSync(upload.dataStoragePath, { recursive: true, force: true });
            console.log('🗑️ 已删除存储数据:', upload.dataStoragePath);
        }

        // 删除上传记录
        await Upload.findByIdAndDelete(req.params.id);

        // 更新用户的上传列表
        await User.findByIdAndUpdate(req.user.userId, {
            $pull: { uploads: upload._id }
        });

        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除数据错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;
