#!/usr/bin/env bash
# speak-mou.blend → speak_mou.glb（検証が通るまでリトライ）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=env-tools.sh
source "$ROOT/scripts/env-tools.sh"
MUU_DIR="$ROOT/assets/muu"
EXPORT_PY="$ROOT/scripts/blender/export-speak-mou.py"
OUT_GLB="$MUU_DIR/speak_mou.glb"
SCRIPTS_DIR="$ROOT/scripts"

BLENDER_BIN="$(find_blender || true)"
if [ -z "$BLENDER_BIN" ]; then
  echo "✗ Blender が見つかりません"
  echo "  Mac: /Applications/Blender.app を入れるか"
  echo "  BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender ./scripts/export-speak-mou.sh"
  exit 1
fi
echo "✓ Blender: $BLENDER_BIN"

blend=""
for f in "$MUU_DIR"/*.blend; do
  [ -f "$f" ] || continue
  blend="$f"
  break
done

if [ -z "$blend" ]; then
  echo "✗ assets/muu/ に .blend がありません"
  exit 2
fi

HAS_NODE=0
if ensure_npm_deps "$SCRIPTS_DIR"; then
  HAS_NODE=1
else
  echo "△ Node なし → Blender export のみ（修復・検証はスキップ）"
fi

echo "=========================================="
echo "  speak_mou GLB export"
echo "  blend: $(basename "$blend")"
echo "=========================================="

ATTEMPTS=(
  '{"export_morph":false,"export_nla_strips":true,"single_action":true}'
  '{"export_morph":false,"export_nla_strips":false,"single_action":true}'
  '{"export_morph":false,"export_nla_strips":true,"single_action":false}'
)

attempt=0
for opts in "${ATTEMPTS[@]}"; do
  attempt=$((attempt + 1))
  echo ""
  echo ">> attempt $attempt"
  echo "$opts" > "$MUU_DIR/.export-options.json"

  "$BLENDER_BIN" --background --python "$EXPORT_PY" || {
    echo "✗ Blender export failed (attempt $attempt)"
    continue
  }

  if [ "$HAS_NODE" -eq 0 ]; then
    rm -f "$MUU_DIR/.export-options.json"
    size=$(du -h "$OUT_GLB" | cut -f1)
    echo ""
    echo "✓ export 完了（未検証）: $OUT_GLB ($size)"
    echo "  修復するには: brew install node && ./scripts/repair-speak-mou.sh"
    exit 0
  fi

  node "$SCRIPTS_DIR/fix-glb.mjs" "$OUT_GLB" "$OUT_GLB" || continue

  if node "$SCRIPTS_DIR/validate-glb.mjs" "$OUT_GLB"; then
    rm -f "$MUU_DIR/.export-options.json"
    size=$(du -h "$OUT_GLB" | cut -f1)
    echo ""
    echo "✓ 成功: $OUT_GLB ($size)"
    exit 0
  fi
  echo "✗ validation failed — retry..."
done

rm -f "$MUU_DIR/.export-options.json"
echo "✗ 全リトライ失敗"
exit 1
