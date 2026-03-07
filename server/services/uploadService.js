const fs = require('fs');
const { processExcelFile, transformDataForChart } = require('./excelProcessor');
const { analyzeDataWithAI, recommendChartConfig } = require('./aiAnalyzer');

// 处理上传的 Excel 文件
async function handleExcelUpload(filePath: string) {
  try {
    const buffer = fs.readFileSync(filePath);
    const excelData = await processExcelFile(buffer);
    const aiAnalysis = analyzeDataWithAI(excelData);
    const chartConfig = recommendChartConfig(excelData, aiAnalysis);

    return {
      success: true,
      data: {
        metadata: excelData.metadata,
        columns: excelData.columns,
        sheets: excelData.sheets,
        aiAnalysis,
        chartConfig
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  handleExcelUpload
};
