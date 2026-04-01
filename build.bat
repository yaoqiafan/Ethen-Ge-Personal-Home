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

if exist "dist\web.config" (
    echo web.config 已存在，跳过创建。
) else (
    echo 正在生成 web.config...
    (
    echo ^<?xml version="1.0" encoding="UTF-8"?^>
    echo ^<configuration^>
    echo   ^<system.webServer^>
    echo     ^<rewrite^>
    echo       ^<rules^>
    echo         ^<rule name="Handle History Mode and custom routing" stopProcessing="true"^>
    echo           ^<match url="(.*)" /^>
    echo           ^<conditions logicalGrouping="MatchAll"^>
    echo             ^<add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /^>
    echo             ^<add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" /^>
    echo           ^</conditions^>
    echo           ^<action type="Rewrite" url="/" /^>
    echo         ^</rule^>
    echo       ^</rules^>
    echo     ^</rewrite^>
    echo   ^</system.webServer^>
    echo ^</configuration^>
    ) > "dist\web.config"
    echo web.config 创建成功！
)
echo.
echo ========================================
echo   全部构建完成！
echo   现在你可以直接把 "dist" 文件夹里的
echo   所有文件全部扔进 IIS 网站目录下了。
echo ========================================
:end
echo.
pause