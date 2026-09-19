#!/bin/bash

# ==============================================================================
# 🎮 Naomi《小动物回家》双 iPad 局域网联机 一键启动器
# 🤖 架构与迭代开发：Antigravity (Gemini 3.8 Flash)
# ==============================================================================

# 确保 GUI 双击启动时能找到 Homebrew / 系统的 Node.js
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="/Users/gemstone/Desktop/student-works/naomi-pet-rescue/coop"

clear
echo "======================================================================"
echo "🌲 Naomi《小动物回家》双 iPad 局域网联机服务启动中..."
echo "🤖 架构与迭代开发：Antigravity (Gemini 3.8 Flash)"
echo "======================================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ [错误]: 未在系统中检测到 Node.js！"
    echo "请确认 Node.js 已安装后重试。"
    echo "按任意键退出..."
    read -n 1
    exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ [错误]: 未找到游戏目录: $PROJECT_DIR"
    echo "按任意键退出..."
    read -n 1
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

# 端口清理：如果上次运行未正常关闭导致 8787 被占用，自动释放
OLD_PID=$(lsof -ti :8787 2>/dev/null)
if [ -n "$OLD_PID" ]; then
    echo "🔄 检测到 8787 端口已被占用 (PID: $OLD_PID)，正在清理重置..."
    kill -9 $OLD_PID 2>/dev/null
    sleep 1
fi

# 获取真实物理 Wi-Fi 局域网 IP（严格过滤排除 Tailscale / VPN / 100.*）
LAN_IP=$(node -e "const { getLanIps } = require('./server/index.js'); const ips = getLanIps(); process.stdout.write(ips.length > 0 ? ips[0].address : 'localhost');")
TARGET_URL="http://${LAN_IP}:8787/naomi-pet-rescue/coop/"

# 异步启动默认浏览器打开游戏（包含图形化二维码界面）
(
    sleep 1.2
    open "$TARGET_URL"
) &

echo "🌐 正在为您打开游戏主界面: $TARGET_URL"
echo "📱 请让两台 iPad 与此电脑连接同一物理 Wi-Fi (不走 Tailscale)"
echo "📷 直接拿起 iPad 系统相机扫描终端或网页中的二维码即可秒开！"
echo ""

# 启动 Node 局域网 WebSocket / HTTP 服务
node server/index.js
