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

file_size_mb() {
  du -m "$1" | cut -f1
}

USE_LFS=0
if command -v git-lfs >/dev/null 2>&1; then
  git lfs install
  USE_LFS=1
  echo "✓ git-lfs（.blend も送れます）"
else
  echo "△ git-lfs なし — GLB のみ push（.blend は 100MB 超のためスキップ）"
  echo "  .blend も送りたい場合: brew install git-lfs"
fi

UPLOAD_FILES=()
has=0

for f in assets/muu/*.glb assets/muu/*.GLB; do
  [ -f "$f" ] || continue
  mb=$(file_size_mb "$f")
  if [ "$mb" -ge 100 ]; then
    echo "△ スキップ: $f (${mb}MB > GitHub 100MB 上限)"
    continue
  fi
  echo "✓ $f ($(du -h "$f" | cut -f1))"
  UPLOAD_FILES+=("$f")
  has=1
done

if [ "$USE_LFS" -eq 1 ]; then
  for f in assets/muu/*.blend; do
    [ -f "$f" ] || continue
    echo "✓ $f ($(du -h "$f" | cut -f1)) [LFS]"
    UPLOAD_FILES+=("$f")
    has=1
  done
else
  for f in assets/muu/*.blend; do
    [ -f "$f" ] || continue
    mb=$(file_size_mb "$f")
    echo "△ スキップ: $f (${mb}MB) — git-lfs 必須"
  done
fi

if [ "$has" -eq 0 ]; then
  echo "✗ assets/muu/ に push 可能な .glb がありません（100MB 未満）"
  exit 1
fi

# manifest / README は小さいので一緒に
for f in assets/muu/manifest.json assets/muu/README-speak-mou.txt; do
  [ -f "$f" ] && UPLOAD_FILES+=("$f")
done

if [ "$USE_LFS" -eq 1 ]; then
  git add .gitattributes "${UPLOAD_FILES[@]}"
else
  git -c filter.lfs.smudge= \
      -c filter.lfs.clean= \
      -c filter.lfs.process= \
      -c filter.lfs.required=false \
      add .gitattributes "${UPLOAD_FILES[@]}"
fi

git status

if git diff --staged --quiet; then
  echo "変更なし（既に push 済み？）"
else
  git commit -m "Upload speak-mou GLB for CI export"
fi

echo ""
echo ">> push 中..."
if ! git push -u origin "$(git branch --show-current)"; then
  echo ""
  echo "✗ push 失敗"
  echo "  前回の失敗コミットがある場合:"
  echo "    git reset --soft HEAD~1"
  echo "    git pull"
  echo "    ./scripts/upload-muu-from-mac.sh"
  echo ""
  echo "  .blend も送りたい場合: brew install git-lfs && git lfs install"
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
