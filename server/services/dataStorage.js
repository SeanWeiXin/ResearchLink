const fs = require('fs');
const path = require('path');
const User = require('../models/User');

/**
 * 数据存储服务
 * 负责将解析后的 Excel 数据存储到服务器文件系统
 */

// 数据根目录
const DATA_ROOT = path.join(__dirname, '../data');

/**
 * 标准化文件名（去除特殊字符，保留中文）
 * @param {string} filename - 原始文件名
 * @returns {string} - 标准化后的文件名
 */
function sanitizeFilename(filename) {
    // 保留中文、英文、数字、下划线、连字符
    // 移除其他特殊字符和空格
    return filename
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * 生成数据存储路径
 * 格式：/data/{username}/{excelName}/{dataName}
 * @param {string} username - 用户名
 * @param {string} excelName - Excel 文件名
 * @param {string} dataName - 数据名（可选，用于多工作表）
 * @returns {object} - 包含路径信息
 */
function generateStoragePath(username, excelName, dataName = null) {
    const safeUsername = sanitizeFilename(username);
    const safeExcelName = sanitizeFilename(excelName);
    const safeDataName = dataName ? sanitizeFilename(dataName) : null;
    
    // 基础路径
    const basePath = path.join(DATA_ROOT, safeUsername, safeExcelName);
    
    // 完整路径（如果有数据名）
    const fullPath = safeDataName 
        ? path.join(basePath, safeDataName)
        : basePath;
    
    return {
        basePath,
        fullPath,
        safeUsername,
        safeExcelName,
        safeDataName
    };
}

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * 保存数据到文件系统
 * @param {object} data - 要保存的数据
 * @param {string} filePath - 文件路径
 * @param {string} format - 文件格式（json 或 csv）
 * @returns {object} - 保存结果
 */
function saveData(data, filePath, format = 'json') {
    ensureDirectoryExists(path.dirname(filePath));
    
    let content;
    let fileSize;
    
    if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        fs.writeFileSync(`${filePath}.json`, content, 'utf8');
        fileSize = Buffer.byteLength(content, 'utf8');
    } else if (format === 'csv') {
        // 转换为 CSV
        content = convertToCSV(data);
        fs.writeFileSync(`${filePath}.csv`, content, 'utf8');
        fileSize = Buffer.byteLength(content, 'utf8');
    } else {
        throw new Error(`不支持的文件格式：${format}`);
    }
    
    return {
        success: true,
        filePath: `${filePath}.${format}`,
        fileSize,
        format
    };
}

/**
 * 将数据转换为 CSV 格式
 * @param {array} data - 数据数组
 * @returns {string} - CSV 字符串
 */
function convertToCSV(data) {
    if (!data || data.length === 0) {
        return '';
    }
    
    // 获取所有键名
    const keys = Object.keys(data[0]);
    
    // 生成表头
    const header = keys.join(',');
    
    // 生成数据行
    const rows = data.map(row => {
        return keys.map(key => {
            let value = row[key];
            // 处理包含逗号或引号的值
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });
    
    return [header, ...rows].join('\n');
}

/**
 * 保存元数据
 * @param {string} metadataPath - 元数据文件路径
 * @param {object} metadata - 元数据对象
 */
function saveMetadata(metadataPath, metadata) {
    ensureDirectoryExists(path.dirname(metadataPath));
    const content = JSON.stringify(metadata, null, 2);
    fs.writeFileSync(`${metadataPath}_metadata.json`, content, 'utf8');
}

/**
 * 读取数据
 * @param {string} filePath - 文件路径
 * @param {string} format - 文件格式
 * @returns {any} - 数据
 */
function readData(filePath, format = 'json') {
    const fullPath = `${filePath}.${format}`;
    
    if (!fs.existsSync(fullPath)) {
        throw new Error(`文件不存在：${fullPath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (format === 'json') {
        return JSON.parse(content);
    } else if (format === 'csv') {
        return parseCSV(content);
    }
}

/**
 * 解析 CSV 字符串
 * @param {string} csvString - CSV 字符串
 * @returns {array} - 数据数组
 */
function parseCSV(csvString) {
    const lines = csvString.split('\n');
    if (lines.length < 2) {
        return [];
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 简单的 CSV 解析（不处理引号）
        const values = line.split(',');
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        
        data.push(row);
    }
    
    return data;
}

/**
 * 删除数据
 * @param {string} basePath - 基础路径
 * @returns {object} - 删除结果
 */
function deleteData(basePath) {
    if (!fs.existsSync(basePath)) {
        return { success: false, message: '路径不存在' };
    }
    
    // 递归删除目录
    fs.rmSync(basePath, { recursive: true, force: true });
    
    return { success: true, message: '删除成功' };
}

/**
 * 获取用户的所有数据
 * @param {string} username - 用户名
 * @returns {array} - 数据列表
 */
function getUserDataList(username) {
    const safeUsername = sanitizeFilename(username);
    const userPath = path.join(DATA_ROOT, safeUsername);
    
    if (!fs.existsSync(userPath)) {
        return [];
    }
    
    const excelDirs = fs.readdirSync(userPath)
        .filter(item => fs.statSync(path.join(userPath, item)).isDirectory());
    
    const dataList = [];
    
    excelDirs.forEach(excelDir => {
        const excelPath = path.join(userPath, excelDir);
        const metadataFile = path.join(excelPath, `${excelDir}_metadata.json`);
        
        let metadata = null;
        if (fs.existsSync(metadataFile)) {
            const content = fs.readFileSync(metadataFile, 'utf8');
            metadata = JSON.parse(content);
        }
        
        dataList.push({
            excelName: excelDir,
            metadata,
            path: excelPath
        });
    });
    
    return dataList;
}

/**
 * 检查用户是否有权限访问数据
 * @param {string} username - 用户名
 * @param {string} excelName - Excel 名
 * @param {object} user - 用户对象
 * @returns {boolean} - 是否有权限
 */
function hasAccess(username, excelName, user) {
    const safeUsername = sanitizeFilename(username);
    
    // 管理员可以访问所有数据
    if (user.role === 'admin') {
        return true;
    }
    
    // 所有者可以访问
    if (user.username === username || user.username === safeUsername) {
        return true;
    }
    
    return false;
}

module.exports = {
    DATA_ROOT,
    sanitizeFilename,
    generateStoragePath,
    ensureDirectoryExists,
    saveData,
    saveMetadata,
    readData,
    deleteData,
    getUserDataList,
    hasAccess,
    convertToCSV,
    parseCSV
};
