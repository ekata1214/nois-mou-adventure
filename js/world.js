export const TILE = 32;
export const COLS = 72;
export const ROWS = 48;

export const T = {
  VOID: 0,
  GROUND: 1,
  PATH: 2,
  RIDGE: 3,
  FLUID: 4,
  BONE: 5,
};

const SOLID = new Set([T.RIDGE, T.FLUID]);

function hash(x, y, s = 17) {
  let n = x * 374761393 + y * 668265263 + s * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function noise(x, y, s = 17) {
  return hash(x, y, s) / 4294967295;
}

function dist(x, y, cx, cy) {
  return Math.hypot(x - cx, y - cy);
}

export function createWorld() {
  const tiles = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  const cx = COLS / 2;
  const cy = ROWS / 2;

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const d = dist(x, y, cx, cy);
      const n = noise(x, y);
      const n2 = noise(x * 3, y * 3, 5);
      const island = d < 16 + n * 4;
      const arm = dist(x, y, cx + 12, cy - 6) < 7;
      const pit = dist(x, y, cx - 8, cy + 5) < 5 && n > 0.5;

      if (!island && !arm) {
        tiles[y][x] = T.VOID;
      } else if (pit) {
        tiles[y][x] = T.FLUID;
      } else if (n2 > 0.82) {
        tiles[y][x] = T.RIDGE;
      } else if (n > 0.72 && d > 10) {
        tiles[y][x] = T.BONE;
      } else if (d < 5 || (n > 0.55 && n < 0.65)) {
        tiles[y][x] = T.PATH;
      } else {
        tiles[y][x] = T.GROUND;
      }
    }
  }

  // spawn on path near center
  const spawnX = Math.floor(cx) * TILE + TILE / 2;
  const spawnY = Math.floor(cy) * TILE + TILE / 2;

  return { tiles, spawnX, spawnY, width: COLS * TILE, height: ROWS * TILE };
}

export function isWalkable(tiles, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return !SOLID.has(tiles[ty][tx]);
}

export function canMove(tiles, x, y, w, h) {
  const pts = [
    [x + 6, y + 8],
    [x + w - 6, y + 8],
    [x + 6, y + h - 4],
    [x + w - 6, y + h - 4],
  ];
  return pts.every(([px, py]) => {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return isWalkable(tiles, tx, ty);
  });
}

export function getAreaName(px, py) {
  const tx = px / TILE;
  const ty = py / TILE;
  const cx = COLS / 2;
  const cy = ROWS / 2;
  if (dist(tx, ty, cx, cy) < 6) return "NOU — 始まりの断片";
  if (dist(tx, ty, cx + 12, cy - 6) < 8) return "NOU — 伸びる腕";
  if (ty > cy + 8) return "NOU — 沈む縁";
  return "NOU — 漂う原野";
}

export const PALETTE = {
  [T.VOID]: { base: "#050508", accent: "#0a0812" },
  [T.GROUND]: { base: "#1a1428", accent: "#2a1f3d" },
  [T.PATH]: { base: "#4a2830", accent: "#6b3540" },
  [T.RIDGE]: { base: "#2d4a3a", accent: "#1e3328" },
  [T.FLUID]: { base: "#3d1020", accent: "#5c1830" },
  [T.BONE]: { base: "#3a3040", accent: "#524858" },
};
