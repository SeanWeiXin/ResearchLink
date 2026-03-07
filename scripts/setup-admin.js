/**
 * 管理员账户设置脚本（简化版）
 * 直接在 MongoDB 中修改用户角色
 */

const mongoose = require('mongoose');

async function setupAdmin() {
  try {
    // 连接 MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/researchlink';
    console.log('正在连接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ 已连接到 MongoDB\n');

    // 导入 User 模型
    const User = require('../server/models/User');

    // 获取所有用户
    const users = await User.find().select('username email role');
    
    console.log('当前系统中的用户：');
    console.log('─'.repeat(60));
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - 当前角色：${user.role}`);
    });
    console.log('─'.repeat(60));
    
    if (users.length === 0) {
      console.log('\n系统中还没有用户，请先注册一个账户');
      process.exit(0);
    }

    // 询问要设置为管理员的用户
    console.log('\n请输入要设置为管理员的用户编号（例如：1）');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('\n选择用户编号：', async (answer) => {
      try {
        const index = parseInt(answer) - 1;
        if (index < 0 || index >= users.length) {
          console.log('✗ 无效的选择');
          readline.close();
          return;
        }

        const user = users[index];
        
        // 更新为管理员
        user.role = 'admin';
        user.permissions.canUploadExcel = true;
        user.permissions.canCreateCharts = true;
        user.permissions.canPublishCharts = true;
        
        await user.save();

        console.log('\n✓ 成功设置管理员！');
        console.log(`  用户名：${user.username}`);
        console.log(`  邮箱：${user.email}`);
        console.log(`  新角色：${user.role} (维护者)`);
        console.log(`  权限：上传 Excel ✓ | 创建图表 ✓ | 发布图表 ✓`);
        console.log('\n🎉 现在可以访问 http://localhost:5173/admin 进行管理了！');
        
        readline.close();
      } catch (error) {
        console.error('✗ 错误:', error.message);
        readline.close();
      }
    });

  } catch (error) {
    console.error('✗ 连接错误:', error.message);
    console.log('\n请确保 MongoDB 正在运行');
    process.exit(1);
  }
}

setupAdmin();
