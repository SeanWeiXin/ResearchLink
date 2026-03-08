/**
 * 数据预览生成器 (JavaScript 版本)
 * 
 * 生成用于前端展示的数据预览
 */

/**
 * 数据预览生成器类
 */
class PreviewGenerator {
  /**
   * 从数据块生成预览
   */
  generateFromBlock(block, rowCount = 20) {
    const { columns, data } = block;

    const previewData = [];
    
    for (let i = 0; i < Math.min(rowCount, data.length); i++) {
      const row = data[i];
      const previewRow = {};

      columns.forEach((col, idx) => {
        previewRow[col.name] = this.formatValue(row[idx], col);
      });

      previewData.push(previewRow);
    }

    const statistics = this.generateStatistics(data, columns);
    const qualityScore = this.calculateQualityScore(data, columns);

    return {
      previewData,
      columns: columns.map(col => ({
        name: col.name,
        type: col.type,
        format: col.format,
        sample: col.sample
      })),
      statistics,
      qualityScore
    };
  }

  /**
   * 从长表数据生成预览
   */
  generateFromLongFormat(longData, rowCount = 20) {
    const previewData = longData.data.slice(0, rowCount);
    const columns = this.inferColumnsFromLongData(longData);

    const statistics = {
      rowCount: longData.data.length,
      columnCount: longData.dimensions.length + 2,
      nullCount: this.countNulls(longData.data),
      duplicateCount: this.countDuplicates(longData.data)
    };

    const qualityScore = this.calculateQualityScore(
      longData.data.map(row => Object.values(row)),
      columns.map(col => ({ name: col.name, type: 'unknown', sample: [] }))
    );

    return {
      previewData,
      columns,
      statistics,
      qualityScore
    };
  }

  /**
   * 从分析结果生成预览
   */
  generateFromAnalysis(analysis, blockIndex = 0, rowCount = 20) {
    if (analysis.dataBlocks.length === 0) {
      return null;
    }

    const block = analysis.dataBlocks[blockIndex];
    return this.generateFromBlock(block, rowCount);
  }

  // 辅助方法
  formatValue(value, column) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (column.type === 'date' && column.format) {
      return this.formatDate(value, column.format);
    }

    if (column.type === 'number' && column.format) {
      return this.formatNumber(value, column.format);
    }

    return value;
  }

  formatDate(value, format) {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    if (format === 'M 月') {
      return String(value);
    }

    return String(value);
  }

  formatNumber(value, format) {
    if (format === 'percentage') {
      const num = Number(value);
      return isNaN(num) ? value : `${(num * 100).toFixed(2)}%`;
    }

    if (format === 'thousand_separator') {
      const num = Number(value);
      return isNaN(num) ? value : num.toLocaleString();
    }

    return Number(value);
  }

  generateStatistics(data, columns) {
    return {
      rowCount: data.length,
      columnCount: columns.length,
      nullCount: this.countNulls(data),
      duplicateCount: this.countDuplicates(data)
    };
  }

  countNulls(data) {
    let count = 0;
    for (const row of data) {
      for (const cell of row) {
        if (cell === null || cell === undefined || cell === '') {
          count++;
        }
      }
    }
    return count;
  }

  countDuplicates(data) {
    const seen = new Set();
    let duplicates = 0;

    for (const row of data) {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  calculateQualityScore(data, columns) {
    if (data.length === 0 || columns.length === 0) {
      return 0;
    }

    let score = 100;
    const totalCells = data.length * columns.length;

    let nullCount = 0;
    for (const row of data) {
      for (const cell of row) {
        if (cell === null || cell === undefined || cell === '') {
          nullCount++;
        }
      }
    }
    const nullRatio = nullCount / totalCells;
    score -= nullRatio * 30;

    const duplicates = this.countDuplicates(data);
    const duplicateRatio = duplicates / data.length;
    score -= duplicateRatio * 20;

    let namedColumns = 0;
    for (const col of columns) {
      if (col.name && !col.name.startsWith('Column_')) {
        namedColumns++;
      }
    }
    const namedRatio = namedColumns / columns.length;
    score += namedRatio * 10;

    if (data.length >= 100) {
      score += 10;
    } else if (data.length >= 50) {
      score += 5;
    } else if (data.length >= 10) {
      score += 2;
    }

    return Math.max(Math.min(score, 100), 0);
  }

  inferColumnsFromLongData(longData) {
    const columns = [];

    for (const dim of longData.dimensions) {
      columns.push({
        name: dim,
        type: 'string',
        sample: []
      });
    }

    if (longData.timeDimension) {
      columns.push({
        name: longData.timeDimension,
        type: 'date',
        format: 'YYYY',
        sample: []
      });
    }

    columns.push({
      name: longData.valueDimension,
      type: 'number',
      sample: []
    });

    return columns;
  }
}

module.exports = {
  PreviewGenerator,
  previewGenerator: new PreviewGenerator()
};
