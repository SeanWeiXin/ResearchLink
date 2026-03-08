/**
 * 检查数据库中的实际数据
 */

const mongoose = require('mongoose');
const Upload = require('../models/Upload');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const upload = await Upload.findOne({
      'metadata.dataColumns': { $exists: true, $ne: [] }
    });
    
    if (!upload) {
      console.log('❌ 没有找到上传记录');
      return;
    }

    console.log(`📊 文件名：${upload.originalName}`);
    console.log(`📊 数据列数：${upload.metadata.dataColumns.length}\n`);
    
    if (upload.metadata.dataColumns.length > 0) {
      console.log('第一列数据:');
      console.log(JSON.stringify(upload.metadata.dataColumns[0], null, 2));
      console.log('\n');
      
      console.log('是否有 sheetName 字段:', !!upload.metadata.dataColumns[0].sheetName);
      console.log('是否有 sheet_name 字段:', !!upload.metadata.dataColumns[0].sheet_name);
      console.log('hasSheetName:', upload.metadata.dataColumns.some(col => col.sheetName || col.sheet_name));
    }

    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkData();
