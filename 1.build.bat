@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   Stopless Lab - Build Script v2.1
echo ========================================
echo.

rem -- Record start time --
set START_TIME=%TIME%

rem ============================================
echo [1/4] Installing dependencies (npm install)...
echo.
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] npm install failed! Check your network or package.json.
    goto end
)
echo [OK] Dependencies installed.
echo.

rem ============================================
echo [2/4] TypeScript type check (vue-tsc)...
echo.
call npx vue-tsc --noEmit 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [WARN] Type check found issues, continuing build anyway...
)
echo.

rem ============================================
echo [3/4] Building production bundle (vite build)...
echo.
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Build failed! Check the error messages above.
    goto end
)
echo [OK] Build completed.
echo.

rem ============================================
echo [4/4] Copying IIS web.config...
if not exist "dist" (
    echo [ERROR] dist directory not found. Build may have failed.
    goto end
)

rem Vite 构建时已从 public\ 复制 web.config 到 dist\，此处再同步一份到根目录供本地预览
copy "dist\web.config" "web.config" >nul 2>&1

echo [OK] web.config ready (dist\ + root).

rem -- Record end time --
set END_TIME=%TIME%

echo.
echo ========================================
echo   BUILD SUCCESS
echo   Output: dist\
echo   Deploy: copy dist contents to IIS
echo   Preview: run 2.preview.bat
echo ========================================

:end
echo.
echo Start: %START_TIME%
echo End:   %END_TIME%
echo.
pause
