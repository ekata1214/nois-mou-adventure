#!/usr/bin/env bash
# main の最新を取り込む（分岐ブランチでもマージで更新）
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

if git merge-base --is-ancestor HEAD origin/main 2>/dev/null && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then
  echo "✓ すでに origin/main と同じです"
else
  echo ""
  echo "origin/main をマージします（ローカルの変更は残します）..."
  git merge origin/main --no-edit || {
    echo ""
    echo "マージでコンフリクトしました。解消後:"
    echo "  git add -A && git commit"
    echo ""
    echo "ローカル変更を捨てて main だけに合わせる場合:"
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
