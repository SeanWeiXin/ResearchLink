/**
 * Excel 智能体测试脚本
 * 
 * 用于测试 Excel 结构分析功能
 * 
 * 使用方法：
 * ts-node test/excelAnalyzerTest.ts path/to/test.xlsx
 */

import * as fs from 'fs';
import * as path from 'path';
import { excelAnalyzer } from '../services/excelAnalyzer';
import { dataTransformer } from '../services/dataTransformer';
import { previewGenerator } from '../services/previewGenerator';

async function testExcelAnalyzer(filePath: string) {
    console.log('\n========================================');
    console.log(`📊 开始测试 Excel 文件：${filePath}`);
    console.log('========================================\n');

    try {
        // 读取文件
        const buffer = fs.readFileSync(filePath);
        const filename = path.basename(filePath);

        console.log(`📁 文件大小：${(buffer.length / 1024).toFixed(2)} KB\n`);

        // 分析文件
        console.log('🔍 正在分析文件结构...');
        const analysisResult = await excelAnalyzer.analyze(buffer, filename);

        // 输出分析结果
        console.log('\n========================================');
        console.log('📋 分析结果概览');
        console.log('========================================');
        console.log(`总体置信度：${analysisResult.overallConfidence.toFixed(2)}%`);
        console.log(`工作表数量：${analysisResult.sheets.length}`);
        console.log(`推荐操作：${analysisResult.recommendations.length}`);

        // 详细输出每个工作表
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

            // 元数据信息
            if (sheet.metadataRows) {
                console.log(`\n元数据行：${sheet.metadataRows.start + 1} - ${sheet.metadataRows.end + 1}`);
                console.log('元数据内容:', JSON.stringify(sheet.metadataRows.data, null, 2));
            }

            // 输出每个数据块
            for (let j = 0; j < sheet.dataBlocks.length; j++) {
                const block = sheet.dataBlocks[j];
                
                console.log(`\n  数据块 ${j + 1}:`);
                console.log(`  块名称：${block.blockName || '无'}`);
                console.log(`  位置：行 ${block.startRow + 1} - ${block.endRow + 1}`);
                console.log(`  表头行：${block.headerRows.map(r => r + 1).join(', ')}`);
                console.log(`  列数：${block.columns.length}`);
                console.log(`  数据行数：${block.data.length}`);

                // 列信息
                console.log(`\n  列详情:`);
                block.columns.forEach((col, idx) => {
                    console.log(`    ${idx + 1}. ${col.name} (${col.type}${col.format ? `, ${col.format}` : ''})`);
                });

                // 预览数据
                console.log(`\n  前 5 行预览:`);
                const preview = previewGenerator.generateFromBlock(block, 5);
                console.log(`  数据质量评分：${preview.qualityScore}/100`);
                console.log(`  空值数量：${preview.statistics?.nullCount}`);
                console.log(`  重复行数量：${preview.statistics?.duplicateCount}`);
                
                if (preview.previewData.length > 0) {
                    console.log('\n  数据样本:');
                    preview.previewData.forEach((row, idx) => {
                        console.log(`    行${idx + 1}:`, JSON.stringify(row));
                    });
                }
            }

            // 警告信息
            if (sheet.warnings.length > 0) {
                console.log(`\n⚠️  警告:`);
                sheet.warnings.forEach((warning, idx) => {
                    console.log(`  ${idx + 1}. ${warning}`);
                });
            }
        }

        // 推荐操作
        if (analysisResult.recommendations.length > 0) {
            console.log(`\n========================================`);
            console.log('💡 推荐操作');
            console.log('========================================');
            analysisResult.recommendations.forEach((rec, idx) => {
                console.log(`${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.action}: ${rec.description}`);
            });
        }

        // 测试数据转换（如果有年份列）
        const firstSheet = analysisResult.sheets[0];
        if (firstSheet && firstSheet.dataBlocks.length > 0) {
            const firstBlock = firstSheet.dataBlocks[0];
            const yearColumns = firstBlock.columns.filter(col => 
                /^\d{4}年?$/.test(col.name)
            );

            if (yearColumns.length > 0 && firstBlock.columns.length > 1) {
                console.log(`\n========================================`);
                console.log('🔄 测试宽表转长表转换');
                console.log('========================================');
                
                const idColumn = firstBlock.columns.find(col => 
                    col.type === 'string' && !/^\d{4}年?$/.test(col.name)
                );

                if (idColumn) {
                    console.log(`标识列：${idColumn.name}`);
                    console.log(`年份列：${yearColumns.map(c => c.name).join(', ')}`);

                    try {
                        const longData = dataTransformer.unpivot(
                            firstBlock,
                            [idColumn.name],
                            yearColumns.map(c => c.name)
                        );

                        console.log(`\n转换结果:`);
                        console.log(`  维度：${longData.dimensions.join(', ')}`);
                        console.log(`  时间维度：${longData.timeDimension}`);
                        console.log(`  值维度：${longData.valueDimension}`);
                        console.log(`  转换后行数：${longData.data.length}`);

                        console.log(`\n  转换后前 5 行:`);
                        longData.data.slice(0, 5).forEach((row, idx) => {
                            console.log(`    行${idx + 1}:`, JSON.stringify(row));
                        });
                    } catch (err: any) {
                        console.log(`转换失败：${err.message}`);
                    }
                }
            }
        }

        console.log('\n========================================');
        console.log('✅ 测试完成！');
        console.log('========================================\n');

        return analysisResult;

    } catch (error: any) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// 主函数
const testFilePath = process.argv[2];

if (!testFilePath) {
    console.log(`
用法：ts-node test/excelAnalyzerTest.ts <excel_file_path>

示例:
  ts-node test/excelAnalyzerTest.ts ./test.xlsx
  ts-node test/excelAnalyzerTest.ts "C:/Users/Test/全球棉花.xlsx"
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
