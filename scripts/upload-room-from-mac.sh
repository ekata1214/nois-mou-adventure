#!/usr/bin/env bash
# Mac で1回だけ実行 → 部屋 GLB を GitHub に送る（GitHub Pages 用）
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=========================================="
echo "  殻の部屋 GLB を GitHub に送る"
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
  echo "✓ git-lfs"
else
  echo "△ git-lfs なし — 100MB 未満の GLB のみ push"
  echo "  大きいファイル: brew install git-lfs"
fi

UPLOAD_FILES=()
has=0

for candidate in "this ver2.glb" "this ver2.GLB" "this.glb" "this.GLB" "room right.glb" "room right.GLB"; do
  if [ -f "assets/room/$candidate" ]; then
    mb=$(file_size_mb "assets/room/$candidate")
    if [ "$mb" -ge 100 ] && [ "$USE_LFS" -eq 0 ]; then
      echo "△ スキップ: assets/room/$candidate (${mb}MB > 100MB, git-lfs 必須)"
      continue
    fi
    echo "✓ assets/room/$candidate ($(du -h "assets/room/$candidate" | cut -f1))"
    UPLOAD_FILES+=("assets/room/$candidate")
    has=1
    break
  fi
done

if [ "$has" -eq 0 ]; then
  echo "✗ assets/room/ に GLB がありません"
  echo "  Blender から this ver2.glb で export して assets/room/ に置いてください"
  ls -la assets/room/ 2>/dev/null || true
  exit 1
fi

for f in assets/room/manifest.json; do
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
  git commit -m "Upload shell room GLB for GitHub Pages"
fi

echo ""
echo ">> push 中..."
if ! git push -u origin "$(git branch --show-current)"; then
  echo ""
  echo "✗ push 失敗 — git pull してから再実行"
  exit 1
fi

echo ""
echo "=========================================="
echo "  完了！"
echo "  main にマージ後、数分で Pages に反映:"
echo "  https://ekata1214.github.io/nois-mou-adventure/"
echo "=========================================="
