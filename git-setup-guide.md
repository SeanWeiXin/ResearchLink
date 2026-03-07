# Git 安装和配置指南

## 第一步：安装 Git

### 方法 1：使用安装包（推荐）

1. 访问 Git 官网下载页面：
   https://git-scm.com/download/win

2. 下载最新版本的 Git for Windows

3. 运行安装程序，按照以下步骤操作：
   - 选择安装路径（默认即可）
   - 选择组件：勾选所有选项
   - 选择开始菜单文件夹（默认）
   - 选择默认编辑器：选择 VS Code 或其他你喜欢的编辑器
   - 配置 PATH 环境：选择 "Git from the command line and also from 3rd-party software"
   - 选择 SSH 客户端：默认即可
   - 配置 HTTPS 传输：默认即可
   - 配置行尾转换：选择 "Checkout Windows-style, commit Unix-style line endings"
   - 配置终端模拟器：选择 "Use MinTTY"
   - 其他选项保持默认

4. 完成安装后，重启 PowerShell

### 方法 2：使用 Winget（如果你已安装）

```powershell
winget install Git.Git
```

### 方法 3：使用 Chocolatey（如果你已安装）

```powershell
choco install git -y
```

## 第二步：验证安装

安装完成后，打开新的 PowerShell 窗口，运行：

```powershell
git --version
```

如果显示版本号（如 `git version 2.x.x`），说明安装成功。

## 第三步：配置 Git

运行以下命令配置你的用户名和邮箱：

```powershell
# 配置 GitHub 用户名
git config --global user.name "你的 GitHub 用户名"

# 配置 GitHub 邮箱
git config --global user.email "你的 GitHub 邮箱"

# 验证配置
git config --list
```

## 第四步：生成 SSH 密钥（可选，但推荐）

```powershell
# 生成 SSH 密钥
ssh-keygen -t ed25519 -C "你的 GitHub 邮箱"

# 按回车使用默认路径，然后设置密码（可选）

# 查看公钥内容
cat ~/.ssh/id_ed25519.pub

# 复制输出的内容，添加到 GitHub：
# 1. 访问 https://github.com/settings/keys
# 2. 点击 "New SSH key"
# 3. 粘贴公钥内容
# 4. 保存
```

## 第五步：测试 GitHub 连接

```powershell
# 测试 SSH 连接
ssh -T git@github.com

# 如果显示类似 "Hi username! You've successfully authenticated"，说明成功
```

## 常见问题

### 问题 1：PowerShell 提示权限错误

**解决方案**：以管理员身份运行 PowerShell

### 问题 2：Git 命令仍然无法识别

**解决方案**：
1. 重启 PowerShell
2. 如果还不行，手动添加 Git 到 PATH 环境变量：
   - 打开系统属性 -> 高级 -> 环境变量
   - 在系统变量中找到 Path
   - 添加 `C:\Program Files\Git\bin`

### 问题 3：下载速度慢

**解决方案**：使用国内镜像
- 清华大学镜像：https://mirrors.tuna.tsinghua.edu.cn/github-release/git-for-windows/

## 下一步

安装和配置完成后，运行以下命令继续部署：

```powershell
cd d:\ResearchLink
git init
git add .
git commit -m "Initial commit for deployment"
```

然后我们可以创建 GitHub 仓库并推送代码。
