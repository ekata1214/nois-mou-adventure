#!/usr/bin/env bash
# Mac 用: 手元の良いムー君 GLB を speak-mou5.glb として配置
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="assets/muu/speak-mou5.glb"
mkdir -p assets/muu

pick_largest() {
  local best="" size=0 bytes
  for f in "$@"; do
    [ -f "$f" ] || continue
    if head -c 8 "$f" 2>/dev/null | grep -q "version "; then
      continue
    fi
    bytes=$(wc -c <"$f" | tr -d ' ')
    [ "$bytes" -lt 500000 ] && continue
    if [ "$bytes" -gt "$size" ]; then
      best="$f"
      size=$bytes
    fi
  done
  [ -n "$best" ] && echo "$best"
}

if [ -f "$DEST" ]; then
  bytes=$(wc -c <"$DEST" | tr -d ' ')
  if [ "$bytes" -ge 500000 ] && ! head -c 8 "$DEST" | grep -q "version "; then
    echo "✓ すでに $DEST あり ($(du -h "$DEST" | cut -f1))"
    exit 0
  fi
fi

SRC="$(pick_largest \
  assets/muu/speak-mou5.glb \
  assets/muu/speak-mou4.glb \
  assets/muu/speak-mou.glb \
  assets/muu/speak_mou.glb.local-backup \
  assets/muu/speak_mou.glb \
  assets/muu/good-mou.glb)" || true

if [ -z "$SRC" ]; then
  echo "✗ 使える GLB が見つかりません。"
  echo "  Blender から export した speak-mou5.glb を次に置いてください:"
  echo "  $DEST"
  exit 1
fi

cp -f "$SRC" "$DEST"
echo "✓ $SRC → $DEST ($(du -h "$DEST" | cut -f1))"
echo ""
echo "  python3 -m http.server 8765"
echo "  殻画面で「ムー君 GLB: speak-mou5.glb」と出れば OK"
