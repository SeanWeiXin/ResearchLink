# ResearchLink v1.1 技术修复文档

## 版本信息
- **版本号**: v1.1
- **发布日期**: 2026-03-08
- **主要改进**: 数据预览、元数据编辑、工作表分离、数据管理

---

## 修复内容总览

### 1. 工作表数据分离问题 ✅
### 2. 元数据编辑功能完善 ✅
### 3. 数据管理页面实现 ✅
### 4. 跨 Sheet 列冲突修复 ✅
### 5. Schema 验证问题修复 ✅

---

## 详细修复内容

### 1. 工作表数据分离问题

#### 问题描述
- CPI sheet 的数据跑到存栏 sheet
- 储备 sheet 的内容在存栏 sheet 里重复
- 数据预览显示混乱

#### 根本原因
1. 后端解析时未标记每个列所属的工作表
2. 前端使用简单的平均分配策略，假设每个 sheet 列数相同
3. MongoDB Schema 缺少 `sheetName` 字段定义

#### 解决方案

**后端修复 1**: Python 解析器添加 sheet_name 标记
```python
# server/python_service/excel_parser.py (line 599)
col_meta = {
    "column_index": col_idx,
    "sheet_name": sheet_name,  # 添加工作表名称
    "original_name": "",
    "display_name": "",
    # ... 其他字段
}
```

**后端修复 2**: Node.js 客户端转换为双格式
```javascript
// server/services/pythonExcelClient.js (line 127-133)
for (const col of sheetData.columns) {
  allDataColumns.push({
    ...col,
    sheetName: sheetName,      // 驼峰格式（Node.js 风格）
    sheet_name: sheetName      // 蛇形格式（Python 风格，向后兼容）
  });
}
```

**后端修复 3**: 存储到 MongoDB 时保留 sheetName
```javascript
// server/routes/uploads.js (line 210-212)
dataColumns: analysisResult.dataColumns.map(col => ({
    columnIndex: col.column_index,
    sheetName: col.sheet_name, // 添加工作表名称
    originalName: col.original_name,
    // ... 其他字段
}))
```

**后端修复 4**: 更新 MongoDB Schema
```javascript
// server/models/Upload.js (line 32-34)
dataColumns: [{
    columnIndex: Number,
    sheetName: String, // 工作表名称（新增）
    sheet_name: String, // 兼容 Python 格式
    // ... 其他字段
}]
```

**前端修复**: 根据 sheetName 过滤数据
```typescript
// client/src/pages/UploadPreview.tsx
const getCurrentSheetColumns = useMemo(() => {
  if (!upload?.metadata?.dataColumns) return [];
  
  if (!upload.metadata.sheetNames || upload.metadata.sheetNames.length <= 1) {
    return upload.metadata.dataColumns;
  }
  
  const filtered = upload.metadata.dataColumns.filter(col => {
    const colSheetName = col.sheetName || col.sheet_name;
    return colSheetName === selectedSheet;
  });
  
  return filtered.length === 0 ? upload.metadata.dataColumns : filtered;
}, [upload?.metadata?.dataColumns, upload?.metadata?.sheetNames, selectedSheet]);
```

**数据修复脚本**: 为旧数据添加 sheetName
```javascript
// server/scripts/fixSheetNameDirect.js
// 使用 MongoDB bulkWrite 强制更新所有历史记录
```

---

### 2. 元数据编辑功能完善

#### 问题描述
- 点击编辑按钮后还没来得及输入就弹出"元数据更新成功"
- 修改后不会保存
- 大部分修改区域无法点击

#### 根本原因
1. 编辑状态管理过于复杂，使用对象导致状态冲突
2. 保存成功后未清除编辑状态
3. Input 组件的 onBlur 事件触发重复保存
4. 跨 Sheet 列冲突（相同 columnIndex 导致修改多个列）

#### 解决方案

**修复 1**: 简化编辑状态管理
```typescript
// client/src/pages/UploadPreview.tsx
const [editingKey, setEditingKey] = useState<string | null>(null);
const [editValue, setEditValue] = useState<string>('');
const [editField, setEditField] = useState<string>('');
```

**修复 2**: 使用复合 key 唯一标识每个字段
```typescript
const handleEditClick = (record: any, field: string, currentValue: string) => {
  const key = `${record.sheetName || record.sheet_name || 'unknown'}-${record.columnIndex ?? record.column_index ?? 0}-${field}`;
  setEditingKey(key);
  setEditValue(currentValue || '');
  setEditField(field);
};
```

**修复 3**: 保存后清除编辑状态
```typescript
const handleSaveEdit = async (columnIndex: number, sheetName: string) => {
  if (!editingKey || !editField) return;
  
  await handleMetadataUpdate(columnIndex, sheetName, { [editField]: editValue });
  
  // 保存成功后清除编辑状态
  setEditingKey(null);
  setEditValue('');
  setEditField('');
};
```

