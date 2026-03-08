const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['uploaded', 'processing', 'processed', 'error'], 
        default: 'uploaded' 
    },
    metadata: {
        // 旧格式（兼容）
        rowCount: Number,
        columnCount: Number,
        // 简化 columns 为对象数组，避免验证问题
        columns: mongoose.Schema.Types.Mixed,
        isTimeSeries: { type: Boolean, default: false },
        timeSeriesFormat: String,
        frequency: String,
        
        // 新格式（Python ETL）
        sheetNames: [String],
        dataColumns: [{
            columnIndex: Number,
            sheetName: String, // 工作表名称（新增）
            sheet_name: String, // 兼容 Python 格式
            originalName: String,
            displayName: String,
            unit: String,
            source: String,
            frequency: String,
            timeRange: String,
            // 预览数据（前 5 行）
            previewRows: [{
                date: String,
                value: Number
            }],
            totalRows: Number,
            selected: { type: Boolean, default: true } // 用户是否选择上传
        }],
        pythonAnalysis: Object, // 完整的 Python 分析结果
        confidence: Number // 置信度（0-100）
    },
    processingConfig: {
        dateFormat: String,
        timeColumn: String,
        valueColumns: [String],
        transformations: [String],
        aggregation: String
    },
    charts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chart' }],
    permissions: {
        isPublic: { type: Boolean, default: false },
        allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    },
    // 数据存储相关字段（新增）
    dataStoragePath: { type: String }, // 服务器文件存储路径
    storageMetadata: {
        username: String, // 用户名
        excelName: String, // Excel 文件名（标准化）
        dataName: String, // 数据名（标准化）
        storageFormat: { type: String, enum: ['json', 'csv'], default: 'json' },
        storedAt: Date, // 存储时间
        fileSize: Number // 存储文件大小
    },
    isVerified: { type: Boolean, default: false } // 用户是否已确认数据无误
}, {
    timestamps: true
});

uploadSchema.index({ user: 1, createdAt: -1 });
uploadSchema.index({ status: 1 });

module.exports = mongoose.model('Upload', uploadSchema);
