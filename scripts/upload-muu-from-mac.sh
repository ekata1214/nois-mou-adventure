#!/usr/bin/env bash
# Mac で1回だけ実行 → GitHub に送る → CI が有効な speak_mou.glb を作って返す
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=========================================="
echo "  ムー君 GLB を GitHub に送る"
echo "=========================================="

if ! command -v git >/dev/null; then
  echo "✗ git がありません"
  exit 1
fi

if ! command -v git-lfs >/dev/null 2>&1; then
  echo ">> git-lfs を入れてください: brew install git-lfs"
  exit 1
fi

git lfs install

has=0
for f in assets/muu/speak-mou.blend assets/muu/speak_mou.glb assets/muu/re-speak2.glb assets/muu/re-speak.glb; do
  if [ -f "$f" ]; then
    echo "✓ $f"
    has=1
  fi
done

if [ "$has" -eq 0 ]; then
  echo "✗ assets/muu/ に .blend か .glb を置いてください"
  exit 1
fi

git add .gitattributes assets/muu/
git status

if git diff --staged --quiet; then
  echo "変更なし（既に push 済み？）"
else
  git commit -m "Upload speak-mou assets for CI GLB export"
fi

echo ""
echo ">> push 中..."
git push -u origin "$(git branch --show-current)"

echo ""
echo "=========================================="
echo "  完了！"
echo "  GitHub Actions が speak_mou.glb を自動生成します"
echo "  https://github.com/ekata1214/nois-mou-adventure/actions"
echo ""
echo "  2〜3分後:"
echo "    git pull"
echo "    ./setup-and-run.sh"
echo "=========================================="
