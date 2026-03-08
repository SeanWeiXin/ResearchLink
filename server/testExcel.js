const fs = require('fs');
const { excelAnalyzer } = require('./services/excelAnalyzer');
const XLSX = require('xlsx');

// 创建测试数据
const testData = [
  ['日期', '2021 年', '2022 年', '2023 年'],
  ['1 月', 100, 120, 130],
  ['2 月', 110, 125, 135],
  ['3 月', 115, 130, 140]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(testData);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

console.log('🚀 开始测试 Excel 智能体...\n');

excelAnalyzer.analyze(buffer, 'test.xlsx')
  .then(result => {
    console.log('✅ 分析成功！');
    console.log('\n📊 结果:');
    console.log('工作表:', result.sheets.length);
    console.log('置信度:', result.overallConfidence.toFixed(2) + '%');
    console.log('数据类型:', result.sheets[0]?.dataType);
    console.log('数据块:', result.sheets[0]?.dataBlocks.length);
    console.log('列:', result.sheets[0]?.dataBlocks[0]?.columns.map(c => c.name).join(', '));
    console.log('\n🎉 测试通过！');
  })
  .catch(err => {
    console.error('❌ 测试失败:', err.message);
    console.error(err.stack);
  });
