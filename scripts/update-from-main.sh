#!/usr/bin/env bash
# main の最新を取り込む（分岐ブランチ・未追跡 GLB でもマージ可能）
set -euo pipefail
cd "$(dirname "$0")/.."

echo ""
echo "=========================================="
echo "  main を取り込みます"
echo "  $(pwd)"
echo "=========================================="
echo ""

BRANCH="$(git branch --show-current)"
echo "現在のブランチ: ${BRANCH}"

git fetch origin main

# 未追跡 speak_mou.glb がマージをブロックするのを回避（実ファイルは退避）
if [ -f "assets/muu/speak_mou.glb" ] && ! git ls-files --error-unmatch assets/muu/speak_mou.glb >/dev/null 2>&1; then
  backup="assets/muu/speak_mou.glb.local-backup"
  echo "△ 未追跡の assets/muu/speak_mou.glb を退避 → ${backup}"
  mv -f "assets/muu/speak_mou.glb" "$backup"
  if [ ! -f "assets/muu/speak-mou5.glb" ] && [ -f "$backup" ]; then
    cp -f "$backup" "assets/muu/speak-mou5.glb"
    echo "  → speak-mou5.glb が無かったのでコピーしました（ゲームはこちらを優先）"
  fi
fi

if git merge-base --is-ancestor HEAD origin/main 2>/dev/null && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then
  echo "✓ すでに origin/main と同じです"
else
  echo ""
  echo "origin/main をマージします..."
  git merge origin/main --no-edit || {
    echo ""
    echo "マージでコンフリクトしました。"
    echo "  画面に <<<<<<< HEAD と出ている場合:"
    echo "    ./scripts/fix-broken-merge.sh"
    echo ""
    echo "手動で直す場合:"
    echo "  git merge --abort"
    echo "  git reset --hard origin/main"
    exit 1
  }
fi

VER="$(grep -o 'v[0-9]*[a-z]*' index.html | tail -1 || true)"
echo ""
echo "✓ 更新完了"
echo "  バージョン表示: ${VER:-（要確認）}"
echo "  期待値: v20260705tex"
echo ""
echo "プレビュー:"
echo "  python3 -m http.server 8765"
echo "  → http://localhost:8765/ を Cmd+Shift+R で再読み込み"
echo ""
