# Tasks

- [ ] Task 1: 修改后端上传 API，集成 Excel 解析服务
  - [ ] Task 1.1: 在 `uploads.js` 的 POST /excel 路由中调用 `processExcelFile` 函数
  - [ ] Task 1.2: 将解析结果保存到 Upload 模型的 metadata 字段
  - [ ] Task 1.3: 更新上传状态为'processed'（如果解析成功）
  - [ ] Task 1.4: 在响应中返回完整的元数据信息
  - [ ] Task 1.5: 添加错误处理，解析失败时设置状态为'error'并保存错误信息

- [ ] Task 2: 改进 Excel 解析服务
  - [ ] Task 2.1: 增强日期格式检测，支持更多日期格式（如 YYYY.MM.DD, DD/MM/YYYY 等）
  - [ ] Task 2.2: 改进数字检测，支持百分比、科学计数法等格式
  - [ ] Task 2.3: 优化列类型统计算法，考虑更多样本数据
  - [ ] Task 2.4: 添加数据质量预检查（空行、空列检测）
  - [ ] Task 2.5: 处理边界情况（空工作表、只有标题行等）

- [ ] Task 3: 实现数据预览功能
  - [ ] Task 3.1: 修改 `UploadPreview.tsx`，显示实际数据表格
  - [ ] Task 3.2: 从后端 API 获取数据样本（前 20 行）
  - [ ] Task 3.3: 使用 Ant Design Table 组件渲染数据
  - [ ] Task 3.4: 为每列添加类型标签和格式化显示
  - [ ] Task 3.5: 处理空值和特殊值的显示

- [ ] Task 4: 增强错误处理和用户提示
  - [ ] Task 4.1: 在后端添加详细的错误信息（文件损坏、格式不支持等）
  - [ ] Task 4.2: 在前端显示友好的错误提示
  - [ ] Task 4.3: 提供重新上传或修复文件的建议
  - [ ] Task 4.4: 添加解析进度的后端支持（对于大文件）

- [ ] Task 5: 测试和验证
  - [ ] Task 5.1: 测试各种格式的 Excel 文件（.xlsx, .xls, .csv）
  - [ ] Task 5.2: 测试包含日期、数字、文本混合的复杂数据
  - [ ] Task 5.3: 测试边界情况（空文件、超大文件、损坏文件）
  - [ ] Task 5.4: 验证数据预览的正确性和性能

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 2, Task 3, Task 4]
