# 修复前端 UI 错误计划

## 问题描述

1. **Avatar 组件空字符串 src 警告**
   - 错误：`An empty string ("") was passed to the src attribute`
   - 位置：`Home.tsx` 和 `PostDetail.tsx` 中的 `<Avatar src={...}>`
   - 原因：当用户头像为空字符串时，Avatar 组件会接收到空字符串

2. **List 组件废弃警告**
   - 错误：`[antd: List] The List component is deprecated`
   - 位置：`PostDetail.tsx` 中使用 List 组件显示评论
   - 原因：Ant Design 新版本废弃了 List 组件

3. **Tag 组件未定义错误**
   - 错误：`ReferenceError: Tag is not defined`
   - 位置：`PostDetail.tsx:148` 和 `Home.tsx:153`
   - 原因：导入语句中缺少 `Tag` 组件

## 解决方案

### 1. 修复 Avatar 组件空字符串问题
- 修改所有 `<Avatar src={...}>` 为 `<Avatar src={... || undefined}>`
- 或者当 avatar 为空时使用 null：`<Avatar src={avatar || null}>`

### 2. 替换废弃的 List 组件
- 在 `PostDetail.tsx` 中使用 `Card + Space` 或 `Timeline` 组件替代 List
- 保持评论展示功能不变

### 3. 添加缺失的 Tag 导入
- 在 `PostDetail.tsx` 的 antd 导入中添加 `Tag`
- 在 `Home.tsx` 中确认 Tag 已正确导入

## 修改文件清单

1. `d:\ResearchLink\client\src\pages\PostDetail.tsx`
   - 添加 Tag 到导入语句
   - 修复 Avatar 组件的 src 属性
   - 替换 List 组件为 Card + Space 组合

2. `d:\ResearchLink\client\src\pages\Home.tsx`
   - 确认 Tag 已导入（已存在）
   - 修复 Avatar 组件的 src 属性

## 实施步骤

1. 修复 PostDetail.tsx 的 Tag 导入问题
2. 修复所有 Avatar 组件的空字符串问题
3. 替换 PostDetail.tsx 中的 List 组件
4. 验证修复效果
