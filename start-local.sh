#!/usr/bin/env bash
# ムー君の冒険 — ローカルプレビュー（Mac / Linux）
cd "$(dirname "$0")" || exit 1
PORT="${1:-8765}"

echo ""
echo "=== ムー君の冒険 — 起動チェック ==="
echo "フォルダ: $(pwd)"
echo ""

ok=1

if [ ! -f "index.html" ]; then
  echo "✗ index.html がありません"
  ok=0
else
  echo "✓ index.html"
fi

if [ ! -f "js/shell-room.js" ]; then
  echo "✗ js/shell-room.js がありません → git pull してください"
  ok=0
else
  echo "✓ js/shell-room.js"
fi

if grep -q "shell-room-gl" index.html 2>/dev/null; then
  echo "✓ 殻の3D部屋用 HTML"
else
  echo "✗ index.html が古い → git pull してください"
  ok=0
fi

if grep -q "v20260703k" index.html 2>/dev/null; then
  echo "✓ 最新バージョン (v20260703k)"
else
  echo "✗ コードが古い → git pull してください"
  ok=0
fi

if [ -f "assets/room/this.glb" ]; then
  size=$(du -h "assets/room/this.glb" | cut -f1)
  echo "✓ assets/room/this.glb ($size)"
elif [ -f "assets/room/this.GLB" ]; then
  size=$(du -h "assets/room/this.GLB" | cut -f1)
  echo "✓ assets/room/this.GLB ($size)"
else
  echo "✗ assets/room/this.glb がありません"
  echo "  Blender から this.glb で export して assets/room/ に置いてください"
  ls -la "assets/room/" 2>/dev/null || true
  ok=0
fi

echo ""

if [ "$ok" -eq 0 ]; then
  echo "✗ を直してから再実行してください。"
  echo ""
  exit 1
fi

echo ""
echo "  開く: http://localhost:${PORT}"
echo "  ※ ブラウザで Cmd+Shift+R（強制リロード）"
echo "  止める: Ctrl+C"
echo ""
python3 -m http.server "$PORT"
