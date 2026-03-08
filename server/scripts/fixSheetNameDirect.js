/**
 * 直接修复脚本：使用 MongoDB updateOne 强制更新
 */

const mongoose = require('mongoose');
const Upload = require('../models/Upload');
require('dotenv').config();

async function fixWithUpdateOne() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    const uploads = await Upload.find({
      'metadata.dataColumns': { $exists: true, $ne: [] }
    });

    console.log(`📊 找到 ${uploads.length} 个上传记录\n`);

    for (const upload of uploads) {
      const pythonAnalysis = upload.metadata.pythonAnalysis;
      
      if (!pythonAnalysis || !pythonAnalysis.sheets) {
        console.log(`️  跳过 ${upload.originalName} - 没有 pythonAnalysis.sheets`);
        continue;
      }

      const sheets = pythonAnalysis.sheets;
      const sheetNames = Object.keys(sheets);
      
      console.log(`📝 处理：${upload.originalName}`);
      console.log(`   工作表：${sheetNames.join(', ')}`);

      // 计算每个 sheet 的列数
      const sheetColumnCounts = {};
      for (const sheetName of sheetNames) {
        sheetColumnCounts[sheetName] = sheets[sheetName].columns?.length || 0;
      }

      // 构建更新操作
      const updateOps = [];
      let columnIndex = 0;
      
      for (const sheetName of sheetNames) {
        const count = sheetColumnCounts[sheetName];
        
        for (let i = 0; i < count; i++) {
          updateOps.push({
            updateOne: {
              filter: {
                _id: upload._id,
                'metadata.dataColumns': { $elemMatch: { columnIndex: columnIndex } }
              },
              update: {
                $set: {
                  'metadata.dataColumns.$[elem].sheetName': sheetName,
                  'metadata.dataColumns.$[elem].sheet_name': sheetName
                }
              },
              arrayFilters: [{ 'elem.columnIndex': columnIndex }]
            }
          });
          columnIndex++;
        }
      }

      // 执行批量更新
      if (updateOps.length > 0) {
        await Upload.collection.bulkWrite(updateOps);
        console.log(`   ✅ 已更新 ${updateOps.length} 列\n`);
      }
    }

    console.log('✅ 修复完成！');
    
    // 验证结果
    const testUpload = await Upload.findOne({
      'metadata.dataColumns': { $exists: true, $ne: [] }
    });
    
    if (testUpload && testUpload.metadata.dataColumns.length > 0) {
      console.log('\n📊 验证结果:');
      console.log('第一条数据列:', JSON.stringify(testUpload.metadata.dataColumns[0], null, 2));
      console.log('hasSheetName:', testUpload.metadata.dataColumns.some(col => col.sheetName || col.sheet_name));
    }

    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixWithUpdateOne();
