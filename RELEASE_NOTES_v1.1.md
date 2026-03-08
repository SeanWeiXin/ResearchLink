# ResearchLink v1.1 版本发布说明

## 发布日期
2026-03-08

## 版本亮点
本次更新重点修复了数据预览和元数据编辑的核心问题，并新增了数据管理功能。

---

## 新增功能

### 1. 数据管理页面
- **访问路径**: `/data`
- **功能**: 查看所有已上传的数据集
- **特性**:
  - 搜索功能
  - 分页浏览
  - 数据预览
  - 删除管理（仅管理员）

### 2. 工作表切换预览
- 支持多工作表 Excel 文件的分离预览
- 点击不同工作表 Tab 查看对应数据
- 自动过滤，避免数据混乱

### 3. 元数据在线编辑
- 点击列名即可编辑
- 支持修改：数据名称、单位、来源
- 实时保存，即时生效

---

## Bug 修复

### 1. 工作表数据分离 ✅
**修复前**: 
- CPI 数据跑到存栏 sheet
- 储备数据在存栏 sheet 重复

**修复后**:
- 每个工作表显示正确的列
- 数据不重复、不遗漏

### 2. 元数据编辑 ✅
**修复前**:
- 点击编辑后立刻弹出"更新成功"
- 无法实际输入
- 修改后不保存

**修复后**:
- 点击后进入编辑模式
- 可正常输入
- Enter 保存生效

### 3. 跨 Sheet 列冲突 ✅
**修复前**:
- 修改 CPI 第 2 列会影响存栏第 2 列

**修复后**:
- 每个列独立标识
- 修改互不影响

---

## 技术改进

### 后端改进
1. **Python 解析器**: 添加 `sheet_name` 字段标记
2. **Node.js 客户端**: 双格式兼容（`sheetName` 和 `sheet_name`）
3. **MongoDB Schema**: 新增 `sheetName` 字段定义
4. **数据迁移**: 提供脚本修复历史数据

### 前端改进
1. **状态管理**: 简化编辑状态，避免冲突
2. **过滤逻辑**: 根据 `sheetName` 精确过滤
3. **复合键策略**: 使用 `sheetName + columnIndex` 确保唯一性
4. **用户体验**: 移除自动保存，改为 Enter 触发

---

## 文件变更

### 新增文件
- `client/src/pages/DataList.tsx` - 数据管理页面
- `server/scripts/fixSheetNameDirect.js` - 数据修复脚本
- `.trae/documents/VERSION_1.1_TECHNICAL_FIXES.md` - 技术文档

### 修改文件
**后端**:
- `server/models/Upload.js`
- `server/routes/uploads.js`
- `server/services/pythonExcelClient.js`
- `server/python_service/excel_parser.py`

**前端**:
- `client/src/pages/UploadPreview.tsx`
- `client/src/pages/Home.tsx`
- `client/src/api/uploads.ts`

---

## 升级步骤

### 对于现有用户

1. **备份数据**（可选但推荐）
   ```bash
   # 导出 MongoDB 数据
   mongodump --uri="mongodb://localhost:27017/researchlink"
   ```

2. **更新代码**
   ```bash
   git pull origin main
   ```

3. **运行数据修复脚本**
   ```bash
   cd server
   node scripts/fixSheetNameDirect.js
   ```

4. **重启服务**
   ```bash
   # 后端
   cd server
   npm run dev
   
   # 前端（新终端）
   cd client
   npm run dev
   ```

5. **验证**
   - 访问 http://localhost:5173
   - 上传包含多工作表的 Excel
   - 测试工作表切换
   - 测试元数据编辑

---

## 使用指南

### 1. 上传多工作表 Excel

1. 访问 `/upload` 页面
2. 上传包含多个工作表的 Excel 文件
3. 系统自动解析所有工作表

### 2. 预览和编辑元数据

1. 上传成功后跳转到预览页面
2. 点击顶部工作表 Tab 切换
3. 点击列名（数据名称/单位/来源）进行编辑
4. 按 Enter 键保存修改

### 3. 数据管理

1. 点击导航栏"数据管理"
2. 浏览所有已存储的数据集
3. 使用搜索功能快速查找
4. 点击"预览"查看数据详情

---

## 已知问题

1. **调试日志**: 代码中包含一些调试日志，将在下一版本清理
2. **Ant Design 警告**: Tabs.TabPane 已废弃但暂未替换（不影响功能）

---

## 下一版本计划 (v1.2)

- [ ] 图表创建功能优化
- [ ] 数据导出功能
- [ ] 批量操作支持
- [ ] 性能优化

---

## 技术支持

如有问题，请查看：
- 技术文档：`.trae/documents/VERSION_1.1_TECHNICAL_FIXES.md`
- 部署指南：`DEPLOYMENT_GUIDE.md`
- 使用指南：`USAGE_GUIDE.md`

---

## 版本信息

- **版本号**: v1.1
- **Git 标签**: `v1.1.0`
- **发布日期**: 2026-03-08
- **主要贡献**: 数据预览与元数据编辑修复
