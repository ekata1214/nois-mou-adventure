#!/usr/bin/env bash
# ローカルプレビュー専用 — git 不要。GLB を置いてブラウザで確認してから git に上げる用。
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8765}"
LAN="${LAN:-0}"

echo ""
echo "=========================================="
echo "  ムー君の冒険 — ローカルプレビュー"
echo "  $(pwd)"
echo "=========================================="
echo ""

check_glb() {
  local path="$1"
  local label="$2"
  if [ ! -f "$path" ]; then
    echo "△ $label なし: $path"
    return 1
  fi
  local bytes
  bytes=$(wc -c <"$path" | tr -d ' ')
  if [ "$bytes" -lt 1000000 ]; then
    echo "✗ $label が LFS ポインタです ($bytes bytes): $path"
    echo "  → 実ファイルをコピーするか git lfs pull"
    return 1
  fi
  echo "✓ $label ($(du -h "$path" | cut -f1))"
  return 0
}

check_glb "assets/room/this ver2.glb" "部屋 GLB" || true

MUU_OK=0
for f in assets/muu/speak-mou5.glb assets/muu/speak-mou4.glb assets/muu/speak_mou.glb assets/muu/speak-mou.glb; do
  if check_glb "$f" "ムー君 GLB" 2>/dev/null; then
    MUU_OK=1
    break
  fi
done
if [ "$MUU_OK" -eq 0 ]; then
  echo ""
  echo "ムー君 GLB を置いてください:"
  echo "  cp /path/to/speak-mou5.glb assets/muu/"
  echo ""
fi

echo ""
echo "  PC:  http://localhost:${PORT}/"
if [ "$LAN" = "1" ]; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || true)"
  if [ -n "$IP" ]; then
    echo "  スマホ（同じ Wi‑Fi）: http://${IP}:${PORT}/"
  fi
  echo ""
  exec python3 serve.py "$PORT" --lan
else
  echo "  スマホでも見る: LAN=1 ./scripts/preview-local.sh"
  echo "  止める: Ctrl+C"
  echo ""
  exec python3 serve.py "$PORT"
fi
