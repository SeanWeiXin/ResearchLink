# Excel 数据读取功能重构 Spec

## Why
当前 Excel 读取功能几乎无法使用，主要问题是：
1. 上传后没有实际调用 Excel 解析服务，文件只是保存到磁盘，没有提取元数据
2. 数据预览功能显示"开发中..."，用户无法看到实际数据
3. 缺少对解析失败的处理和错误提示
4. 列类型检测逻辑不够准确，特别是日期和数字的识别

## What Changes
- **新增**：在上传 API 中集成 Excel 解析服务，上传时自动提取元数据
- **新增**：实现完整的数据预览功能，显示实际数据内容
- **新增**：添加解析错误处理和用户友好的错误提示
- **改进**：优化列类型检测算法，提高日期和数字识别准确率
- **改进**：支持更多日期格式和数字格式的检测
- **新增**：添加数据质量预检查，提前发现常见问题

## Impact
- 受影响的服务：`excelProcessor.ts`, `uploads.js`
- 受影响的前端组件：`UploadExcel.tsx`, `UploadPreview.tsx`
- 受影响的 API：`POST /api/uploads/excel`, `GET /api/uploads/:id`

## ADDED Requirements

### Requirement: 上传时自动解析
系统 SHALL 在文件上传成功后立即解析 Excel 文件，提取以下元数据：
- 工作表名称列表
- 每个工作表的列信息（列名、数据类型、样本数据）
- 总行数和列数
- 是否为时间序列数据

#### Scenario: 成功上传并解析
- **WHEN** 用户上传有效的 Excel 文件
- **THEN** 系统应在 30 秒内完成解析并返回元数据
- **THEN** 用户应能在预览页面看到数据结构

### Requirement: 数据预览功能
系统 SHALL 在预览页面显示实际的数据内容：
- 显示前 10-20 行数据作为预览
- 每列显示列名、数据类型标签
- 支持横向滚动查看所有列
- 对 null/undefined 值显示为"-"

#### Scenario: 查看数据预览
- **WHEN** 用户进入预览页面
- **THEN** 应能看到表格形式的数据预览
- **THEN** 应能清晰识别每列的类型

### Requirement: 错误处理
系统 SHALL 在解析失败时提供清晰的错误信息：
- 文件损坏或格式不正确
- 文件为空或没有有效数据
- 不支持的 Excel 版本

#### Scenario: 解析失败
- **WHEN** Excel 文件无法解析
- **THEN** 应返回具体的错误原因
- **THEN** 用户应能看到友好的错误提示

### Requirement: 改进的列类型检测
系统 SHALL 准确检测以下数据类型：
- **日期类型**：支持 YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, ISO 8601 等格式
- **数字类型**：支持整数、小数、百分比、科学计数法
- **布尔类型**：支持 true/false, 是/否等
- **字符串类型**：其他所有类型

#### Scenario: 类型检测
- **WHEN** 解析 Excel 文件
- **THEN** 应正确识别每列的主要数据类型
- **THEN** 对于混合类型列，应识别为占比最高的类型

## MODIFIED Requirements

### Requirement: 上传 API 响应
**原要求**：上传成功后只返回基本文件信息
**新要求**：上传成功后应返回完整的元数据信息，包括：
```json
{
  "upload": {
    "id": "...",
    "filename": "...",
    "status": "processed",
    "metadata": {
      "rowCount": 100,
      "columnCount": 5,
      "sheetNames": ["Sheet1"],
      "columns": [
        { "name": "日期", "type": "date" },
        { "name": "销售额", "type": "number" }
      ],
      "isTimeSeries": true,
      "timeSeriesFormat": "YYYY-MM-DD"
    }
  }
}
```

### Requirement: 预览页面数据加载
**原要求**：预览页面需要手动配置后才能看到数据
**新要求**：预览页面应在加载时自动显示数据预览表格，无需等待配置

## REMOVED Requirements

### Requirement: 手动触发解析
**原因**：上传后自动解析，无需手动触发
**迁移**：删除相关的手动解析按钮和 API
