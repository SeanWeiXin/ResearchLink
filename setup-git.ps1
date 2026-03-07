# Git 配置和初始化脚本

Write-Host "======================================"
Write-Host "ResearchLink Git 配置和初始化脚本"
Write-Host "======================================"
Write-Host ""

# Git 路径
$gitPath = "D:\Git\bin\git.exe"

# 检查 Git 是否安装
if (-not (Test-Path $gitPath)) {
    Write-Host "错误：未找到 Git 安装路径"
    Write-Host "请确认 Git 已安装到 D:\Git"
    exit 1
}

Write-Host "Git 已找到"
Write-Host ""

# 配置 Git 用户信息
Write-Host "正在配置 Git 用户信息..."
& $gitPath config --global user.name "SeanWeiXin"
& $gitPath config --global user.email "weixinsean@163.com"

Write-Host "Git 用户信息已配置"
Write-Host "  用户名：SeanWeiXin"
Write-Host "  邮箱：weixinsean@163.com"
Write-Host ""

# 检查是否已经是 Git 仓库
if (Test-Path ".git") {
    Write-Host "已经是 Git 仓库，跳过初始化"
} else {
    Write-Host "正在初始化 Git 仓库..."
    & $gitPath init
    Write-Host "Git 仓库初始化完成"
    Write-Host ""
}

# 添加 .gitignore 文件（如果不存在）
if (-not (Test-Path ".gitignore")) {
    Write-Host "正在创建 .gitignore 文件..."
    $lines = @(
        "# Node",
        "node_modules/",
        "npm-debug.log*",
        "yarn-debug.log*",
        "yarn-error.log*",
        "package-lock.json",
        "yarn.lock",
        "",
        "# Environment variables",
        ".env",
        ".env.local",
        ".env.development.local",
        ".env.test.local",
        ".env.production.local",
        "",
        "# Build outputs",
        "dist/",
        "build/",
        "*.local",
        "",
        "# Uploads",
        "uploads/",
        "*.xlsx",
        "*.xls",
        "*.csv",
        "",
        "# Logs",
        "logs/",
        "*.log",
        "",
        "# OS",
        ".DS_Store",
        "Thumbs.db",
        "desktop.ini",
        "",
        "# IDE",
        ".vscode/",
        ".idea/",
        "*.swp",
        "*.swo",
        "*~",
        "",
        "# Testing",
        "coverage/",
        ".nyc_output/",
        "",
        "# Temporary files",
        "tmp/",
        "temp/",
        ".cache/"
    )
    Set-Content -Path ".gitignore" -Value $lines
    Write-Host ".gitignore 文件已创建"
    Write-Host ""
} else {
    Write-Host ".gitignore 文件已存在"
    Write-Host ""
}

# 添加所有文件
Write-Host "正在添加文件到暂存区..."
& $gitPath add .
Write-Host "文件已添加"
Write-Host ""

# 查看将要提交的状态
Write-Host "当前 Git 状态:"
& $gitPath status --short
Write-Host ""

# 第一次提交
Write-Host "正在进行第一次提交..."
& $gitPath commit -m "Initial commit for deployment"
Write-Host "第一次提交完成"
Write-Host ""

# 重命名分支为 main
Write-Host "正在重命名分支为 main..."
& $gitPath branch -M main
Write-Host "分支已重命名为 main"
Write-Host ""

Write-Host "======================================"
Write-Host "Git 配置和初始化完成！"
Write-Host "======================================"
Write-Host ""
Write-Host "下一步操作："
Write-Host "1. 在 GitHub 上创建新仓库"
Write-Host "   访问：https://github.com/new"
Write-Host ""
Write-Host "2. 仓库名称填写：ResearchLink"
Write-Host "   设置为公开（Public）"
Write-Host "   不要初始化 README、.gitignore 或许可证"
Write-Host ""
Write-Host "3. 创建完成后，复制仓库地址，格式类似："
Write-Host "   https://github.com/SeanWeiXin/ResearchLink.git"
Write-Host ""
Write-Host "4. 然后运行推送脚本："
Write-Host "   push-to-github.ps1"
Write-Host ""
