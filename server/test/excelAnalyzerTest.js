/**
 * Excel 智能体快速测试脚本 (JavaScript 版本)
 * 
 * 使用方法：
 * node test/excelAnalyzerTest.js path/to/test.xlsx
 */

const fs = require('fs');
const path = require('path');
const { excelAnalyzer } = require('../services/excelAnalyzer');
const { dataTransformer } = require('../services/dataTransformer');
const { previewGenerator } = require('../services/previewGenerator');

async function testExcelAnalyzer(filePath) {
  console.log('\n========================================');
  console.log(`📊 开始测试 Excel 文件：${filePath}`);
  console.log('========================================\n');

  try {
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    console.log(`📁 文件大小：${(buffer.length / 1024).toFixed(2)} KB\n`);

    console.log('🔍 正在分析文件结构...');
    const analysisResult = await excelAnalyzer.analyze(buffer, filename);

    console.log('\n========================================');
    console.log('📋 分析结果概览');
    console.log('========================================');
    console.log(`总体置信度：${analysisResult.overallConfidence.toFixed(2)}%`);
    console.log(`工作表数量：${analysisResult.sheets.length}`);
    console.log(`推荐操作：${analysisResult.recommendations.length}`);

    for (let i = 0; i < analysisResult.sheets.length; i++) {
      const sheet = analysisResult.sheets[i];
      
      console.log(`\n----------------------------------------`);
      console.log(`📄 工作表 ${i + 1}: ${sheet.sheetName}`);
      console.log(`----------------------------------------`);
      console.log(`总行数：${sheet.totalRows}`);
      console.log(`总列数：${sheet.totalColumns}`);
      console.log(`数据类型：${sheet.dataType}`);
      console.log(`置信度：${sheet.confidence.toFixed(2)}%`);
      console.log(`数据块数量：${sheet.dataBlocks.length}`);

      if (sheet.metadataRows) {
        console.log(`\n元数据行：${sheet.metadataRows.start + 1} - ${sheet.metadataRows.end + 1}`);
      }

      for (let j = 0; j < sheet.dataBlocks.length; j++) {
        const block = sheet.dataBlocks[j];
        
        console.log(`\n  数据块 ${j + 1}:`);
        console.log(`  块名称：${block.blockName || '无'}`);
        console.log(`  位置：行 ${block.startRow + 1} - ${block.endRow + 1}`);
        console.log(`  列数：${block.columns.length}`);
        console.log(`  数据行数：${block.data.length}`);

        console.log(`\n  列详情:`);
        block.columns.forEach((col, idx) => {
          console.log(`    ${idx + 1}. ${col.name} (${col.type}${col.format ? `, ${col.format}` : ''})`);
        });

        const preview = previewGenerator.generateFromBlock(block, 5);
        console.log(`\n  数据质量评分：${preview.qualityScore}/100`);
        
        if (preview.previewData.length > 0) {
          console.log('\n  数据样本:');
          preview.previewData.forEach((row, idx) => {
            console.log(`    行${idx + 1}:`, JSON.stringify(row));
          });
        }
      }

      if (sheet.warnings.length > 0) {
        console.log(`\n⚠️  警告:`);
        sheet.warnings.forEach((warning, idx) => {
          console.log(`  ${idx + 1}. ${warning}`);
        });
      }
    }

    if (analysisResult.recommendations.length > 0) {
      console.log(`\n========================================`);
      console.log('💡 推荐操作');
      console.log('========================================');
      analysisResult.recommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.action}: ${rec.description}`);
      });
    }

    console.log('\n========================================');
    console.log('✅ 测试完成！');
    console.log('========================================\n');

    return analysisResult;

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    throw error;
  }
}

const testFilePath = process.argv[2];

if (!testFilePath) {
  console.log(`
用法：node test/excelAnalyzerTest.js <excel_file_path>

示例:
  node test/excelAnalyzerTest.js "./全球棉花.xlsx"
  node test/excelAnalyzerTest.js "C:/Users/Test/海外棉花月度数据 TTEB.xlsx"
`);
  process.exit(1);
}

if (!fs.existsSync(testFilePath)) {
  console.error(`错误：文件不存在 - ${testFilePath}`);
  process.exit(1);
}

testExcelAnalyzer(testFilePath)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
