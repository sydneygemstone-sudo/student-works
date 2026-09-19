#!/bin/bash

# ==============================================================================
# 🎮 Naomi《小动物回家》单人分饰两角测试 一键启动器
# 🤖 架构与迭代开发：Antigravity (Gemini 3.8 Flash)
# ==============================================================================

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="/Users/gemstone/Desktop/student-works/naomi-pet-rescue/coop"

clear
echo "======================================================================"
echo "🎯 Naomi《小动物回家》单人测试模式启动中..."
echo "🤖 架构与迭代开发：Antigravity (Gemini 3.8 Flash)"
echo "======================================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ [错误]: 未在系统中检测到 Node.js！"
    echo "按任意键退出..."
    read -n 1
    exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ [错误]: 未找到游戏目录: $PROJECT_DIR"
    read -n 1
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

OLD_PID=$(lsof -ti :8787 2>/dev/null)
if [ -n "$OLD_PID" ]; then
    echo "🔄 检测到 8787 端口已被占用 (PID: $OLD_PID)，正在清理重置..."
    kill -9 $OLD_PID 2>/dev/null
    sleep 1
fi

TARGET_URL="http://localhost:8787/naomi-pet-rescue/coop/?solo=1"

(
    sleep 1.2
    open "$TARGET_URL"
) &

echo "🌐 正在为您打开单人测试模式: $TARGET_URL"
echo "🕹️ 提示：进入后随时按 Tab 键在 🐻 小熊 与 🐰 小兔 之间切换视角！"
echo "⏩ 提示：点击屏幕上方“一键双方就绪·推进回合”可秒速推进测试回合！"
echo ""

node server/index.js
