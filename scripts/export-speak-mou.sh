#!/usr/bin/env bash
# speak-mou.blend → speak_mou.glb（検証が通るまでリトライ）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MUU_DIR="$ROOT/assets/muu"
EXPORT_PY="$ROOT/scripts/blender/export-speak-mou.py"
OUT_GLB="$MUU_DIR/speak_mou.glb"
SCRIPTS_DIR="$ROOT/scripts"

BLENDER_BIN="${BLENDER_BIN:-}"
if [ -z "$BLENDER_BIN" ]; then
  if [ -x "$ROOT/tools/blender-4.4.3-linux-x64/blender" ]; then
    BLENDER_BIN="$ROOT/tools/blender-4.4.3-linux-x64/blender"
  elif command -v blender >/dev/null 2>&1; then
    BLENDER_BIN="$(command -v blender)"
  fi
fi

if [ -z "$BLENDER_BIN" ] || [ ! -x "$BLENDER_BIN" ]; then
  echo "✗ Blender が見つかりません"
  echo "  Mac: Blender 4.x を入れるか BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender"
  exit 1
fi

blend=""
for f in "$MUU_DIR"/*.blend; do
  [ -f "$f" ] || continue
  blend="$f"
  break
done

if [ -z "$blend" ]; then
  echo "✗ assets/muu/ に .blend がありません"
  echo "  speak-mou.blend を assets/muu/ に置いてから再実行してください"
  exit 2
fi

echo "=========================================="
echo "  speak_mou GLB export"
echo "  blend: $(basename "$blend")"
echo "=========================================="

cd "$SCRIPTS_DIR"
if [ ! -d node_modules ]; then
  echo ">> npm install (gltf tools)..."
  npm install --silent
fi

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

  node "$SCRIPTS_DIR/fix-glb.mjs" "$OUT_GLB" "$OUT_GLB" || {
    echo "✗ fix-glb failed (attempt $attempt)"
    continue
  }

  if node "$SCRIPTS_DIR/validate-glb.mjs" "$OUT_GLB"; then
    rm -f "$MUU_DIR/.export-options.json"
    size=$(du -h "$OUT_GLB" | cut -f1)
    echo ""
    echo "✓ 成功: $OUT_GLB ($size)"
    exit 0
  fi

  echo "✗ validation failed (attempt $attempt) — retry..."
done

echo ""
echo "✗ 全リトライ失敗。Blender で再生確認後、.blend を再配置してください。"
exit 1
