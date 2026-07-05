#!/usr/bin/env bash
# Mac で GLB を GitHub に送って公開リンクを直す
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=========================================="
echo "  GitHub Pages 用アセットをアップロード"
echo "=========================================="

ROOM_OK=0
MUU_OK=0

if ls assets/room/*.glb assets/room/*.GLB 2>/dev/null | head -1 | grep -q .; then
  echo ""
  echo ">> 部屋 GLB"
  ./scripts/upload-room-from-mac.sh
  ROOM_OK=1
else
  echo "△ assets/room/ に GLB なし — スキップ"
fi

if ls assets/muu/*.glb assets/muu/*.GLB 2>/dev/null | head -1 | grep -q .; then
  echo ""
  echo ">> ムー君 GLB"
  ./scripts/upload-muu-from-mac.sh
  MUU_OK=1
else
  echo "△ assets/muu/ に GLB なし — スキップ"
fi

if [ "$ROOM_OK" -eq 0 ] && [ "$MUU_OK" -eq 0 ]; then
  echo ""
  echo "✗ アップロードする GLB がありません"
  echo "  assets/room/this ver2.glb"
  echo "  assets/muu/speak-mou*.glb"
  exit 1
fi

echo ""
echo "=========================================="
echo "  次: PR を main にマージ"
echo "  https://github.com/ekata1214/nois-mou-adventure/pulls"
echo "  公開: https://ekata1214.github.io/nois-mou-adventure/"
echo "=========================================="
