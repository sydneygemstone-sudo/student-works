#!/bin/zsh
# 用法: qa/shot.sh <url-or-file> <out.png> [width] [height]
# 例:   qa/shot.sh "index.html?seed=1&auto=6" qa/shots/mid.png 1280 800
# 说明: headless Chrome 截图。Chrome 在本机写完图后会被更新器拖住不退出，
#       所以这里轮询输出文件，一出现就杀掉进程。控制台错误会打到 stderr 日志里。
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$1"; OUT="$2"; W="${3:-1280}"; H="${4:-800}"
case "$TARGET" in
  http://*|https://*|file://*) URL="$TARGET" ;;
  *) URL="file://$ROOT/$TARGET" ;;
esac
mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
PROFILE="${TMPDIR:-/tmp}/naomi-shot-profile-$$"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
  --disable-background-networking --disable-component-update --disable-sync --disable-extensions \
  --enable-logging=stderr --v=0 \
  --user-data-dir="$PROFILE" --window-size="${W},${H}" --virtual-time-budget=3000 \
  --screenshot="$OUT" "$URL" 2>"${OUT}.log" >/dev/null &
PID=$!
for i in {1..60}; do
  if [ -s "$OUT" ]; then sleep 0.5; break; fi
  sleep 0.5
done
kill $PID 2>/dev/null || true
pkill -f "$PROFILE" 2>/dev/null || true
rm -rf "$PROFILE"
if [ -s "$OUT" ]; then
  echo "saved $OUT"
  grep -E "Uncaught|CONSOLE.*(Error|error)" "${OUT}.log" | head -5 || true
else
  echo "FAILED $OUT"; tail -5 "${OUT}.log"; exit 1
fi
