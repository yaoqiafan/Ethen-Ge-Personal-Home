@echo off
:: 强制进入脚本所在目录
cd /d %~dp0
:: 设置代码页为 UTF-8 以支持中文显示
chcp 65001 >nul

echo ========================================
echo   OpenClaw适配器 - 生产环境启动脚本
echo ========================================

:: 检查文件是否存在
if not exist complete-server.js (
    echo [错误] 找不到 complete-server.js
    pause
    exit
)

echo [5/5] 正在启动 OpenClaw 适配器...
node complete-server.js

if %errorlevel% neq 0 (
    echo.
    echo [错误] 进程异常退出，错误代码: %errorlevel%
    pause
)
pause