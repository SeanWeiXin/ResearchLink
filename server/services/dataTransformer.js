/**
 * 数据转换工具 (JavaScript 版本)
 * 
 * 提供数据格式转换功能：
 * - 宽表转长表（Unpivot）
 * - 数据块合并
 * - 数据清洗
 */

/**
 * 数据转换服务类
 */
class DataTransformer {
  /**
   * 宽表转长表（Unpivot）
   */
  unpivot(block, idColumns, valueColumns, valueColumnName = 'value') {
    const { columns, data } = block;
    
    // 自动检测值列（年份列）
    if (!valueColumns) {
      valueColumns = columns
        .filter(col => this.isYearColumn(col))
        .map(col => col.name);
    }

    if (valueColumns.length === 0) {
      throw new Error('未检测到可转换的值列（年份列）');
    }

    // 获取列索引
    const idColumnIndices = idColumns.map(name => 
      columns.findIndex(col => col.name === name)
    ).filter(idx => idx !== -1);

    const valueColumnIndices = valueColumns.map(name => 
      columns.findIndex(col => col.name === name)
    ).filter(idx => idx !== -1);

    if (idColumnIndices.length === 0) {
      throw new Error('未找到标识列');
    }

    if (valueColumnIndices.length === 0) {
      throw new Error('未找到值列');
    }

    // 转换数据
    const longData = [];

    for (const row of data) {
      const idValues = {};
      idColumnIndices.forEach(idx => {
        idValues[columns[idx].name] = row[idx];
      });

      for (const valueIdx of valueColumnIndices) {
        const year = this.extractYear(columns[valueIdx].name);
        const value = row[valueIdx];

        if (value !== null && value !== undefined && value !== '') {
          longData.push({
            ...idValues,
            year,
            [valueColumnName]: value
          });
        }
      }
    }

    return {
      dimensions: idColumns,
      timeDimension: valueColumns.length > 0 ? 'year' : undefined,
      valueDimension: valueColumnName,
      data: longData
    };
  }

  /**
   * 合并多个数据块
   */
  mergeBlocks(blocks, addBlockNameColumn = true) {
    if (blocks.length === 0) {
      return { columns: [], data: [] };
    }

    if (blocks.length === 1) {
      return {
        columns: blocks[0].columns,
        data: blocks[0].data
      };
    }

    const baseColumns = [...blocks[0].columns];
    
    if (addBlockNameColumn) {
      baseColumns.unshift({
        name: 'data_source',
        type: 'string',
        sample: blocks.map(b => b.blockName || 'unknown')
      });
    }

    const mergedData = [];

    for (const block of blocks) {
      for (const row of block.data) {
        if (addBlockNameColumn) {
          mergedData.push([block.blockName || 'unknown', ...row]);
        } else {
          mergedData.push(row);
        }
      }
    }

    return {
      columns: baseColumns,
      data: mergedData
    };
  }

  /**
   * 清洗数据
   */
  cleanData(data) {
    const cleanedRows = data.filter(row => !this.isEmptyRow(row));

    if (cleanedRows.length === 0) {
      return [];
    }

    const columnCount = Math.max(...cleanedRows.map(row => row.length));
    const nonEmptyColumns = [];

    for (let col = 0; col < columnCount; col++) {
      const hasValue = cleanedRows.some(row => 
        row[col] !== null && row[col] !== undefined && row[col] !== ''
      );

      if (hasValue) {
        nonEmptyColumns.push(col);
      }
    }

    return cleanedRows.map(row => 
      nonEmptyColumns.map(col => row[col])
    );
  }

  /**
   * 将长表数据转换为图表可用格式
   */
  transformForChart(longData, timeField, valueField, groupField) {
    const xData = [];
    const groupedData = new Map();

    for (const row of longData.data) {
      const timeValue = row[timeField];
      const value = row[valueField];
      const groupValue = groupField ? row[groupField] : 'default';

      if (!xData.includes(timeValue)) {
        xData.push(timeValue);
      }

      if (!groupedData.has(groupValue)) {
        groupedData.set(groupValue, new Map());
      }

      groupedData.get(groupValue).set(timeValue, value);
    }

    const yData = [];
    for (const [groupName, dataMap] of groupedData.entries()) {
      const seriesData = xData.map(time => dataMap.get(time) || null);
      yData.push({
        name: String(groupName),
        data: seriesData
      });
    }

    return { xData, yData };
  }

  // 辅助方法
  isEmptyRow(row) {
    if (!row || row.length === 0) return true;
    return row.every(cell => cell === null || cell === undefined || cell === '');
  }

  isYearColumn(column) {
    const name = String(column.name).trim();
    return /^\d{4}年?$/.test(name);
  }

  extractYear(columnName) {
    const match = columnName.match(/(\d{4})/);
    return match ? parseInt(match[1]) : 0;
  }
}

module.exports = {
  DataTransformer,
  dataTransformer: new DataTransformer()
};
