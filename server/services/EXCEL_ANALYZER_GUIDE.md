# Excel 结构分析智能体使用指南

## 📋 概述

Excel 结构分析智能体是专门为处理复杂格式 Excel 文件设计的 AI 驱动解析系统。

### 核心能力

- ✅ **智能表头检测**：支持多行表头、合并单元格、复杂层级
- ✅ **数据块分割**：自动识别空行分隔的多个独立数据区域
- ✅ **噪音过滤**：识别并跳过元数据行、汇总行、注释等
- ✅ **结构推断**：自动识别时间序列、面板数据、截面数据
- ✅ **宽表转长表**：智能转换年份列格式为标准化时间维度
- ✅ **置信度评估**：为每次解析生成 0-100% 的置信度评分

---

## 🚀 快速开始

### 1. 上传 Excel 文件

```typescript
import { uploadExcel } from './api/uploads';

const file = document.querySelector('input[type="file"]').files[0];
const result = await uploadExcel(file);

console.log(result.upload.metadata);
// {
//   rowCount: 60,
//   columnCount: 5,
//   dataType: 'panel_data',
//   confidence: 85,
//   columns: [...],
//   previewRows: [...],
//   warnings: ['检测到年份列，建议进行宽表转长表处理']
// }
```

### 2. 查看数据预览

上传成功后，系统会自动生成前 20 行数据预览：

```typescript
import { getUpload } from './api/uploads';

const upload = await getUpload(uploadId);
console.log(upload.metadata.previewRows);
// [
//   { "月份": "1 月", "2021 年": 100, "2022 年": 120, ... },
//   { "月份": "2 月", "2021 年": 110, "2022 年": 125, ... },
//   ...
// ]
```

### 3. 数据转换（可选）

如果检测到宽表格式，可以进行转换：

```typescript
import { dataTransformer } from './services/dataTransformer';

const longData = dataTransformer.unpivot(
  dataBlock,
  ['月份'],           // 标识列
  ['2021 年', '2022 年', '2023 年', '2024 年'], // 年份列
  'value'            // 值列名
);

console.log(longData.data);
// [
//   { "月份": "1 月", "year": 2021, "value": 100 },
//   { "月份": "1 月", "year": 2022, "value": 120 },
//   ...
// ]
```

---

## 📊 支持的 Excel 格式

### ✅ 完全支持

1. **标准时间序列**
   ```
   | 日期       | 销售额 | 成本 |
   |------------|--------|------|
   | 2024-01-01 | 1000   | 800  |
   | 2024-01-02 | 1200   | 900  |
   ```

2. **多行表头**
   ```
   | 公司年度报告              |
   | 2024 年销售数据           |
   | 日期 | 销售额 | 成本      |
   |------|--------|----------|
   | ...  | ...    | ...      |
   ```

3. **多数据块**
   ```
   | 巴基斯坦棉花进口 |
   | 2021 年 | 2022 年 |
   |-------|-------|
   | 1 月  | 100   | 120   |
   | ...   | ...   | ...   |
   
   | 印度棉花进口 |
   | 2021 年 | 2022 年 |
   |-------|-------|
   | 1 月  | 200   | 220   |
   ```

4. **宽表面板数据**
   ```
   | 国家 | 2021 年 | 2022 年 | 2023 年 |
   |------|--------|--------|--------|
   | 美国 | 100    | 120    | 130    |
   | 中国 | 200    | 220    | 230    |
   ```

5. **包含元数据**
   ```
   | 指标名称：市场年度棉花产量 |
   | 来源：USDA                |
   | 单位：百万包              |
   | 频率：月度                |
   | 国家 | 2023-01 | 2023-02 |
   |------|--------|--------|
   | 美国 | 15.2   | 15.5   |
   ```

### ⚠️ 部分支持（需要人工校正）

- 极度复杂的嵌套表格
- 跨工作表的公式引用
- 手写体或扫描版 Excel

---

## 🔍 智能体工作原理

### 分析流程

```
1. 读取 Excel 文件
   ↓
2. 检测元数据行（前 N 行的键值对）
   ↓
3. 识别数据块（基于空行分隔）
   ↓
4. 对每个数据块：
   - 检测表头（多行、合并单元格）
   - 提取列信息（列名、类型、格式）
   - 收集样本数据
   ↓
5. 推断数据结构类型
   ↓
6. 计算置信度评分
   ↓
7. 生成处理建议
   ↓
8. 生成数据预览
```

