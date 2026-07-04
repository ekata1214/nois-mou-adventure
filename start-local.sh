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

if grep -q "v20260703p" index.html 2>/dev/null; then
  echo "✓ 最新バージョン (v20260703p)"
else
  echo "✗ コードが古い → git pull してください"
  ok=0
fi

if [ -f "assets/room/this ver2.glb" ]; then
  size=$(du -h "assets/room/this ver2.glb" | cut -f1)
  echo "✓ assets/room/this ver2.glb ($size)"
elif [ -f "assets/room/this ver2.GLB" ]; then
  size=$(du -h "assets/room/this ver2.GLB" | cut -f1)
  echo "✓ assets/room/this ver2.GLB ($size)"
elif [ -f "assets/room/this.glb" ]; then
  size=$(du -h "assets/room/this.glb" | cut -f1)
  echo "✓ assets/room/this.glb ($size) — this ver2.glb 推奨"
else
  echo "✗ assets/room/this ver2.glb がありません"
  echo "  Blender から this ver2.glb で export して assets/room/ に置いてください"
  ls -la "assets/room/" 2>/dev/null || true
  ok=0
fi

if [ -f "assets/muu/speak-mou4.glb" ]; then
  size=$(du -h "assets/muu/speak-mou4.glb" | cut -f1)
  echo "✓ assets/muu/speak-mou4.glb ($size)"
elif [ -f "assets/muu/speak-mou3.glb" ]; then
  size=$(du -h "assets/muu/speak-mou2.glb" | cut -f1)
  echo "✓ assets/muu/speak-mou2.glb ($size)"
elif [ -f "assets/muu/speak_mou.glb" ]; then
  size=$(du -h "assets/muu/speak_mou.glb" | cut -f1)
  echo "✓ assets/muu/speak_mou.glb ($size)"
elif [ -f "assets/muu/speak_mou.GLB" ]; then
  size=$(du -h "assets/muu/speak_mou.GLB" | cut -f1)
  echo "✓ assets/muu/speak_mou.GLB ($size)"
else
  echo "△ assets/muu/speak_mou.glb なし（殻は2Dムー君）"
fi

if [ ! -f "assets/void/void-stars.png" ]; then
  echo "✗ assets/void/void-stars.png がありません"
  ok=0
else
  echo "✓ assets/void/void-stars.png"
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
if [ -f "serve.py" ]; then
  python3 serve.py "$PORT" || python3 -m http.server "$PORT"
else
  python3 -m http.server "$PORT"
fi
