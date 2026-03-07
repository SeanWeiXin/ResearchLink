import { ColumnInfo, ExcelData } from './excelProcessor';

export interface AIAnalysisResult {
  confidence: number;
  suggestions: {
    timeColumn?: number;
    valueColumns?: number[];
    chartType?: string;
    transformations?: string[];
  };
  dataQuality: {
    score: number;
    issues: string[];
  };
}

// 简单的规则引擎来模拟 AI 分析
// 在实际生产环境中，这里应该调用 Python ML 服务
export function analyzeDataWithAI(excelData: ExcelData): AIAnalysisResult {
  const suggestions: AIAnalysisResult['suggestions'] = {};
  const issues: string[] = [];
  let confidence = 0.5;
  let qualityScore = 100;

  const firstSheet = excelData.sheets[0];
  const columns = excelData.columns[firstSheet];

  if (!columns || columns.length === 0) {
    return {
      confidence: 0,
      suggestions: {},
      dataQuality: { score: 0, issues: ['没有检测到数据'] }
    };
  }

  // 检测时间列
  const dateColumnIndex = columns.findIndex(col => col.type === 'date');
  if (dateColumnIndex !== -1) {
    suggestions.timeColumn = dateColumnIndex;
    confidence += 0.2;
    
    if (excelData.metadata.isTimeSeries) {
      confidence += 0.1;
      suggestions.chartType = 'line'; // 时间序列推荐折线图
    }
  }

  // 检测数值列
  const valueColumns = columns
    .map((col, index) => ({ col, index }))
    .filter(item => item.col.type === 'number' && item.index !== dateColumnIndex)
    .map(item => item.index);

  if (valueColumns.length > 0) {
    suggestions.valueColumns = valueColumns;
    confidence += 0.1;
  }

  // 数据质量检查
  columns.forEach((col, index) => {
    const nullCount = col.sample.filter(v => v === null || v === undefined || v === '').length;
    const nullRatio = nullCount / col.sample.length;

    if (nullRatio > 0.5) {
      issues.push(`列 "${col.name}" 超过 50% 的数据为空`);
      qualityScore -= 20;
    } else if (nullRatio > 0.2) {
      issues.push(`列 "${col.name}" 有较多空值 (${(nullRatio * 100).toFixed(1)}%)`);
      qualityScore -= 10;
    }

    // 检测列名是否规范
    if (!col.name || col.name === `Column ${index + 1}`) {
      issues.push(`列 ${index + 1} 缺少有意义的列名`);
      qualityScore -= 5;
    }
  });

  // 检测数据量
  if (excelData.metadata.rowCount < 10) {
    issues.push('数据量较少，可能影响分析准确性');
    qualityScore -= 15;
  }

  // 推荐图表类型
  if (!suggestions.chartType) {
    if (valueColumns.length === 1) {
      suggestions.chartType = excelData.metadata.isTimeSeries ? 'line' : 'bar';
    } else if (valueColumns.length > 1) {
      suggestions.chartType = 'line';
    } else {
      suggestions.chartType = 'bar';
    }
  }

  // 推荐转换
  const transformations: string[] = [];
  if (excelData.metadata.isTimeSeries && excelData.metadata.frequency === 'daily') {
    transformations.push('aggregate:monthly');
  }

  if (issues.length > 0) {
    transformations.push('clean:missing-values');
  }

  suggestions.transformations = transformations;

  return {
    confidence: Math.min(confidence, 1.0),
    suggestions,
    dataQuality: {
      score: Math.max(qualityScore, 0),
      issues
    }
  };
}

// 推荐图表配置
export function recommendChartConfig(
  excelData: ExcelData,
  analysis: AIAnalysisResult
): any {
  const firstSheet = excelData.sheets[0];
  const columns = excelData.columns[firstSheet];
  const { timeColumn, valueColumns, chartType } = analysis.suggestions;

  const config = {
    xAxis: {
      column: timeColumn !== undefined ? columns[timeColumn].name : columns[0].name,
      type: timeColumn !== undefined ? 'time' : 'category'
    },
    yAxis: (valueColumns || [0]).map(idx => ({
      column: columns[idx].name,
      type: 'value'
    })),
    chartType: chartType || 'line',
    options: {
      title: `数据可视化 - ${firstSheet}`,
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: (valueColumns || []).map(idx => columns[idx].name)
      }
    }
  };

  return config;
}
