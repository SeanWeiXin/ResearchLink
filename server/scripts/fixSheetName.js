/**
 * 修复脚本：为旧数据添加 sheetName 字段
 * 
 * 问题：旧版本的 dataColumns 没有 sheetName 字段
 * 解决：从 pythonAnalysis.sheets 中提取 sheet 信息并更新
 */

const mongoose = require('mongoose');
const Upload = require('../models/Upload');
require('dotenv').config();

async function fixSheetName() {
  try {
    // 连接 MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    // 获取所有包含 metadata.dataColumns 的上传记录
    const uploads = await Upload.find({
      'metadata.dataColumns': { $exists: true, $ne: [] }
    });

    console.log(`📊 找到 ${uploads.length} 个上传记录`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const upload of uploads) {
      try {
        const dataColumns = upload.metadata.dataColumns;
        
        // 检查是否已经有 sheetName 字段
        const hasSheetName = dataColumns.some(col => col.sheetName || col.sheet_name);
        
        if (hasSheetName) {
          console.log(`⏭️  跳过 ${upload.originalName} - 已有 sheetName 字段`);
          skippedCount++;
          continue;
        }

        // 从 pythonAnalysis 中提取 sheet 信息
        const pythonAnalysis = upload.metadata.pythonAnalysis;
        
        if (!pythonAnalysis || !pythonAnalysis.sheets) {
          console.log(`⚠️  跳过 ${upload.originalName} - 没有 pythonAnalysis.sheets`);
          skippedCount++;
          continue;
        }

        const sheets = pythonAnalysis.sheets;
        const sheetNames = Object.keys(sheets);
        
        console.log(`\n📝 处理：${upload.originalName}`);
        console.log(`   工作表：${sheetNames.join(', ')}`);
        console.log(`   列数：${dataColumns.length}`);

        // 如果有多个工作表，需要分配 sheetName
        if (sheetNames.length > 1) {
          // 计算每个 sheet 的列数
          const sheetColumnCounts = {};
          let totalColumns = 0;
          
          for (const sheetName of sheetNames) {
            const count = sheets[sheetName].columns?.length || 0;
            sheetColumnCounts[sheetName] = count;
            totalColumns += count;
          }

          // 按顺序为每个列分配 sheetName
          let columnIndex = 0;
          for (const sheetName of sheetNames) {
            const count = sheetColumnCounts[sheetName];
            
            for (let i = 0; i < count; i++) {
              if (dataColumns[columnIndex]) {
                dataColumns[columnIndex].sheetName = sheetName;
                dataColumns[columnIndex].sheet_name = sheetName;
                console.log(`   ✓ 列 ${columnIndex} -> ${sheetName}`);
                columnIndex++;
              }
            }
          }
        } else if (sheetNames.length === 1) {
          // 单个工作表，所有列都属于这个 sheet
          const sheetName = sheetNames[0];
          dataColumns.forEach(col => {
            col.sheetName = sheetName;
            col.sheet_name = sheetName;
          });
          console.log(`   ✓ 所有列 -> ${sheetName}`);
        }

        // 保存更新
        upload.metadata.dataColumns = dataColumns;
        await upload.save();
        
        console.log(`   ✅ 保存到数据库成功`);
        
        updatedCount++;
        console.log(`✅ 已更新：${upload.originalName}\n`);
        
      } catch (error) {
        console.error(`❌ 处理 ${upload.originalName} 失败:`, error.message);
      }
    }

    console.log('\n=================================');
    console.log('📊 修复完成');
    console.log(`✅ 已更新：${updatedCount} 个记录`);
    console.log(`⏭️  已跳过：${skippedCount} 个记录`);
    console.log('=================================\n');

    // 关闭连接
    await mongoose.connection.close();
    console.log('👋 MongoDB 连接已关闭');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

// 运行脚本
fixSheetName();
