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

USE_LFS=0
if command -v git-lfs >/dev/null 2>&1; then
  git lfs install
  USE_LFS=1
  echo "✓ git-lfs"
else
  echo "△ git-lfs なし — 通常の git で push します（100MB 未満なら OK）"
  echo "  推奨: brew install git-lfs"
  echo "  ※ brew install だけでは git-lfs は入りません。検索結果に出ても"
  echo "    パッケージ名は git-lfs です: brew install git-lfs"
fi

has=0
for f in assets/muu/speak-mou.blend assets/muu/speak_mou.glb assets/muu/re-speak2.glb assets/muu/re-speak.glb; do
  if [ -f "$f" ]; then
    size=$(du -h "$f" | cut -f1)
    echo "✓ $f ($size)"
    has=1
  fi
done

if [ "$has" -eq 0 ]; then
  echo "✗ assets/muu/ に .blend か .glb を置いてください"
  exit 1
fi

if [ "$USE_LFS" -eq 1 ]; then
  git add .gitattributes assets/muu/
else
  # LFS フィルタなしで実ファイルを add（git-lfs 未インストール時）
  git -c filter.lfs.smudge= \
      -c filter.lfs.clean= \
      -c filter.lfs.process= \
      -c filter.lfs.required=false \
      add .gitattributes assets/muu/
fi

git status

if git diff --staged --quiet; then
  echo "変更なし（既に push 済み？）"
else
  git commit -m "Upload speak-mou assets for CI GLB export"
fi

echo ""
echo ">> push 中..."
if ! git push -u origin "$(git branch --show-current)"; then
  echo ""
  echo "✗ push 失敗"
  echo "  ファイルが 100MB 超なら: brew install git-lfs && git lfs install"
  echo "  その後このスクリプトを再実行"
  exit 1
fi

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
