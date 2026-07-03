#!/usr/bin/env bash
# push 失敗で .blend 入りコミットが残ったときの復旧
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=========================================="
echo "  アップロード失敗の復旧"
echo "=========================================="

git fetch origin

# blend をインデックスから外す（ファイル自体は消さない）
if [ -f "assets/muu/speak-mou.blend" ]; then
  git rm --cached -f "assets/muu/speak-mou.blend" 2>/dev/null || true
fi

# blend を含むローカルコミットを origin/main まで巻き戻す（作業ファイルは残す）
ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
if [ "$ahead" -gt 0 ]; then
  echo ">> ローカルだけのコミット ${ahead} 件を取り消します（ファイルは残ります）"
  git reset --soft origin/main
fi

# 念のため blend 以外だけ残してステージをクリア
git reset HEAD . 2>/dev/null || true

echo ""
echo "✓ 復旧完了。次を実行:"
echo "    ./scripts/upload-muu-from-mac.sh"
echo "=========================================="