**修复 4**: 移除 onBlur 避免重复保存
```typescript
<Input
  value={editValue}
  onChange={(e) => setEditValue(e.target.value)}
  onPressEnter={() => handleSaveEdit(columnIndex, sheetName)}
  autoFocus
/>
```

**修复 5**: 同时匹配 sheetName + columnIndex
```typescript
const handleMetadataUpdate = async (
  columnIndex: number, 
  sheetName: string, 
  updatedData: any
) => {
  const updatedColumns = upload.metadata.dataColumns.map(col => {
    const colSheetName = col.sheetName || col.sheet_name;
    const colIndex = col.columnIndex ?? col.column_index;
    
    // 同时匹配 sheetName 和 columnIndex
    if (colSheetName === sheetName && colIndex === columnIndex) {
      return { ...col, ...updatedData };
    }
    return col;
  });
  // ...
};
```

---

### 3. 数据管理页面实现

#### 功能特性
- 显示所有已上传的数据集
- 支持搜索和分页
- 预览、删除功能
- 权限控制（只有 admin 可以删除）

#### 核心文件
- `client/src/pages/DataList.tsx` - 数据列表页面
- `client/src/api/uploads.ts` - API 调用
- `server/routes/data.js` - 后端路由
- `server/services/dataStorage.js` - 数据存储

---

### 4. 跨 Sheet 列冲突修复

#### 问题描述
不同 sheet 的列索引相同（如 CPI 第 2 列和存栏第 2 列），修改一个会影响另一个。

#### 解决方案
- 修改所有匹配逻辑，同时使用 `sheetName + columnIndex` 作为唯一标识
- 前端 Table 的 rowKey 使用复合键：`${sheetName}-${colIndex}-${index}`

---

### 5. Schema 验证问题修复

#### 问题描述
MongoDB Schema 未定义 `sheetName` 字段，导致保存时被过滤。

#### 解决方案
更新 `server/models/Upload.js`：
```javascript
dataColumns: [{
    columnIndex: Number,
    sheetName: String,      // 新增
    sheet_name: String,     // 新增
    originalName: String,
    displayName: String,
    // ... 其他字段
}]
```

---

## 文件变更清单

### 后端文件
1. `server/models/Upload.js` - 添加 sheetName Schema
2. `server/routes/uploads.js` - 存储时保留 sheetName
3. `server/services/pythonExcelClient.js` - 转换双格式
4. `server/python_service/excel_parser.py` - 添加 sheet_name 标记
5. `server/scripts/fixSheetName.js` - 旧数据修复脚本
6. `server/scripts/fixSheetNameDirect.js` - 直接更新脚本

### 前端文件
1. `client/src/pages/UploadPreview.tsx` - 核心修复
2. `client/src/pages/DataList.tsx` - 新增数据管理页面
3. `client/src/pages/Home.tsx` - 添加导航入口
4. `client/src/api/uploads.ts` - 新增 API 方法

---

## 测试验证

### 测试场景 1：工作表数据分离
1. 上传包含 CPI、存栏、储备三个 sheet 的 Excel
2. 切换到 CPI sheet → 显示 10 列 CPI 数据 ✅
3. 切换到存栏 sheet → 显示 2 列存栏数据 ✅
4. 切换到储备 sheet → 显示 12 列储备数据 ✅

### 测试场景 2：元数据编辑
1. 点击任意列的"数据名称"字段 ✅
2. 输入框出现，可编辑 ✅
3. 按 Enter 保存 ✅
4. 修改生效 ✅
5. 不影响其他 sheet 的同索引列 ✅

### 测试场景 3：数据管理
1. 访问 `/data` 页面 ✅
2. 显示所有数据集 ✅
3. 搜索、分页正常 ✅
4. 预览跳转到正确 sheet ✅

---

## 技术亮点

1. **双格式兼容**: 同时支持 `sheetName` 和 `sheet_name` 两种命名
2. **复合键策略**: 使用 `sheetName + columnIndex` 确保唯一性
3. **数据迁移**: 提供脚本修复历史数据
4. **状态管理简化**: 分离编辑状态，避免冲突
5. **调试友好**: 添加详细日志便于问题定位

---

## 已知限制

1. 旧数据需要运行修复脚本才能添加 sheetName 字段
2. 前端代码中存在一些调试日志需要清理
3. Ant Design Tabs.TabPane 已废弃但暂未替换

---

## 部署步骤

1. 更新后端代码
2. 运行数据修复脚本：`node scripts/fixSheetNameDirect.js`
3. 重启后端服务
4. 前端热更新自动生效

---

## 版本历史

- **v1.0**: 初始版本
- **v1.1**: 数据预览与元数据编辑修复（本次更新）

---

## 贡献者

- 全栈开发团队
- 日期：2026-03-08
