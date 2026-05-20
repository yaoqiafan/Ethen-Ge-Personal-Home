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
echo [4/4] Generating IIS web.config...
if not exist "dist" (
    echo [ERROR] dist directory not found. Build may have failed.
    goto end
)

if exist "dist\web.config" del "dist\web.config"
if exist "web.config" del "web.config"

set WEBCONFIG_CONTENT=^<?xml version="1.0" encoding="UTF-8"?^>

(
echo ^<?xml version="1.0" encoding="UTF-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<allowedServerVariables^>
echo         ^<add name="HTTP_AUTHORIZATION" /^>
echo         ^<add name="HTTP_UPGRADE" /^>
echo         ^<add name="HTTP_CONNECTION" /^>
echo       ^</allowedServerVariables^>
echo       ^<rules^>
echo.
echo         ^<!-- BaGet NuGet Proxy --^>
echo         ^<rule name="BaGet Proxy" stopProcessing="true"^>
echo           ^<match url="^^nuget/?(.*)" /^>
echo           ^<action type="Rewrite" url="http://101.43.39.163:8081/{R:1}" /^>
echo         ^</rule^>
echo.
echo         ^<!-- OpenClaw Gateway AI Proxy --^>
echo         ^<rule name="OpenClaw Gateway API Proxy" stopProcessing="true"^>
echo           ^<match url="^^api/ai/(.*)" /^>
echo           ^<serverVariables^>
echo             ^<set name="HTTP_AUTHORIZATION" value="Bearer d6b3b76d798363c11793033e60a71ccc819242716b002149" /^>
echo           ^</serverVariables^>
echo           ^<action type="Rewrite" url="http://127.0.0.1:18789/v1/{R:1}" /^>
echo         ^</rule^>
echo.
echo         ^<!-- Kitchen API Proxy --^>
echo         ^<rule name="Kitchen API Proxy" stopProcessing="true"^>
echo           ^<match url="^^api/kitchen/(.*)" /^>
echo           ^<action type="Rewrite" url="http://localhost:3004/{R:1}" /^>
echo         ^</rule^>
echo.
echo         ^<!-- PF WebSocket Adapter Proxy (must be before PF API to avoid being swallowed) --^>
echo         ^<rule name="PF WebSocket Proxy" stopProcessing="true"^>
echo           ^<match url="^^api/v1/ws" /^>
echo           ^<serverVariables^>
echo             ^<set name="HTTP_UPGRADE" value="{HTTP_UPGRADE}" /^>
echo             ^<set name="HTTP_CONNECTION" value="{HTTP_CONNECTION}" /^>
echo           ^</serverVariables^>
echo           ^<action type="Rewrite" url="http://localhost:3002" /^>
echo         ^</rule^>
echo.
echo         ^<!-- PF API Adapter Proxy (HTTP) --^>
echo         ^<rule name="PF API Proxy" stopProcessing="true"^>
echo           ^<match url="^^api/v1/(.*)" /^>
echo           ^<action type="Rewrite" url="http://localhost:3001/api/v1/{R:1}" /^>
echo         ^</rule^>
echo.
echo         ^<!-- Vue Router History Mode Fallback --^>
echo         ^<rule name="Vue History Mode" stopProcessing="true"^>
echo           ^<match url="(.*)" /^>
echo           ^<conditions logicalGrouping="MatchAll"^>
echo             ^<add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /^>
echo             ^<add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" /^>
echo           ^</conditions^>
echo           ^<action type="Rewrite" url="/" /^>
echo         ^</rule^>
echo.
echo       ^</rules^>
echo     ^</rewrite^>
echo     ^<httpProtocol^>
echo       ^<customHeaders^>
echo         ^<remove name="X-Powered-By" /^>
echo         ^<add name="X-Frame-Options" value="SAMEORIGIN" /^>
echo         ^<add name="X-Content-Type-Options" value="nosniff" /^>
echo       ^</customHeaders^>
echo     ^</httpProtocol^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > "web.config"

copy "web.config" "dist\web.config" >nul

echo [OK] web.config generated (root + dist\).

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
