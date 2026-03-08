const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const Upload = require('../models/Upload');
const User = require('../models/User');
const pythonExcelClient = require('../services/pythonExcelClient');
const dataStorage = require('../services/dataStorage');

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

/**
 * 存储所有解析后的数据到服务器
 * @param {string} username - 用户名
 * @param {string} excelName - Excel 文件名
 * @param {object} analysisResult - Python 解析结果
 * @returns {object} - 存储结果
 */
async function storeAllData(username, excelName, analysisResult) {
    const { sheetNames, dataColumns } = analysisResult;
    
    // 生成存储路径
    const storageInfo = dataStorage.generateStoragePath(username, excelName);
    
    // 确保目录存在
    dataStorage.ensureDirectoryExists(storageInfo.basePath);
    
    let totalSize = 0;
    const storedFiles = [];
    
    // 按工作表组织数据
    const dataBySheet = {};
    
    // 遍历所有数据列，按工作表分组
    dataColumns.forEach(col => {
        const sheetName = col.sheetName || 'default';
        if (!dataBySheet[sheetName]) {
            dataBySheet[sheetName] = [];
        }
        
        // 将数据点转换为对象数组
        if (col.data_points && col.data_points.length > 0) {
            col.data_points.forEach(point => {
                const dataObj = {
                    date: point.date,
                    value: point.value,
                    column: col.display_name || col.original_name
                };
                dataBySheet[sheetName].push(dataObj);
            });
        }
    });
    
    // 保存每个工作表的数据
    for (const [sheetName, sheetData] of Object.entries(dataBySheet)) {
        const safeSheetName = dataStorage.sanitizeFilename(sheetName);
        const dataName = safeSheetName || 'data';
        
        // 保存完整数据
        const saveResult = dataStorage.saveData(
            sheetData,
            path.join(storageInfo.basePath, dataName),
            'json'
        );
        
        totalSize += saveResult.fileSize;
        storedFiles.push(saveResult);
        
        // 保存元数据
        const sheetMetadata = {
            sheetName,
            excelName,
            username,
            storedAt: new Date(),
            columns: dataColumns
                .filter(col => col.sheetName === sheetName || !col.sheetName)
                .map(col => ({
                    displayName: col.display_name,
                    originalName: col.original_name,
                    unit: col.unit,
                    source: col.source,
                    frequency: col.frequency,
                    timeRange: col.time_range,
                    totalRows: col.total_rows
                }))
        };
        
        dataStorage.saveMetadata(
            path.join(storageInfo.basePath, dataName),
            sheetMetadata
        );
    }
    
    // 保存总体元数据
    const overallMetadata = {
        excelName,
        username,
        sheetNames,
        totalColumns: dataColumns.length,
        confidence: analysisResult.confidence,
        storedAt: new Date(),
        format: 'json'
    };
    
    dataStorage.saveMetadata(
        path.join(storageInfo.basePath, storageInfo.safeExcelName),
        overallMetadata
    );
    
    return {
        success: true,
        basePath: storageInfo.basePath,
        safeExcelName: storageInfo.safeExcelName,
        safeUsername: storageInfo.safeUsername,
        totalSize,
        storedFiles,
        sheetCount: Object.keys(dataBySheet).length
    };
}

// 上传 Excel 文件（使用 Python 服务解析）
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

        // 读取文件
        console.log('📊 开始上传 Excel 文件:', req.file.originalname);
        const fileBuffer = fs.readFileSync(req.file.path);

        // 调用 Python 服务解析
        console.log('🐍 调用 Python 服务解析...');
        const analysisResult = await pythonExcelClient.analyzeExcel(fileBuffer, req.file.originalname);
        console.log('✅ Python 解析完成，置信度:', analysisResult.confidence);
        console.log('📊 数据列结构示例:', analysisResult.dataColumns[0]);

        // 自动存储所有数据到服务器
        console.log('💾 开始存储数据到服务器...');
        const storageResult = await storeAllData(user.username, req.file.originalname, analysisResult);
        console.log('✅ 数据存储完成:', storageResult);

        // 创建上传记录
        const upload = new Upload({
            user: req.user.userId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimeType: req.file.mimetype,
            status: 'processed',
            dataStoragePath: storageResult.basePath,
            storageMetadata: {
                username: user.username,
                excelName: storageResult.safeExcelName,
                dataName: storageResult.safeExcelName,
                storageFormat: 'json',
                storedAt: new Date(),
                fileSize: storageResult.totalSize
            },
            isVerified: false,
            metadata: {
                // Python ETL 格式
                sheetNames: analysisResult.sheetNames,
                dataColumns: analysisResult.dataColumns.map(col => ({
                    columnIndex: col.column_index,
                    sheetName: col.sheet_name, // 添加工作表名称
                    originalName: col.original_name,
                    displayName: col.display_name,
                    unit: col.unit,
                    source: col.source,
                    frequency: col.frequency,
                    timeRange: col.time_range,
                    previewRows: col.preview_rows || [],
                    totalRows: col.total_rows,
                    selected: true
                })),
                pythonAnalysis: analysisResult.pythonAnalysis,
                confidence: analysisResult.confidence,
                
                // 兼容旧格式
                rowCount: analysisResult.dataColumns[0]?.total_rows || 0,
                columnCount: analysisResult.totalColumns,
                columns: analysisResult.dataColumns.map(col => ({
                    name: col.display_name || col.displayName || 'Unknown',
                    type: 'number',
                    detectedType: 'number'
                })),
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
                isVerified: upload.isVerified,
                dataStoragePath: upload.dataStoragePath,
                metadata: {
                    sheetNames: upload.metadata.sheetNames,
                    totalColumns: upload.metadata.columnCount,
                    confidence: upload.metadata.confidence,
                    dataColumns: upload.metadata.dataColumns.map(col => ({
                        columnIndex: col.columnIndex,
                        displayName: col.displayName,
                        unit: col.unit,
                        source: col.source,
                        frequency: col.frequency,
                        previewRows: col.previewRows,
                        selected: col.selected
                    }))
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

        // 调试：检查 dataColumns 的 sheetName 字段
        if (upload.metadata?.dataColumns?.length > 0) {
            console.log('📊 [原始] MongoDB 返回数据列示例:', {
                totalColumns: upload.metadata.dataColumns.length,
                firstColumn: upload.metadata.dataColumns[0],
                hasSheetName: upload.metadata.dataColumns.some(col => col.sheetName || col.sheet_name)
            });
            
            // 检查是否是 Mongoose 文档对象
            console.log('📊 [类型] 是否为 Mongoose 文档:', upload.constructor.name);
            console.log('📊 [类型] metadata 类型:', upload.metadata?.constructor?.name);
        }

        res.json(upload);
    } catch (err) {
        console.error('获取文件详情错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新处理配置
router.put('/:id/config', authMiddleware, async (req, res) => {
    try {
        const upload = await Upload.findById(req.params.id);
        
        if (!upload) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (upload.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限修改' });
        }

        const { processingConfig, isVerified, metadata } = req.body;

        if (processingConfig) {
            upload.processingConfig = processingConfig;
        }

        if (isVerified !== undefined) {
            upload.isVerified = isVerified;
        }

        if (metadata) {
            upload.metadata = { ...upload.metadata, ...metadata };
        }

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
        console.error('删除文件错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;
