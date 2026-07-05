#!/usr/bin/env bash
# Mac / Linux 用ツール検出
find_blender() {
  if [ -n "${BLENDER_BIN:-}" ] && [ -x "$BLENDER_BIN" ]; then
    echo "$BLENDER_BIN"
    return 0
  fi
  local candidates=(
    "$ROOT/tools/blender-4.4.3-linux-x64/blender"
    "/Applications/Blender.app/Contents/MacOS/Blender"
    "/Applications/Blender 4.4/Blender.app/Contents/MacOS/Blender"
    "/Applications/Blender 4.3/Blender.app/Contents/MacOS/Blender"
  )
  local app
  for app in /Applications/Blender*.app; do
    [ -d "$app" ] || continue
    candidates+=("$app/Contents/MacOS/Blender")
  done
  local c
  for c in "${candidates[@]}"; do
    if [ -x "$c" ]; then
      echo "$c"
      return 0
    fi
  done
  if command -v blender >/dev/null 2>&1; then
    command -v blender
    return 0
  fi
  return 1
}

find_node() {
  if [ -n "${NODE_BIN:-}" ] && [ -x "$NODE_BIN" ]; then
    echo "$NODE_BIN"
    return 0
  fi
  local candidates=(
    "$(command -v node 2>/dev/null || true)"
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
    "$HOME/.fnm/current/bin/node"
    "$HOME/.nvm/current/bin/node"
  )
  local c
  for c in "${candidates[@]}"; do
    if [ -n "$c" ] && [ -x "$c" ]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

ensure_npm_deps() {
  local scripts_dir="$1"
  NODE_BIN="$(find_node || true)"
  if [ -z "$NODE_BIN" ]; then
    echo "△ Node.js がありません（GLB修復はスキップ）"
    echo "  入れる: brew install node"
    echo "  または https://nodejs.org からインストール"
    return 1
  fi
  export PATH="$(dirname "$NODE_BIN"):$PATH"
  if [ ! -d "$scripts_dir/node_modules" ]; then
    echo ">> npm install (gltf tools)..."
    (cd "$scripts_dir" && npm install --silent) || {
      echo "✗ npm install 失敗"
      return 1
    }
  fi
  return 0
}
