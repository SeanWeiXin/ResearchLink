import * as XLSX from 'xlsx';
import { Readable } from 'stream';

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
  detectedType?: string;
  sample: any[];
}

export interface ExcelData {
  sheets: string[];
  data: { [sheet: string]: any[][] };
  columns: { [sheet: string]: ColumnInfo[] };
  metadata: {
    rowCount: number;
    columnCount: number;
    isTimeSeries: boolean;
    timeSeriesFormat?: string;
    frequency?: string;
  };
}

// 检测值类型
function detectType(value: any): ColumnInfo['type'] {
  if (value === null || value === undefined || value === '') {
    return 'unknown';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (value instanceof Date) {
    return 'date';
  }

  if (typeof value === 'string') {
    // 检查是否为日期字符串
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // YYYY-MM-DD HH:mm:ss
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
    ];

    for (const pattern of datePatterns) {
      if (pattern.test(value)) {
        return 'date';
      }
    }

    // 检查是否为数字字符串
    if (!isNaN(Number(value))) {
      return 'number';
    }

    return 'string';
  }

  return 'unknown';
}

// 分析列信息
function analyzeColumn(column: any[]): ColumnInfo {
  const sample = column.slice(0, 5);
  const types = column.map(detectType).filter(t => t !== 'unknown');
  
  // 统计最常见的类型
  const typeCount: { [key: string]: number } = {};
  types.forEach(type => {
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
  const dominantType = sortedTypes[0]?.[0] as ColumnInfo['type'] || 'unknown';

  return {
    name: column[0] || 'Column',
    type: dominantType,
    detectedType: dominantType,
    sample
  };
}

// 检测时间序列
function detectTimeSeries(columns: ColumnInfo[]): { isTimeSeries: boolean; format?: string; frequency?: string } {
  const dateColumn = columns.find(col => col.type === 'date');
  
  if (!dateColumn) {
    return { isTimeSeries: false };
  }

  // 尝试检测时间序列格式
  const sample = dateColumn.sample.filter(v => v !== null && v !== undefined);
  if (sample.length === 0) {
    return { isTimeSeries: false };
  }

  // 简单的时间序列格式检测
  let format = 'unknown';
  const firstSample = String(sample[0]);
  
  if (/^\d{4}-\d{2}-\d{2}/.test(firstSample)) {
    format = 'YYYY-MM-DD';
  } else if (/^\d{4}\/\d{2}\/\d{2}/.test(firstSample)) {
    format = 'YYYY/MM/DD';
  } else if (/^\d{2}-\d{2}-\d{4}/.test(firstSample)) {
    format = 'DD-MM-YYYY';
  }

  // 检测频率（需要至少 2 个数据点）
  let frequency: string | undefined;
  if (sample.length >= 2) {
    frequency = detectFrequency(sample);
  }

  return {
    isTimeSeries: true,
    format,
    frequency
  };
}

// 检测时间序列频率
function detectFrequency(dates: any[]): string {
  if (dates.length < 2) return 'unknown';

  try {
    const dateObjects = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    if (dateObjects.length < 2) return 'unknown';

    // 计算平均间隔（毫秒）
    let totalInterval = 0;
    for (let i = 1; i < Math.min(dateObjects.length, 10); i++) {
      totalInterval += dateObjects[i].getTime() - dateObjects[i - 1].getTime();
    }
    const avgInterval = totalInterval / (Math.min(dateObjects.length, 10) - 1);

    // 判断频率
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;
    const yearMs = 365 * dayMs;

    if (avgInterval < dayMs * 1.5) {
      return 'daily';
    } else if (avgInterval < weekMs * 1.5) {
      return 'weekly';
    } else if (avgInterval < monthMs * 1.5) {
      return 'monthly';
    } else if (avgInterval < yearMs * 1.5) {
      return 'yearly';
    }

    return 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

// 处理 Excel 文件
export async function processExcelFile(buffer: Buffer): Promise<ExcelData> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  
  const sheets = workbook.SheetNames;
  const data: { [sheet: string]: any[][] } = {};
  const columns: { [sheet: string]: ColumnInfo[] } = {};

  // 处理每个工作表
  for (const sheetName of sheets) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    data[sheetName] = jsonData;

    // 分析列
    if (jsonData.length > 0) {
      const headers = jsonData[0];
      const columnInfos: ColumnInfo[] = [];

      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const columnData = jsonData.map(row => row[colIndex]);
        const columnInfo = analyzeColumn(columnData);
        columnInfo.name = headers[colIndex] || `Column ${colIndex + 1}`;
        columnInfos.push(columnInfo);
      }

      columns[sheetName] = columnInfos;
    }
  }

  // 使用第一个工作表检测时间序列
  const firstSheet = sheets[0];
  const timeSeriesInfo = detectTimeSeries(columns[firstSheet] || []);

  return {
    sheets,
    data,
    columns,
    metadata: {
      rowCount: data[firstSheet]?.length || 0,
      columnCount: columns[firstSheet]?.length || 0,
      ...timeSeriesInfo
    }
  };
}

// 将数据转换为图表可用的格式
export function transformDataForChart(
  excelData: ExcelData,
  sheetName: string,
  xColumn: number,
  yColumns: number[]
): { xData: any[]; yData: { name: string; data: any[] }[] } {
  const sheetData = excelData.data[sheetName];
  const columns = excelData.columns[sheetName];

  if (!sheetData || sheetData.length < 2) {
    throw new Error('数据不足');
  }

  const xData = sheetData.slice(1).map(row => row[xColumn]);
  const yData = yColumns.map(colIndex => ({
    name: columns[colIndex]?.name || `Series ${colIndex + 1}`,
    data: sheetData.slice(1).map(row => row[colIndex])
  }));

  return { xData, yData };
}
