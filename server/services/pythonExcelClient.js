/**
 * Python Excel 解析服务客户端
 * 
 * 调用 FastAPI 服务进行 Excel 解析
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 简单的日志替代
const logger = {
  info: (msg) => console.log('[INFO]', msg),
  error: (msg) => console.error('[ERROR]', msg),
  warn: (msg) => console.warn('[WARN]', msg)
};

// Python 服务地址
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

class PythonExcelClient {
  constructor() {
    this.client = axios.create({
      baseURL: PYTHON_SERVICE_URL,
      timeout: 60000, // 60 秒超时
    });

    logger.info(`Python Excel 客户端初始化：${PYTHON_SERVICE_URL}`);
  }

  /**
   * 分析 Excel 文件
   * 
   * @param {Buffer} fileBuffer - 文件 Buffer
   * @param {string} filename - 文件名
   * @returns {Promise<Object>} 解析结果
   */
  async analyzeExcel(fileBuffer, filename) {
    try {
      logger.info(`开始分析 Excel: ${filename}`);

      // 创建 FormData
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // 调用 Python 服务
      const response = await this.client.post('/analyze', formData, {
        headers: formData.getHeaders()
      });

      logger.info(`Excel 解析成功：${filename}, ${response.data.total_sheets} 个 sheet`);

      return this._transformResponse(response.data);

    } catch (error) {
      logger.error(`Excel 解析失败：${error.message}`);
      
      if (error.response) {
        throw new Error(`Python 服务错误：${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到 Python 服务，请确保服务已启动（端口 8000）');
      } else {
        throw error;
      }
    }
  }

  /**
   * 分析本地文件（用于测试）
   * 
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 解析结果
   */
  async analyzeFilePath(filePath) {
    try {
      logger.info(`分析本地文件：${filePath}`);

      // 使用 GET 请求而不是 POST
      const response = await this.client.get('/analyze-file-path', {
        params: { file_path: filePath }
      });

      logger.info(`本地文件解析成功：${filePath}`);

      return this._transformResponse(response.data);

    } catch (error) {
      logger.error(`本地文件解析失败：${error.message}`);
      throw error;
    }
  }

  /**
   * 健康检查
   * 
   * @returns {Promise<boolean>} 服务是否可用
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      logger.error(`Python 服务健康检查失败：${error.message}`);
      return false;
    }
  }

  /**
   * 转换响应格式
   * 
   * @param {Object} pythonResponse - Python 服务响应
   * @returns {Object} 转换后的数据
   */
  _transformResponse(pythonResponse) {
    const { sheets, total_sheets, filename, file_size_mb } = pythonResponse;

    // 提取所有 sheet 的数据列
    const allDataColumns = [];
    const sheetNames = Object.keys(sheets || {});

    for (const [sheetName, sheetData] of Object.entries(sheets)) {
      if (sheetData.columns) {
        for (const col of sheetData.columns) {
          allDataColumns.push({
            ...col,
            sheetName: sheetName, // 驼峰格式（Node.js 风格）
            sheet_name: sheetName // 蛇形格式（Python 风格，向后兼容）
          });
        }
      }
    }

    // 转换为 Node.js 格式
    return {
      filename,
      fileSizeMB: file_size_mb,
      totalSheets: total_sheets,
      sheetNames,
      dataColumns: allDataColumns,
      totalColumns: allDataColumns.length,
      pythonAnalysis: pythonResponse, // 保留原始分析结果
      confidence: this._calculateConfidence(pythonResponse)
    };
  }

  /**
   * 计算置信度评分
   * 
   * @param {Object} analysis - Python 分析结果
   * @returns {number} 置信度（0-100）
   */
  _calculateConfidence(analysis) {
    let confidence = 100;

    // 有有效 sheet
    if (!analysis.sheets || Object.keys(analysis.sheets).length === 0) {
      confidence -= 50;
    }

    // 有数据列
    const totalColumns = Object.values(analysis.sheets || {})
      .reduce((sum, sheet) => sum + (sheet.columns?.length || 0), 0);
    
    if (totalColumns === 0) {
      confidence -= 30;
    }

    // 元数据完整度
    let metadataComplete = 0;
    let metadataTotal = 0;

    for (const sheet of Object.values(analysis.sheets || {})) {
      for (const col of sheet.columns || []) {
        metadataTotal++;
        if (col.display_name) metadataComplete++;
        if (col.unit) metadataComplete++;
        if (col.source) metadataComplete++;
      }
    }

    if (metadataTotal > 0) {
      const metadataRatio = metadataComplete / (metadataTotal * 3);
      confidence *= (0.7 + 0.3 * metadataRatio); // 元数据占 30% 权重
    }

    return Math.round(Math.max(confidence, 0));
  }
}

// 导出单例
module.exports = new PythonExcelClient();
