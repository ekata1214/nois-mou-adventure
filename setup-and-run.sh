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

# GLB ファイル名を this.glb に統一
for src in "this.GLB" "room right.glb" "room right.GLB" "room right" "this"; do
  if [ -f "assets/room/$src" ] && [ ! -f "assets/room/this.glb" ]; then
    cp "assets/room/$src" "assets/room/this.glb" 2>/dev/null || mv "assets/room/$src" "assets/room/this.glb"
    echo "✓ assets/room/$src → this.glb"
    break
  fi
done

chmod +x start-local.sh 2>/dev/null || true
exec ./start-local.sh "$@"
