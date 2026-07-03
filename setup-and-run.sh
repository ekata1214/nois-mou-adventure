#!/usr/bin/env bash
# Mac 用ワンショット — GLB 準備 + 起動チェック + サーバー起動
set -e
cd "$(dirname "$0")"
PROJECT="$(pwd)"

echo ""
echo "=== ムー君の冒険 — セットアップ ==="
echo "$PROJECT"
echo ""

mkdir -p assets/room

# room right.glb → this.glb にリネーム（あれば）
if [ -f "assets/room/room right.glb" ] && [ ! -f "assets/room/this.glb" ]; then
  mv "assets/room/room right.glb" "assets/room/this.glb"
  echo "✓ room right.glb → this.glb にリネームしました"
fi
if [ -f "assets/room/room right.GLB" ] && [ ! -f "assets/room/this.glb" ]; then
  mv "assets/room/room right.GLB" "assets/room/this.glb"
  echo "✓ room right.GLB → this.glb にリネームしました"
fi

chmod +x start-local.sh
exec ./start-local.sh "$@"
