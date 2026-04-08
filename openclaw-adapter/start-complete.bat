@echo off
echo 启动OpenClaw完整适配器...
echo.

echo 检查Node.js...
node --version
if errorlevel 1 (
    echo 错误: Node.js未安装
    echo 请从 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)

echo.
echo 安装依赖（如果需要）...
npm install express cors ws
if errorlevel 1 (
    echo 警告: 依赖安装失败，尝试继续运行...
)

echo.
echo 启动完整适配器...
echo 包含所有PF API端点，支持前端所有功能
echo.

node complete-server.js

pause