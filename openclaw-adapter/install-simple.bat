@echo off
echo OpenClaw适配器简易安装脚本
echo ================================
echo.
echo 安装依赖包...
npm install

echo.
echo 创建启动脚本...
echo @echo off > start.bat
echo echo 启动OpenClaw适配器... >> start.bat
echo node server.js >> start.bat
echo pause >> start.bat

echo.
echo 创建环境配置文件...
echo VITE_PF_API_URL=http://localhost:3001/api/v1 > ..\.env.development
echo VITE_PF_WS_URL=ws://localhost:3002 >> ..\.env.development
echo. >> ..\.env.development
echo # 站点基础信息配置 >> ..\.env.development
echo VITE_ICP_NUMBER=苏ICP备2024123968号 >> ..\.env.development
echo VITE_PUBLIC_SECURITY_NUMBER=粤公网安备 44010602XXXXXX号 >> ..\.env.development
echo VITE_OWNER_NAME=葛刘楼 >> ..\.env.development

echo.
echo 安装完成！
echo.
echo 下一步：
echo 1. 运行 start.bat 启动适配器
echo 2. 在上级目录运行 npm run dev 启动Vue前端
echo 3. 访问 http://localhost:5173
echo.
pause