@echo off
chcp 65001 >nul
echo ========================================
echo   启动本地预览服务器 (Vite Preview)
echo ========================================
echo.
echo 正在启动，请稍候...
echo (提示：预览过程中请不要关闭此窗口。)
echo (如需停止服务器，请在此窗口按 Ctrl + C)
echo.

call npm run preview

echo.
pause