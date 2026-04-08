@echo off
chcp 65001 >nul
echo ========================================
echo   开始构建 Vue 3 前端项目
echo ========================================
echo.

echo [1/3] 正在安装依赖 (npm install)...
call npm install

echo.
echo [2/3] 正在编译打包 (npm run build)...
call npm run build

echo.
echo [3/3] 正在配置 IIS URL 重写规则...
if not exist "dist" (
    echo [错误] 未找到 dist 文件夹，打包可能失败了。
    goto end
)

if exist "dist\web.config" del "dist\web.config"
echo 正在生成最新配置的 web.config...
(
echo ^<?xml version="1.0" encoding="UTF-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<allowedServerVariables^>
echo         ^<add name="HTTP_AUTHORIZATION" /^>
echo       ^</allowedServerVariables^>
echo       ^<rules^>
echo.
echo         ^<!-- BaGet NuGet 服务代理 --^>
echo         ^<rule name="BaGet Proxy" stopProcessing="true"^>
echo           ^<match url="^^nuget/?(.*)" /^>
echo           ^<action type="Rewrite" url="http://101.43.39.163:8081/{R:1}" /^>
echo         ^</rule^>
echo.
echo         ^<!-- OpenClaw Gateway AI 接口代理（后端注入 Authorization，前端无需携带 Token） --^>
echo         ^<rule name="OpenClaw Gateway API Proxy" stopProcessing="true"^>
echo           ^<match url="^^api/ai/(.*)" /^>
echo           ^<serverVariables^>
echo             ^<set name="HTTP_AUTHORIZATION" value="Bearer d6b3b76d798363c11793033e60a71ccc819242716b002149" /^>
echo           ^</serverVariables^>
echo           ^<action type="Rewrite" url="http://127.0.0.1:18789/v1/{R:1}" /^>
echo         ^</rule^>
echo.
echo         ^<!-- Vue Router History Mode 兜底：非文件/目录请求一律回落到 index.html --^>
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
echo       ^</customHeaders^>
echo     ^</httpProtocol^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > "dist\web.config"
echo web.config 创建成功！

echo.
echo ========================================
echo   全部构建完成！
echo   现在你可以直接把 "dist" 文件夹里的
echo   所有文件全部扔进 IIS 网站目录下了。
echo ========================================
:end
echo.
pause
