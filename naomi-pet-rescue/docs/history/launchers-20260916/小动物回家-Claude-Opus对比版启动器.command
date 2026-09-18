#!/bin/bash
# ==============================================================================
# Naomi《小动物回家》Claude Opus 对比版启动器 — Claude Code (Claude Opus)
# 端口: 8791
# ==============================================================================

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="/Users/gemstone/Desktop/student-works/naomi-pet-rescue/coop-claude"

clear
echo "======================================================================"
echo "🤖 Naomi《小动物回家》Claude Opus 对比版服务启动中..."
echo "🛠️ 架构与独立实现：Claude Code (Claude Opus)"
echo "📡 端口: 8791"
echo "======================================================================"
echo ""

cd "$PROJECT_DIR" || exit 1

if [ ! -d node_modules ]; then
  echo "📦 首次启动，安装依赖..."
  npm install
fi

# 端口清理：如果上次运行未正常关闭导致 8791 被占用，自动释放
OLD_PID=$(lsof -ti :8791 2>/dev/null)
if [ -n "$OLD_PID" ]; then
    echo "🔄 检测到 8791 端口已被占用 (PID: $OLD_PID)，正在清理重置..."
    kill -9 $OLD_PID 2>/dev/null
    sleep 1
fi

# 获取真实物理 Wi-Fi 局域网 IP
LAN_IP=$(node -e "const { getIps } = require('./server/index.js'); const ips = getIps ? getIps() : []; process.stdout.write(ips.length > 0 ? ips[0].address : 'localhost');" 2>/dev/null || echo "localhost")
TARGET_URL="http://${LAN_IP}:8791"

(
    sleep 1.2
    open "$TARGET_URL"
) &

echo "🌐 正在为您自动打开浏览器: $TARGET_URL"
echo "🎯 单人模式直通: ${TARGET_URL}?solo=1"
echo "📱 请让两台 iPad 与此电脑连接同一物理 Wi-Fi (不走 Tailscale)"
echo "📷 拿起 iPad 系统相机扫描终端或网页中的二维码即可秒开！"
echo ""

node server/index.js
