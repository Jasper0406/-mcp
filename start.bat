@echo off

echo 小智AI机器人音乐服务(MCP)启动脚本
echo ============================

REM 检查Node.js是否安装
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到Node.js环境
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo 检测到Node.js环境
echo 正在安装依赖...
npm install

if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo 创建音乐库目录
mkdir library 2>nul

echo 正在启动服务...
echo 服务地址: http://localhost:3000
echo 按 Ctrl+C 停止服务
node main.js