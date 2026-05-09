@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   Stopless Lab - Preview Server
echo ========================================
echo.

rem -- Check if dist exists --
if not exist "dist\index.html" (
    echo [WARN] No dist build found.
    echo.
    choice /C YN /M "Build now before preview?"
    if !ERRORLEVEL! equ 2 (
        echo Preview cancelled.
        goto end
    )
    echo.
    echo Building...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Build failed, cannot start preview.
        goto end
    )
    echo [OK] Build completed.
    echo.
)

rem -- Start preview --
echo Starting Vite preview server...
echo (Press Ctrl+C to stop the server)
echo.

call npm run preview

:end
echo.
pause
