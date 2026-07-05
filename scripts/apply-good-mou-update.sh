#!/usr/bin/env bash
# good-mou ランダムループ用コードを GitHub main から上書き（git merge 不要）
set -e
cd "$(dirname "$0")/.."
PROJECT="$(pwd)"

echo ""
echo "=== good-mou 更新スクリプト ==="
echo "$PROJECT"
echo ""

# 8765 を使っている古いサーバーを止める
if lsof -ti:8765 >/dev/null 2>&1; then
  echo ">> ポート 8765 のサーバーを停止..."
  lsof -ti:8765 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo ">> GitHub から最新コードを取得..."
git fetch origin main

FILES=(
  js/shell-muu-3d.js
  js/main.js
  js/shell-room.js
  index.html
  assets/muu/manifest.json
  scripts/apply-good-mou-update.sh
)

for f in "${FILES[@]}"; do
  git checkout origin/main -- "$f" 2>/dev/null || {
    echo "✗ $f の取得に失敗。git fetch ができているか確認してください。"
    exit 1
  }
  echo "✓ $f"
done

echo ""
echo "✓ 更新完了"
echo ""
echo "  次: ./setup-and-run.sh"
echo "  ブラウザ: http://127.0.0.1:8765/"
echo "  強制リロード: Cmd+Shift+R"
echo ""
echo "  成功すると画面下に「ループ: speak-mou」または「ループ: good-mou」と出ます"
echo ""
