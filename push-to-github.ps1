# 推送到 GitHub 脚本

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "ResearchLink 推送到 GitHub" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Git 路径
$gitPath = "D:\Git\bin\git.exe"

# 检查 Git 是否安装
if (-not (Test-Path $gitPath)) {
    Write-Host "错误：未找到 Git 安装路径" -ForegroundColor Red
    Write-Host "请确认 Git 已安装到 D:\Git" -ForegroundColor Yellow
    exit 1
}

# 输入 GitHub 仓库地址
Write-Host "请输入你的 GitHub 仓库地址：" -ForegroundColor Yellow
Write-Host "格式：https://github.com/SeanWeiXin/ResearchLink.git" -ForegroundColor Cyan
Write-Host ""
$repoUrl = Read-Host "仓库地址"

# 验证输入
if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "错误：仓库地址不能为空" -ForegroundColor Red
    exit 1
}

if (-not $repoUrl.StartsWith("https://github.com/")) {
    Write-Host "警告：仓库地址看起来不正确" -ForegroundColor Yellow
    $continue = Read-Host "是否继续？(y/n)"
    if ($continue -ne 'y') {
        exit 1
    }
}

Write-Host ""
Write-Host "正在添加远程仓库..." -ForegroundColor Yellow
& $gitPath remote remove origin 2>$null  # 忽略错误（如果不存在）
& $gitPath remote add origin $repoUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host "错误：添加远程仓库失败" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 远程仓库已添加" -ForegroundColor Green
Write-Host ""

Write-Host "正在推送到 GitHub..." -ForegroundColor Yellow
Write-Host "（首次推送可能需要输入 GitHub 用户名和密码）" -ForegroundColor Cyan
Write-Host ""

& $gitPath push -u origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "推送失败！" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. GitHub 用户名或密码错误" -ForegroundColor White
    Write-Host "2. 仓库不存在或没有权限" -ForegroundColor White
    Write-Host "3. 网络连接问题" -ForegroundColor White
    Write-Host ""
    Write-Host "解决方案：" -ForegroundColor Cyan
    Write-Host "1. 检查仓库地址是否正确" -ForegroundColor White
    Write-Host "2. 确保已在 GitHub 上创建仓库" -ForegroundColor White
    Write-Host "3. 使用 GitHub Personal Access Token 代替密码" -ForegroundColor White
    Write-Host "   创建 Token: https://github.com/settings/tokens" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🎉 推送成功！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "你的代码已经推送到 GitHub：" -ForegroundColor White
Write-Host "$repoUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. 访问你的 GitHub 仓库确认代码已上传" -ForegroundColor White
Write-Host "2. 准备开始部署 MongoDB Atlas 数据库" -ForegroundColor White
Write-Host ""
