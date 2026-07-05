#!/usr/bin/env bash
# マージ失敗・<<<<<<< HEAD 表示・文字化けを一発修復（GLB は退避して戻す）
set -euo pipefail
cd "$(dirname "$0")/.."

echo ""
echo "=========================================="
echo "  壊れたマージを修復します"
echo "  $(pwd)"
echo "=========================================="
echo ""

BACKUP_DIR="assets/.local-glb-backup"
mkdir -p "$BACKUP_DIR/muu" "$BACKUP_DIR/room"

backup_big_glb() {
  local src="$1"
  local dest="$BACKUP_DIR/${src#assets/}"
  [ -f "$src" ] || return 0
  local bytes
  bytes=$(wc -c <"$src" | tr -d ' ')
  if [ "$bytes" -gt 1000000 ]; then
    mkdir -p "$(dirname "$dest")"
    cp -f "$src" "$dest"
    echo "  退避: $src ($(du -h "$src" | cut -f1))"
  fi
}

echo "① 大きな GLB を退避..."
for f in assets/muu/*.{glb,GLB} assets/room/*.{glb,GLB}; do
  backup_big_glb "$f" 2>/dev/null || true
done

if grep -q '^<<<<<<< ' index.html 2>/dev/null; then
  echo "△ index.html にマージコンフリクト痕跡あり"
fi

echo ""
echo "② 進行中のマージを中止（あれば）..."
git merge --abort 2>/dev/null || true

echo ""
echo "③ origin/main にコードを合わせます..."
git fetch origin main
git reset --hard origin/main

echo ""
echo "④ 退避した GLB を戻します（LFS ポインタより大きいファイルを優先）..."
restore_glb() {
  local backup="$1"
  local target="assets/${backup#$BACKUP_DIR/}"
  [ -f "$backup" ] || return 0
  local bsize tsize
  bsize=$(wc -c <"$backup" | tr -d ' ')
  if [ -f "$target" ]; then
    tsize=$(wc -c <"$target" | tr -d ' ')
    if [ "$tsize" -ge "$bsize" ]; then
      return 0
    fi
  fi
  mkdir -p "$(dirname "$target")"
  cp -f "$backup" "$target"
  echo "  復元: $target"
}

while IFS= read -r -d '' f; do
  restore_glb "$f"
done < <(find "$BACKUP_DIR" \( -name '*.glb' -o -name '*.GLB' \) -print0 2>/dev/null)

VER="$(grep -o 'v[0-9]*[a-z]*' index.html | tail -1 || true)"
if grep -q '^<<<<<<< ' index.html 2>/dev/null; then
  echo ""
  echo "✗ まだコンフリクトが残っています。index.html を確認してください。"
  exit 1
fi

echo ""
echo "✓ 修復完了"
echo "  バージョン: ${VER:-?}（期待: v20260705tex）"
echo ""
echo "  python3 -m http.server 8765"
echo "  → http://localhost:8765/ を Cmd+Shift+R"
echo ""
