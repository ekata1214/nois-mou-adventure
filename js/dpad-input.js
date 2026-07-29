/** 十字キー入力の幾何判定（UI 非依存・テスト可能） */

/** パッド矩形 → 中心原点・半辺=1 の正規化座標 */
export function normalizePadCoords(clientX, clientY, rect) {
  const half = Math.min(rect.width, rect.height) / 2 || 1;
  return {
    x: (clientX - (rect.left + rect.width / 2)) / half,
    y: (clientY - (rect.top + rect.height / 2)) / half,
  };
}

/**
 * 見た目の十字アーム上か（四隅の空きは弾く）
 * armHalf: アーム半幅（正規化）
 */
export function isOnDpadCross(x, y, armHalf = 0.4) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax > 1.08 || ay > 1.08) return false;
  const onH = ay <= armHalf && ax <= 1.08;
  const onV = ax <= armHalf && ay <= 1.08;
  return onH || onV;
}

/**
 * 正規化座標から方向を解決。
 * - 中央デッドゾーンを広めに
 * - 斜めは副軸が十分強いときだけ
 * - active 中はヒステリシスでチラつき軽減
 */
export function resolveDpadDirs(x, y, { wasActive = false } = {}) {
  const dead = wasActive ? 0.3 : 0.42;
  const diagRatio = 0.78;
  const len = Math.hypot(x, y);

  if (len < dead) {
    return {
      up: false,
      down: false,
      left: false,
      right: false,
      x: 0,
      y: 0,
      active: false,
    };
  }

  const nx = x / len;
  const ny = y / len;
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);

  let up = false;
  let down = false;
  let left = false;
  let right = false;

  if (ax >= ay) {
    if (nx < 0) left = true;
    else right = true;
    if (ay >= ax * diagRatio) {
      if (ny < 0) up = true;
      else down = true;
    }
  } else {
    if (ny < 0) up = true;
    else down = true;
    if (ax >= ay * diagRatio) {
      if (nx < 0) left = true;
      else right = true;
    }
  }

  let mx = (right ? 1 : 0) - (left ? 1 : 0);
  let my = (down ? 1 : 0) - (up ? 1 : 0);
  if (mx !== 0 || my !== 0) {
    const mlen = Math.hypot(mx, my);
    mx /= mlen;
    my /= mlen;
  }

  // デッドゾーン外の押し込み量（端でフル）
  const mag = Math.min(1, (len - dead) / Math.max(0.001, 1 - dead));
  const curved = Math.pow(mag, 0.9);

  return {
    up,
    down,
    left,
    right,
    x: mx * curved,
    y: my * curved,
    active: true,
  };
}