### 置信度评分维度

- **表头清晰度**（40%）：表头是否明确、是否有合并单元格
- **数据连续性**（30%）：是否有空行打断、数据密度
- **类型一致性**（20%）：每列数据类型是否统一
- **噪音比例**（10%）：非数据行的占比

---

## 📝 API 参考

### ExcelStructureAnalyzer

```typescript
interface AnalysisResult {
  filename: string;
  sheets: SheetAnalysis[];
  recommendations: Recommendation[];
  overallConfidence: number;
}

interface SheetAnalysis {
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  metadataRows?: { start: number; end: number; data: any };
  dataBlocks: DataBlock[];
  dataType: 'time_series' | 'panel_data' | 'cross_section' | 'custom';
  confidence: number;
  warnings: string[];
}

interface DataBlock {
  blockId: string;
  blockName?: string;
  startRow: number;
  endRow: number;
  headerRows: number[];
  columns: ColumnInfo[];
  data: any[][];
}

interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
  format?: string;
  sample: any[];
}
```

### DataTransformer

```typescript
// 宽表转长表
unpivot(
  block: DataBlock,
  idColumns: string[],      // 标识列
  valueColumns?: string[],  // 值列（自动检测年份列）
  valueColumnName: string   // 值列名
): LongFormatData

// 合并数据块
mergeBlocks(
  blocks: DataBlock[],
  addBlockNameColumn: boolean
): { columns: ColumnInfo[]; data: any[][] }
```

### PreviewGenerator

```typescript
// 生成预览
generateFromBlock(
  block: DataBlock,
  rowCount: number = 20
): PreviewResult

interface PreviewResult {
  previewData: any[];
  columns: Array<{ name: string; type: string; format?: string }>;
  statistics?: { rowCount: number; columnCount: number; nullCount?: number };
  qualityScore?: number;
}
```

---

## 🧪 测试

### 使用测试脚本

```bash
# 测试单个文件
ts-node test/excelAnalyzerTest.ts path/to/test.xlsx

# 示例
ts-node test/excelAnalyzerTest.ts "./全球棉花.xlsx"
```

### 测试输出示例

```
========================================
📊 开始测试 Excel 文件：全球棉花.xlsx
========================================

📁 文件大小：25.36 KB

🔍 正在分析文件结构...

========================================
📋 分析结果概览
========================================
总体置信度：85.50%
工作表数量：1
推荐操作：2

----------------------------------------
📄 工作表 1: Sheet1
----------------------------------------
总行数：65
总列数：5
数据类型：panel_data
置信度：85.50%
数据块数量：4

  数据块 1:
  块名称：巴基斯坦棉花进口
  位置：行 3 - 16
  表头行：1, 2
  列数：5
  数据行数：12
  ...
```

---

## 💡 最佳实践

### 1. 上传前检查

- ✅ 确保 Excel 文件没有密码保护
- ✅ 移除不必要的图表和图片
- ✅ 清理明显的格式错误

### 2. 处理复杂格式

- 如果置信度 < 70%，建议人工检查
- 对于多数据块，考虑拆分到不同工作表
- 对于宽表格式，建议使用 unpivot 转换

### 3. 性能优化

- 单个文件建议不超过 50MB
- 行数超过 10000 行时，考虑分批处理
- 使用预览功能先检查数据结构

---

## ❓ 常见问题

### Q: 置信度低怎么办？
A: 置信度低通常表示数据结构复杂或不规范。建议：
- 检查表头是否清晰
- 移除多余的空行和注释
- 确保数据类型一致

### Q: 如何处理多个数据块？
A: 系统会自动检测并分别处理每个数据块。您可以：
- 选择特定数据块进行处理
- 合并结构相似的数据块
- 分别导出为不同数据集

### Q: 宽表转长表失败？
A: 确保：
- 有明确的标识列（如国家、地区）
- 年份列格式统一（如 "2021", "2021 年"）
- 没有合并单元格干扰

---

## 📞 技术支持

如有问题或建议，请联系：
- Email: support@researchlink.com
- GitHub Issues: https://github.com/researchlink/excel-analyzer

---

## 📄 许可证

MIT License - ResearchLink Team
