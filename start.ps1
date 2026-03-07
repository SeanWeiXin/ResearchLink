# ResearchLink 快速启动脚本

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ResearchLink 启动脚本" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "检查 Node.js 安装..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误：未检测到 Node.js，请先安装 Node.js" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js 版本：$nodeVersion" -ForegroundColor Green
Write-Host ""

# 检查 MongoDB
Write-Host "检查 MongoDB 连接..." -ForegroundColor Yellow
# 这里可以添加 MongoDB 连接检查

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  启动后端服务器" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 启动后端
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; npm run dev"

Write-Host "后端服务器启动中..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  启动前端应用" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 启动前端
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; npm run dev"

Write-Host "前端应用启动中..." -ForegroundColor Yellow
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  启动完成！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "后端地址：http://localhost:5000" -ForegroundColor Cyan
Write-Host "前端地址：http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
