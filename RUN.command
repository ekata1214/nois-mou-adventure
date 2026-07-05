#!/bin/bash
# ダブルクリックで起動（Mac）
cd "$(dirname "$0")" || exit 1

echo ""
echo "=========================================="
echo "  ムー君の冒険 — セットアップ & 起動"
echo "=========================================="
echo ""

if [ -d .git ]; then
  echo ">> 最新コードを取得中 (git pull)..."
  git pull || echo "（git pull 失敗 — 手動で確認してください）"
  echo ""
fi

if [ ! -f "setup-and-run.sh" ]; then
  echo "エラー: setup-and-run.sh がありません。"
  echo "git pull するか、GitHub から再ダウンロードしてください。"
  read -p "Enter で閉じる..."
  exit 1
fi

chmod +x setup-and-run.sh start-local.sh
exec ./setup-and-run.sh
