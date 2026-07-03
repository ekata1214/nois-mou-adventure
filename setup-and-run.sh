#!/usr/bin/env bash
# ムー君の冒険 — セットアップ + 起動チェック + サーバー
set -e
cd "$(dirname "$0")"
PROJECT="$(pwd)"

clear
echo ""
echo "=========================================="
echo "  ムー君の冒険"
echo "  $PROJECT"
echo "=========================================="
echo ""

mkdir -p assets/room

# GLB: this ver2 を優先（なければ this.glb へフォールバック）
ROOM_GLB=""
for candidate in "this ver2.glb" "this ver2.GLB" "this.glb" "this.GLB" "room right.glb" "room right.GLB"; do
  if [ -f "assets/room/$candidate" ]; then
    ROOM_GLB="$candidate"
    break
  fi
done

if [ -n "$ROOM_GLB" ]; then
  if [ "$ROOM_GLB" != "this ver2.glb" ] && [ -f "assets/room/this ver2.glb" ]; then
    ROOM_GLB="this ver2.glb"
  fi
  if [ "$ROOM_GLB" != "this ver2.glb" ] && [ ! -f "assets/room/this ver2.glb" ]; then
    cp "assets/room/$ROOM_GLB" "assets/room/this ver2.glb" 2>/dev/null || true
    echo "✓ assets/room/$ROOM_GLB → this ver2.glb"
  else
    echo "✓ assets/room/this ver2.glb"
  fi
else
  echo "✗ assets/room/ に GLB がありません（this ver2.glb を置いてください）"
fi

chmod +x start-local.sh 2>/dev/null || true
exec ./start-local.sh "$@"
