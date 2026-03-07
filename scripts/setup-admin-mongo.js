// 在 MongoDB Shell 中运行的脚本
// 使用方法：mongosh < setup-admin.js

use('researchlink');

// 显示所有用户
print('\n========== 当前用户列表 ==========');
const users = db.users.find({}, { username: 1, email: 1, role: 1 });
users.forEach((user, i) => {
  print(`${i + 1}. ${user.username} (${user.email}) - 角色：${user.role}`);
});

print('\n===================================');
print('提示：请在 MongoDB Compass 中手动修改，或运行以下命令：');
print('');
print('db.users.updateOne(');
print('  { username: "你的用户名" },');
print('  { ');
print('    $set: { ');
print('      role: "admin",');
print('      "permissions.canUploadExcel": true,');
print('      "permissions.canCreateCharts": true,');
print('      "permissions.canPublishCharts": true');
print('    }');
print('  }');
print(');');
print('');
