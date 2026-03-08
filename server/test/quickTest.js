/**
 * 简单测试脚本 - 测试 Excel 智能体
 */

const fs = require('fs');
const path = require('path');
const { excelAnalyzer } = require('../services/excelAnalyzer');

async function quickTest() {
  console.log('🚀 开始快速测试 Excel 智能体...\n');

  // 测试 1: 检查模块是否加载成功
  console.log('✅ 测试 1: 检查模块加载');
  console.log('excelAnalyzer 存在:', !!excelAnalyzer);
  console.log('analyze 方法存在:', typeof excelAnalyzer.analyze === 'function');
  console.log('✓ 模块加载成功\n');

  // 测试 2: 创建一个简单的测试数据
  console.log('✅ 测试 2: 创建测试数据');
  const XLSX = require('xlsx');
  
  // 创建测试数据
  const testData = [
    ['日期', '2021 年', '2022 年', '2023 年'],
    ['1 月', 100, 120, 130],
    ['2 月', 110, 125, 135],
    ['3 月', 115, 130, 140]
  ];

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(testData);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // 保存为 buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  console.log('测试数据创建成功');
  console.log('Buffer 大小:', buffer.length, 'bytes\n');

  // 测试 3: 分析测试数据
  console.log('✅ 测试 3: 分析测试数据');
  try {
    const result = await excelAnalyzer.analyze(buffer, 'test.xlsx');
    
    console.log('分析成功！');
    console.log('\n📊 分析结果:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('工作表数量:', result.sheets.length);
    console.log('总体置信度:', result.overallConfidence.toFixed(2) + '%');
    console.log('推荐操作:', result.recommendations.length);
    
    if (result.sheets[0]) {
      const sheet = result.sheets[0];
      console.log('\n📄 工作表 1 详情:');
      console.log('  名称:', sheet.sheetName);
      console.log('  行数:', sheet.totalRows);
      console.log('  列数:', sheet.totalColumns);
      console.log('  数据类型:', sheet.dataType);
      console.log('  置信度:', sheet.confidence.toFixed(2) + '%');
      console.log('  数据块数量:', sheet.dataBlocks.length);
      
      if (sheet.dataBlocks[0]) {
        const block = sheet.dataBlocks[0];
        console.log('\n  数据块 1:');
        console.log('    列信息:');
        block.columns.forEach((col, idx) => {
          console.log(`      ${idx + 1}. ${col.name} (${col.type}${col.format ? ', ' + col.format : ''})`);
        });
        console.log('    数据行数:', block.data.length);
      }
      
      if (sheet.warnings.length > 0) {
        console.log('\n  ⚠️  警告:');
        sheet.warnings.forEach((w, i) => console.log(`    ${i + 1}. ${w}`));
      }
    }
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 推荐操作:');
      result.recommendations.forEach((rec, idx) => {
        console.log(`  ${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.action}: ${rec.description}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 测试通过！\n');
    
    return true;
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    console.error(error.stack);
    return false;
  }
}

// 运行测试
quickTest()
  .then(success => {
    if (success) {
      console.log('🎉 所有测试通过！Excel 智能体工作正常。\n');
      process.exit(0);
    } else {
      console.log('❌ 测试失败。\n');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('❌ 测试异常:', err);
    process.exit(1);
  });
