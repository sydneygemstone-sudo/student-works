#!/bin/bash
# Naomi《小动物回家》双 iPad 联机探索版 - Mac 双击一键启动脚本
# Developed by Antigravity (Gemini 3.8 Flash)

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "======================================================"
echo "🚀 正在拉起 Naomi《小动物回家》双 iPad 局域网联机服务..."
echo "🤖 技术支持：Antigravity (Gemini 3.8 Flash)"
echo "======================================================"

# 检查依赖与构建
if [ ! -d "node_modules" ]; then
  echo "📦 正在安装依赖..."
  npm install
fi

if [ ! -f "client/vendor/three.min.js" ]; then
  echo "🔨 准备本地 3D 依赖..."
  npm run build
fi

# 启动服务并在 2 秒后自动打开浏览器
(sleep 2 && open "http://localhost:8787/naomi-pet-rescue/coop/") &

node server/index.js
