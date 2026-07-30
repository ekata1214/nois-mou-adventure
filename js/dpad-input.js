/** 十字キー入力の幾何判定（UI 非依存・テスト可能） */

/**
 * 画面座標下の十字ボタンを拾う（CSS transform / clip-path 後も正しい）
 * @returns {"up"|"down"|"left"|"right"|null}
 */
export function dpadDirFromPoint(clientX, clientY, padEl) {
  if (!padEl) return null;
  const stack =
    typeof document !== "undefined" && document.elementsFromPoint
      ? document.elementsFromPoint(clientX, clientY)
      : [typeof document !== "undefined" ? document.elementFromPoint(clientX, clientY) : null];

  for (const el of stack) {
    if (!el || typeof el.closest !== "function") continue;
    if (!padEl.contains(el)) continue;
    const btn = el.closest("[data-dpad]");
    if (!btn || !padEl.contains(btn)) continue;
    const dir = btn.dataset.dpad;
    if (dir === "up" || dir === "down" || dir === "left" || dir === "right") return dir;
  }
  return null;
}

/** @deprecated 座標アナログは transform 下で不安定なため非推奨。テスト互換用に残す */
export function normalizePadCoords(clientX, clientY, rect) {
  const half = Math.min(rect.width, rect.height) / 2 || 1;
  return {
    x: (clientX - (rect.left + rect.width / 2)) / half,
    y: (clientY - (rect.top + rect.height / 2)) / half,
  };
}

export function isOnDpadCross(x, y, armHalf = 0.4) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax > 1.08 || ay > 1.08) return false;
  return ay <= armHalf || ax <= armHalf;
}

/**
 * 単一方向（または明示の組み合わせ）から移動ベクトルを作る
 */
export function resolveDpadDirsFromDir(dir) {
  const out = {
    up: false,
    down: false,
    left: false,
    right: false,
    x: 0,
    y: 0,
    active: false,
  };
  if (!dir) return out;
  out[dir] = true;
  out.active = true;
  if (dir === "left") out.x = -1;
  if (dir === "right") out.x = 1;
  if (dir === "up") out.y = -1;
  if (dir === "down") out.y = 1;
  return out;
}

/** 旧アナログ解決（テスト互換） */
export function resolveDpadDirs(x, y, { wasActive = false } = {}) {
  const dead = wasActive ? 0.3 : 0.42;
  const diagRatio = 0.78;
  const len = Math.hypot(x, y);
  if (len < dead) return resolveDpadDirsFromDir(null);

  const nx = x / len;
  const ny = y / len;
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  let dir = null;
  if (ax >= ay) dir = nx < 0 ? "left" : "right";
  else dir = ny < 0 ? "up" : "down";

  // 強い斜めだけ副軸を足す（本番はボタン直下判定を使う）
  const primary = resolveDpadDirsFromDir(dir);
  if (ax >= ay && ay >= ax * diagRatio) {
    if (ny < 0) primary.up = true;
    else primary.down = true;
  } else if (ay > ax && ax >= ay * diagRatio) {
    if (nx < 0) primary.left = true;
    else primary.right = true;
  }
  let mx = (primary.right ? 1 : 0) - (primary.left ? 1 : 0);
  let my = (primary.down ? 1 : 0) - (primary.up ? 1 : 0);
  if (mx || my) {
    const mlen = Math.hypot(mx, my);
    mx /= mlen;
    my /= mlen;
  }
  const mag = Math.min(1, (len - dead) / Math.max(0.001, 1 - dead));
  const curved = Math.pow(mag, 0.9);
  return { ...primary, x: mx * curved, y: my * curved, active: true };
}
