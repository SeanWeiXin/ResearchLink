# 快速设置管理员权限指南

## 🎯 问题说明

当您第一次访问系统时，所有用户都是普通用户（探索者）角色，无法访问管理后台。

## ✅ 解决方案

### 方法一：使用快速权限管理（推荐）

1. **登录任意账户**
   - 访问 http://localhost:5173
   - 登录或注册一个账户

2. **进入权限管理页面**
   - 登录后，点击右上角的 **"权限管理"** 按钮
   - 或直接访问 http://localhost:5173/quick-admin

3. **设置管理员**
   - 在用户列表中找到要提升的用户
   - 点击"编辑"按钮
   - 将角色改为 **"维护者"**
   - 保存

4. **访问管理后台**
   - 退出并重新登录
   - 现在可以看到 **"管理后台"** 按钮
   - 访问 http://localhost:5173/admin

### 方法二：使用 MongoDB 命令

如果您有 MongoDB 访问权限，可以直接修改数据库：

```javascript
use('researchlink');

db.users.updateOne(
  { username: "你的用户名" },
  { 
    $set: { 
      role: "admin",
      "permissions.canUploadExcel": true,
      "permissions.canCreateCharts": true,
      "permissions.canPublishCharts": true
    }
  }
);
```

### 方法三：使用 MongoDB Compass

1. 打开 MongoDB Compass
2. 连接到 `researchlink` 数据库
3. 选择 `users` 集合
4. 找到您的用户文档
5. 点击"编辑文档"
6. 修改以下字段：
   ```json
   {
     "role": "admin",
     "permissions": {
       "canUploadExcel": true,
       "canCreateCharts": true,
       "canPublishCharts": true
     }
   }
   ```
7. 保存

## 📋 角色说明

| 角色 | 显示名称 | 权限 |
|------|---------|------|
| `user` | 探索者 | 基础用户功能 |
| `uploader` | 贡献者 | 可上传 Excel、创建图表 |
| `admin` | 维护者 | 所有权限，包括用户管理 |

## 🔒 安全说明

**注意**：为了便于初始设置，`/quick-admin` 页面临时对所有登录用户开放。

**建议在设置完管理员后**：
1. 打开 `server/routes/users.js`
2. 找到第 233-237 行和第 253-257 行
3. 取消注释权限检查代码
4. 重启后端服务器

```javascript
// 取消这些行的注释
if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '权限不足' });
}
```

## 🎉 完成设置后

设置完管理员后，您可以：

1. 访问管理后台：http://localhost:5173/admin
2. 管理所有用户权限
3. 授予其他用户上传/图表权限
4. 提升更多管理员

## ❓ 常见问题

### Q: 找不到"权限管理"按钮？
A: 确保您已经登录。登录后该按钮会显示在首页右上角。

### Q: 点击"权限管理"后显示空白？
A: 检查后端服务器是否正常运行（http://localhost:5000）。

### Q: 设置管理员后还是无法访问？
A: 退出并重新登录，让新的权限生效。

### Q: 可以设置多个管理员吗？
A: 可以！建议设置 2-3 个管理员以保证系统安全。

---

**祝您使用愉快！**
