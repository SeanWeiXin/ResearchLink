# TypeScript 导入错误修复总结

## 问题描述
```
Uncaught SyntaxError: The requested module '/src/api/auth.ts?t=1772887811180' does not provide an export named 'User'
```

## 问题原因

在 TypeScript + Vite 项目中，当导入**纯类型**（interface、type）时，应该使用 `import type` 语法而不是普通的 `import`。

### 错误的导入方式
```typescript
// ❌ 错误 - User 是 interface，不是运行时值
import { User } from '../api/auth';
```

### 正确的导入方式
```typescript
// ✅ 正确 - 使用 type 导入
import type { User } from '../api/auth';
```

## 修复的文件

### 1. src/store/authStore.ts
**修复前：**
```typescript
import { User } from '../api/auth';
```

**修复后：**
```typescript
import type { User } from '../api/auth';
```

### 2. src/pages/Profile.tsx
**修复前：**
```typescript
import { getUserById, getUserPosts, updateProfile, changePassword, User } from '../api/auth';
```

**修复后：**
```typescript
import type { User } from '../api/auth';
import { getUserById, getUserPosts, updateProfile, changePassword } from '../api/auth';
```

## 为什么要使用 import type？

### 1. 类型 vs 值
- **TypeScript 类型**（interface、type）：只在编译时存在，运行时会被删除
- **运行时值**（函数、变量、类）：在运行时存在

### 2. Vite 的 ES 模块处理
Vite 使用原生 ES 模块，会严格检查导入/导出：
- 如果导入的类型在运行时不存在，会报错
- `import type` 告诉 Vite 这是纯类型导入，不需要运行时检查

### 3. 性能优化
- `import type` 不会被打包到最终代码中
- 减少 bundle 大小
- 提高编译速度

## TypeScript 导入最佳实践

### 导入类型
```typescript
// ✅ 接口
import type { User } from './api/auth';
import type { Post } from './api/posts';

// ✅ 类型别名
import type { AuthState } from './store/authStore';

// ✅ 多个类型
import type { User, Post, Comment } from './types';
```

### 导入值
```typescript
// ✅ 函数
import { login, register } from './api/auth';
import { getPosts } from './api/posts';

// ✅ 常量
import { API_BASE_URL } from './config';

// ✅ 类
import { apiClient } from './api/client';
```

### 混合导入
```typescript
// ✅ 类型和值分开导入
import type { User } from './api/auth';
import { login, register } from './api/auth';

// ❌ 不推荐混合在一起
import { User, login, register } from './api/auth';
```

## 常见错误场景

### 场景 1：导入 interface
```typescript
// ❌ 错误
import { User } from './types';

// ✅ 正确
import type { User } from './types';
```

### 场景 2：导入 type 别名
```typescript
// ❌ 错误
import { AuthState } from './store';

// ✅ 正确
import type { AuthState } from './store';
```

### 场景 3：导入枚举
```typescript
// ⚠️ 注意：enum 既是类型也是值
// 如果只使用类型
import type { Role } from './types';

// 如果需要使用枚举值
import { Role } from './types';
```

## 验证修复

### 检查清单
- [x] authStore.ts 使用 `import type`
- [x] Profile.tsx 分离类型和值导入
- [x] 浏览器控制台无错误
- [x] 页面正常渲染
- [x] TypeScript 编译通过

### 测试结果
- ✅ Vite 热更新成功
- ✅ 无导入错误
- ✅ 应用正常运行

## 经验总结

### 1. TypeScript + Vite 项目规则
**始终使用 `import type` 导入纯类型**

### 2. 如何识别类型
- `interface` 定义的是类型
- `type` 定义的是类型
- 泛型参数是类型
- Props 类型是类型

### 3. 自动化工具
可以使用 ESLint 规则强制要求：
```javascript
// .eslintrc.js
rules: {
  '@typescript-eslint/consistent-type-imports': ['error', {
    prefer: 'type-imports',
  }],
}
```

### 4. IDE 支持
VSCode + TypeScript 插件可以：
- 自动提示使用 `import type`
- 快速修复导入语句
- 显示导入的是类型还是值

## 相关资源

- [TypeScript 官方文档 - 类型导入](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
- [Vite 文档 - TypeScript](https://vitejs.dev/guide/features.html#typescript)
- [ESLint 规则 - consistent-type-imports](https://typescript-eslint.io/rules/consistent-type-imports/)

---

**修复时间**: 2026-03-07  
**修复状态**: ✅ 已完成  
**影响范围**: 2 个文件  
**验证状态**: ✅ 通过
