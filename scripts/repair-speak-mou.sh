#!/usr/bin/env bash
# 既存 GLB を修復して speak_mou.glb にする（blend 不要）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=env-tools.sh
source "$ROOT/scripts/env-tools.sh"
MUU_DIR="$ROOT/assets/muu"
OUT_GLB="$MUU_DIR/speak_mou.glb"
SCRIPTS_DIR="$ROOT/scripts"

if ! ensure_npm_deps "$SCRIPTS_DIR"; then
  if [ -f "$OUT_GLB" ]; then
    size=$(du -h "$OUT_GLB" | cut -f1)
    echo "✓ 既存の speak_mou.glb をそのまま使用 ($size)"
    exit 0
  fi
  exit 1
fi

CANDIDATES=(
  "$MUU_DIR/speak-mou2.glb"
  "$MUU_DIR/speak_mou.glb"
  "$MUU_DIR/speak-mou.glb"
  "$MUU_DIR/re-speak2.glb"
  "$MUU_DIR/re-speak.glb"
)

found=0
best=""
best_errors=999999
validate_log="$(mktemp)"

for src in "${CANDIDATES[@]}"; do
  [ -f "$src" ] || continue
  found=1
  echo ""
  echo ">> repair $(basename "$src")"
  tmp="$MUU_DIR/.repair-tmp.glb"
  node "$SCRIPTS_DIR/fix-glb.mjs" "$src" "$tmp" || continue

  if node "$SCRIPTS_DIR/validate-glb.mjs" "$tmp" 2>"$validate_log"; then
    cp "$tmp" "$OUT_GLB"
    rm -f "$tmp"
    size=$(du -h "$OUT_GLB" | cut -f1)
    echo ""
    echo "✓ 成功: $OUT_GLB ($size) ← $(basename "$src")"
    rm -f "$validate_log"
    exit 0
  fi

  errors=$(grep -c "ERR " "$validate_log" 2>/dev/null || echo 999)
  echo "  errors: $errors"
  if [ "$errors" -lt "$best_errors" ]; then
    best_errors=$errors
    cp "$tmp" "$MUU_DIR/.repair-best.glb"
    best="$MUU_DIR/.repair-best.glb"
  fi
  rm -f "$tmp"
done

rm -f "$validate_log" "$MUU_DIR/.repair-tmp.glb"

if [ "$found" -eq 0 ]; then
  echo "✗ assets/muu/ に GLB がありません"
  exit 2
fi

if [ -n "$best" ] && [ -f "$best" ]; then
  cp "$best" "$OUT_GLB"
  rm -f "$best"
  echo ""
  echo "△ 完全合格ではないが最良版を採用: $OUT_GLB (errors≈$best_errors)"
  exit 0
fi

echo "✗ 修復失敗"
exit 1
