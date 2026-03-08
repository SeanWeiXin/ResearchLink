/**
 * Excel 结构分析智能体 (JavaScript 版本)
 * 
 * 专门用于处理复杂格式的 Excel 文件：
 * - 多行表头、合并单元格
 * - 多个独立数据块
 * - 噪音数据（元数据、汇总行）
 * - 宽表转长表
 */

const XLSX = require('xlsx');

/**
 * Excel 结构分析器类
 */
class ExcelStructureAnalyzer {
  constructor() {
    this.headerConfig = {
      maxHeaderRows: 10,
      detectMergedCells: true,
      detectEmptyRows: true
    };
    
    this.blockConfig = {
      minEmptyRowsToSplit: 1,
      minBlockRows: 3
    };
  }

  /**
   * 分析 Excel 文件
   */
  async analyze(buffer, filename) {
    try {
      // 读取工作簿
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true,
        cellStyles: true
      });

      const sheets = [];
      
      // 分析每个工作表
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const analysis = await this.analyzeSheet(worksheet, sheetName, workbook);
        sheets.push(analysis);
      }

      // 生成推荐
      const recommendations = this.generateRecommendations(sheets);
      
      // 计算总体置信度
      const overallConfidence = sheets.length > 0
        ? sheets.reduce((sum, s) => sum + s.confidence, 0) / sheets.length
        : 0;

      return {
        filename,
        sheets,
        recommendations,
        overallConfidence
      };
    } catch (error) {
      throw new Error(`Excel 解析失败：${error.message}`);
    }
  }

  /**
   * 分析单个工作表
   */
  async analyzeSheet(worksheet, sheetName, workbook) {
    // 转换为二维数组
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null
    });

    const totalRows = data.length;
    const totalColumns = this.getMaxColumnCount(data);

    const warnings = [];
    let confidence = 100;

    // 1. 检测元数据行
    const metadataRows = this.detectMetadataRows(data);
    
    // 2. 检测数据块
    const dataBlocks = this.detectDataBlocks(data, metadataRows?.end || 0);
    
    // 3. 推断数据结构类型
    const dataType = this.inferDataType(dataBlocks);
    
    // 4. 计算置信度
    if (dataBlocks.length === 0) {
      confidence -= 50;
      warnings.push('未检测到有效数据块');
    }
    
    if (metadataRows && metadataRows.end > 5) {
      confidence -= 10;
      warnings.push(`元数据区域较大（${metadataRows.end - metadataRows.start + 1}行）`);
    }

    // 5. 生成转换建议
    if (dataBlocks.some(block => block.columns.some(col => this.isYearColumn(col)))) {
      warnings.push('检测到年份列，建议进行宽表转长表（unpivot）处理');
      confidence -= 5;
    }

    return {
      sheetName,
      totalRows,
      totalColumns,
      metadataRows,
      dataBlocks,
      dataType,
      confidence: Math.max(confidence, 0),
      warnings
    };
  }

  /**
   * 检测元数据行
   */
  detectMetadataRows(data) {
    if (data.length === 0) return null;

    let metadataEnd = 0;
    const metadata = {};

    // 检测前几行是否为键值对形式的元数据
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i];
      
      // 跳过空行
      if (this.isEmptyRow(row)) {
        if (metadataEnd > 0) break;
        continue;
      }

      // 检测是否为键值对格式
      if (row.length >= 2) {
        const key = String(row[0]);
        const value = row[1];
        
        const metadataKeywords = [
          '指标', '来源', '单位', '频率', '时间', '更新', 
          'source', 'unit', 'frequency', 'date', 'updated'
        ];
        
        const hasKeyword = metadataKeywords.some(keyword => 
          key.toLowerCase().includes(keyword)
        );

        if (hasKeyword || this.isKeyValueFormat(key)) {
          metadata[key.replace(/[：:]/, '').trim()] = value;
          metadataEnd = i + 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (metadataEnd > 0) {
      return {
        start: 0,
        end: metadataEnd,
        data: metadata
      };
    }

    return null;
  }

  /**
   * 检测数据块
   */
  detectDataBlocks(data, startRow) {
    const blocks = [];
    let currentBlockStart = null;
    let currentBlockName = undefined;

    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      const isEmpty = this.isEmptyRow(row);

      if (isEmpty) {
        if (currentBlockStart !== null && i - currentBlockStart >= this.blockConfig.minBlockRows) {
          const block = this.parseDataBlock(data, currentBlockStart, i - 1, currentBlockName);
          if (block) {
            blocks.push(block);
          }
          currentBlockStart = null;
          currentBlockName = undefined;
        }
      } else {
        if (currentBlockStart === null) {
          currentBlockStart = i;
          currentBlockName = undefined;
        }

        if (this.isMergedTitleRow(data, i)) {
          currentBlockName = this.extractMergedTitle(data[i]);
        }
      }
    }

    if (currentBlockStart !== null && data.length - currentBlockStart >= this.blockConfig.minBlockRows) {
      const block = this.parseDataBlock(data, currentBlockStart, data.length - 1, currentBlockName);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * 解析数据块
   */
  parseDataBlock(data, startRow, endRow, blockName) {
    if (startRow >= endRow) return null;

    const headerInfo = this.detectBlockHeader(data, startRow, endRow);
    
    if (!headerInfo) return null;

    const { headerRows, dataStartRow } = headerInfo;
    const columns = this.extractColumnInfo(data, headerRows, dataStartRow, endRow);
    const blockData = data.slice(dataStartRow, endRow + 1);

    return {
      blockId: `block_${startRow}_${endRow}`,
      blockName,
      startRow,
      endRow,
      headerRows,
      columns,
      data: blockData,
      metadata: {}
    };
  }

  /**
   * 检测块表头
   */
  detectBlockHeader(data, startRow, endRow) {
    const headerRows = [];
    let dataStartRow = startRow;

    for (let i = startRow; i <= endRow && i < startRow + this.headerConfig.maxHeaderRows; i++) {
      const row = data[i];
      
      if (this.isHeaderRow(row, data[i + 1])) {
        headerRows.push(i);
        dataStartRow = i + 1;
      } else if (headerRows.length > 0) {
        break;
      }
    }

    if (headerRows.length === 0) {
      headerRows.push(startRow);
      dataStartRow = startRow + 1;
    }

    return { headerRows, dataStartRow };
  }

  /**
   * 提取列信息
   */
  extractColumnInfo(data, headerRows, dataStartRow, endRow) {
    if (headerRows.length === 0 || dataStartRow > endRow) return [];

    const lastHeaderRow = data[headerRows[headerRows.length - 1]];
    const columnCount = lastHeaderRow?.length || 0;

    const columns = [];

    for (let col = 0; col < columnCount; col++) {
      const name = lastHeaderRow[col] || `Column_${col + 1}`;
      
      const columnData = [];
      for (let row = dataStartRow; row <= Math.min(endRow, dataStartRow + 20); row++) {
        if (data[row] && data[row][col] !== null && data[row][col] !== undefined) {
          columnData.push(data[row][col]);
        }
      }

      const type = this.detectColumnType(columnData);
      const format = this.detectColumnFormat(columnData, type);

      columns.push({
        name: String(name).trim(),
        type,
        detectedType: type,
        format,
        sample: columnData.slice(0, 5)
      });
    }

    return columns;
  }

  /**
   * 检测列类型
   */
  detectColumnType(values) {
    if (values.length === 0) return 'unknown';

    const typeCounts = {};

    for (const value of values) {
      const type = this.detectValueType(value);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    return sortedTypes[0]?.[0] || 'unknown';
  }

  /**
   * 检测值类型
   */
  detectValueType(value) {
    if (value === null || value === undefined || value === '') {
      return 'unknown';
    }

    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';

    if (typeof value === 'string') {
      const datePatterns = [
        { pattern: /^\d{4}-\d{2}-\d{2}$/, type: 'date' },
        { pattern: /^\d{4}\/\d{2}\/\d{2}$/, type: 'date' },
        { pattern: /^\d{4}\.\d{2}\.\d{2}$/, type: 'date' },
        { pattern: /^\d{2}-\d{2}-\d{4}$/, type: 'date' },
        { pattern: /^\d{2}\/\d{2}\/\d{4}$/, type: 'date' },
        { pattern: /^\d{4}年\d{2}月\d{2}日$/, type: 'date' },
        { pattern: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, type: 'date' },
        { pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, type: 'date' },
        { pattern: /^\d{1,2}月$/, type: 'month' }
      ];

      for (const { pattern, type } of datePatterns) {
        if (pattern.test(value.trim())) return type;
      }

      if (/^-?\d+(\.\d+)?%$/.test(value.trim())) return 'number';
      if (/^-?\d+(\.\d+)?[eE][+-]?\d+$/.test(value.trim())) return 'number';
      if (/^-?\d+(\.\d+)?$/.test(value.trim())) return 'number';
      if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(value.trim())) return 'number';

      return 'string';
    }

    return 'unknown';
  }

  /**
   * 检测列格式
   */
  detectColumnFormat(values, type) {
    if (values.length === 0) return undefined;

    if (type === 'date') {
      const sample = String(values[0]).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) return 'YYYY-MM-DD';
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(sample)) return 'YYYY/MM/DD';
      if (/^\d{4}\.\d{2}\.\d{2}$/.test(sample)) return 'YYYY.MM.DD';
      if (/^\d{4}年\d{2}月\d{2}日$/.test(sample)) return 'YYYY 年 MM 月 DD 日';
      if (/^\d{1,2}月$/.test(sample)) return 'M 月';
    }

    if (type === 'number') {
      const sample = String(values[0]).trim();
      if (/%$/.test(sample)) return 'percentage';
      if (/[eE]/.test(sample)) return 'scientific';
      if (/,/.test(sample)) return 'thousand_separator';
      if (/\./.test(sample)) return 'decimal';
    }

    return undefined;
  }

  /**
   * 推断数据结构类型
   */
  inferDataType(blocks) {
    if (blocks.length === 0) return 'custom';

    const firstBlock = blocks[0];
    const columns = firstBlock.columns;

    const dateColumns = columns.filter(col => col.type === 'date' || col.format === 'M 月');
    const yearColumns = columns.filter(col => this.isYearColumn(col));
    const valueColumns = columns.filter(col => col.type === 'number');
    const textColumns = columns.filter(col => col.type === 'string');

    if (dateColumns.length >= 1 && valueColumns.length >= 1) {
      if (textColumns.length >= 1) return 'panel_data';
      return 'time_series';
    }

    if (yearColumns.length >= 2 && dateColumns.length >= 1 && valueColumns.length >= 1) {
      return 'panel_data';
    }

    if (textColumns.length >= 1 && valueColumns.length >= 1 && dateColumns.length === 0) {
      return 'cross_section';
    }

    return 'custom';
  }

  /**
   * 生成处理建议
   */
  generateRecommendations(sheets) {
    const recommendations = [];

    const totalBlocks = sheets.reduce((sum, s) => sum + s.dataBlocks.length, 0);
    if (totalBlocks > 1) {
      recommendations.push({
        action: 'split_blocks',
        description: `检测到 ${totalBlocks} 个独立数据块，建议拆分处理`,
        priority: 'high'
      });
    }

    const hasYearColumns = sheets.some(s =>
      s.dataBlocks.some(b => b.columns.some(c => this.isYearColumn(c)))
    );
    if (hasYearColumns) {
      recommendations.push({
        action: 'unpivot',
        description: '检测到年份列（宽表格式），建议转换为长表格式',
        priority: 'high'
      });
    }

    const hasMetadata = sheets.some(s => s.metadataRows && s.metadataRows.end > 0);
    if (hasMetadata) {
      recommendations.push({
        action: 'clean',
        description: '检测到元数据行，处理时需要跳过',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // 辅助方法
  isEmptyRow(row) {
    if (!row || row.length === 0) return true;
    return row.every(cell => cell === null || cell === undefined || cell === '');
  }

  isMergedTitleRow(data, rowIndex) {
    if (rowIndex >= data.length) return false;
    
    const row = data[rowIndex];
    if (!row || row.length === 0) return false;

    const firstCell = row[0];
    const nonEmptyCount = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;

    return firstCell && nonEmptyCount === 1 && row.length > 2;
  }

  extractMergedTitle(row) {
    return String(row[0] || '').trim();
  }

  isHeaderRow(row, nextRow) {
    if (!row || row.length === 0) return false;

    const textCount = row.filter(cell => 
      typeof cell === 'string' && cell.trim().length > 0
    ).length;

    if (nextRow && !this.isEmptyRow(nextRow)) {
      const nextTextCount = nextRow.filter(cell => 
        typeof cell === 'string' && cell.trim().length > 0
      ).length;

      return textCount > nextTextCount || textCount > row.length * 0.5;
    }

    return textCount > row.length * 0.5;
  }

  getMaxColumnCount(data) {
    return Math.max(...data.map(row => row?.length || 0), 0);
  }

  isKeyValueFormat(text) {
    return /[：:]/.test(text);
  }

  isYearColumn(column) {
    const name = String(column.name).trim();
    return /^\d{4}年?$/.test(name);
  }
}

module.exports = {
  ExcelStructureAnalyzer,
  excelAnalyzer: new ExcelStructureAnalyzer()
};
