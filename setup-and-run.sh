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

mkdir -p assets/room assets/muu

# git pull 後は LFS ポインタだけのことがある → 実 GLB を取得
if command -v git-lfs >/dev/null 2>&1 || command -v git >/dev/null 2>&1; then
  git lfs install 2>/dev/null || true
  git lfs pull 2>/dev/null || true
fi

room_bytes=0
if [ -f "assets/room/this ver2.glb" ]; then
  room_bytes=$(wc -c <"assets/room/this ver2.glb" | tr -d ' ')
fi
if [ "$room_bytes" -lt 1000000 ] 2>/dev/null; then
  echo "△ 部屋 GLB が LFS ポインタです。git lfs install && git lfs pull を実行してください"
fi

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

MUU_GLB=""
for candidate in speak-mou5.glb speak-mou4.glb speak-mou3.glb speak-mou2.glb speak_mou.glb speak-mou.glb; do
  if [ -f "assets/muu/$candidate" ]; then
    MUU_GLB="assets/muu/$candidate"
    break
  fi
done

if [ -n "$MUU_GLB" ]; then
  size=$(du -h "$MUU_GLB" | cut -f1)
  echo "✓ $MUU_GLB ($size)"
  cp -f "$MUU_GLB" "assets/muu/speak_mou.glb"
  size=$(du -h "assets/muu/speak_mou.glb" | cut -f1)
  echo "✓ → speak_mou.glb に同期 ($size)"
  if bash scripts/repair-speak-mou.sh 2>/dev/null; then
    :
  fi
elif ls assets/muu/*.blend >/dev/null 2>&1; then
  echo ">> speak-mou.blend から GLB を生成..."
  if bash scripts/export-speak-mou.sh; then
    echo "✓ speak_mou.glb 生成完了"
  else
    echo "△ export 失敗"
    bash scripts/repair-speak-mou.sh 2>/dev/null || true
  fi
elif ls assets/muu/*.glb >/dev/null 2>&1; then
  echo ">> 既存 GLB を修復..."
  bash scripts/repair-speak-mou.sh || echo "△ GLB 修復失敗"
elif [ -f "assets/muu/speak_mou.GLB" ]; then
  size=$(du -h "assets/muu/speak_mou.GLB" | cut -f1)
  echo "✓ assets/muu/speak_mou.GLB ($size)"
else
  echo "△ assets/muu/speak_mou.glb なし（殻は2Dムー君にフォールバック）"
fi

chmod +x start-local.sh 2>/dev/null || true
exec ./start-local.sh "$@"
