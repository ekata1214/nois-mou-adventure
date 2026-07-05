#!/usr/bin/env bash
# GLB が LFS ポインタ（~134B）でないことを確認。デプロイ前に必須。
set -euo pipefail

MIN_BYTES=1000000
fail=0

check_glb() {
  local f="$1"
  if [ ! -f "$f" ]; then
    echo "::error::missing GLB: $f"
    fail=1
    return
  fi
  local size
  size=$(wc -c <"$f" | tr -d ' ')
  if head -c 8 "$f" | grep -q "version "; then
    echo "::error::LFS pointer (not binary): $f ($size bytes) — run git lfs pull"
    fail=1
    return
  fi
  if [ "$size" -lt "$MIN_BYTES" ]; then
    echo "::error::GLB too small: $f ($size bytes)"
    fail=1
    return
  fi
  echo "✓ $f ($(du -h "$f" | cut -f1))"
}

check_glb "assets/room/this ver2.glb"
check_glb "assets/muu/speak_mou.glb"

if [ "$fail" -ne 0 ]; then
  exit 1
fi
