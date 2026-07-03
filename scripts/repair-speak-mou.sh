#!/usr/bin/env bash
# 既存 GLB を修復して speak_mou.glb にする（blend 不要）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MUU_DIR="$ROOT/assets/muu"
OUT_GLB="$MUU_DIR/speak_mou.glb"
SCRIPTS_DIR="$ROOT/scripts"

cd "$SCRIPTS_DIR"
if [ ! -d node_modules ]; then
  echo ">> npm install..."
  npm install --silent
fi

CANDIDATES=(
  "$MUU_DIR/speak_mou.glb"
  "$MUU_DIR/speak-mou.glb"
  "$MUU_DIR/re-speak2.glb"
  "$MUU_DIR/re-speak.glb"
)

found=0
best=""
best_errors=999999

for src in "${CANDIDATES[@]}"; do
  [ -f "$src" ] || continue
  found=1
  echo ""
  echo ">> repair $(basename "$src")"
  tmp="$MUU_DIR/.repair-tmp.glb"
  node "$SCRIPTS_DIR/fix-glb.mjs" "$src" "$tmp" || continue

  if node "$SCRIPTS_DIR/validate-glb.mjs" "$tmp" 2>/tmp/validate.log; then
    cp "$tmp" "$OUT_GLB"
    rm -f "$tmp"
    size=$(du -h "$OUT_GLB" | cut -f1)
    echo ""
    echo "✓ 成功: $OUT_GLB ($size) ← $(basename "$src")"
    exit 0
  fi

  errors=$(grep -c "ERR " /tmp/validate.log 2>/dev/null || echo 999)
  echo "  errors: $errors"
  if [ "$errors" -lt "$best_errors" ]; then
    best_errors=$errors
    best="$tmp"
  fi
done

rm -f "$MUU_DIR/.repair-tmp.glb"

if [ "$found" -eq 0 ]; then
  echo "✗ assets/muu/ に GLB がありません"
  echo "  speak_mou.glb / re-speak2.glb などを置くか speak-mou.blend を push してください"
  exit 2
fi

if [ -n "$best" ] && [ -f "$best" ]; then
  cp "$best" "$OUT_GLB"
  echo ""
  echo "△ 完全合格ではないが最良版を採用: $OUT_GLB (errors≈$best_errors)"
  exit 0
fi

echo "✗ 修復失敗"
exit 1
