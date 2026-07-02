export const TILE = 32;
export const COLS = 96;
export const ROWS = 72;

export const T = {
  VOID: 0,
  GROUND: 1,
  PATH: 2,
  RIDGE: 3,
  FLUID: 4,
  BONE: 5,
};

const SOLID = new Set([T.RIDGE, T.FLUID]);

/** 喜怒哀楽 — 4つの感情領域 */
const REGIONS = [
  {
    id: "ki",
    cx: 48,
    cy: 16,
    r: 14,
    name: "喜",
    label: "喜びの領域",
    bias: ["joy", "hope"],
    palette: { ground: "#2a2030", path: "#6b4540", fluid: false },
  },
  {
    id: "nu",
    cx: 78,
    cy: 36,
    r: 14,
    name: "怒",
    label: "怒りの領域",
    bias: ["anger", "envy"],
    palette: { ground: "#281018", path: "#7a2030", fluid: true },
  },
  {
    id: "ai",
    cx: 48,
    cy: 56,
    r: 14,
    name: "哀",
    label: "哀しみの領域",
    bias: ["loneliness", "void", "anxiety", "guilt"],
    palette: { ground: "#141828", path: "#303850", fluid: true },
  },
  {
    id: "raku",
    cx: 18,
    cy: 36,
    r: 14,
    name: "楽",
    label: "楽しみの領域",
    bias: ["love", "curiosity", "joy"],
    palette: { ground: "#1a2830", path: "#405848", fluid: false },
  },
];

const HUB = { id: "hub", cx: 48, cy: 36, r: 5, name: "交差点", label: "始まりの交差点" };

const BRIDGES = [
  { ax: HUB.cx, ay: HUB.cy, bx: 48, by: 16, w: 2.4 },
  { ax: HUB.cx, ay: HUB.cy, bx: 78, by: 36, w: 2.4 },
  { ax: HUB.cx, ay: HUB.cy, bx: 48, by: 56, w: 2.4 },
  { ax: HUB.cx, ay: HUB.cy, bx: 18, by: 36, w: 2.4 },
];

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

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, ax + t * dx, ay + t * dy);
}

function regionAt(tx, ty) {
  if (dist(tx, ty, HUB.cx, HUB.cy) < HUB.r + 1) return HUB;

  let best = REGIONS[0];
  let bestD = Infinity;
  for (const r of REGIONS) {
    const d = dist(tx, ty, r.cx, r.cy);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

function tileRegion(x, y) {
  for (const r of REGIONS) {
    if (dist(x, y, r.cx, r.cy) < r.r + noise(x, y) * 3.5) return r;
  }
  if (dist(x, y, HUB.cx, HUB.cy) < HUB.r + 1) return HUB;
  return null;
}

export function createWorld() {
  const tiles = Array.from({ length: ROWS }, () => new Uint8Array(COLS));

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const n = noise(x, y);
      const n2 = noise(x * 3, y * 3, 5);
      const region = tileRegion(x, y);

      let onBridge = false;
      for (const b of BRIDGES) {
        if (segDist(x, y, b.ax, b.ay, b.bx, b.by) < b.w + n * 0.35) {
          onBridge = true;
          break;
        }
      }

      const onHub = dist(x, y, HUB.cx, HUB.cy) < HUB.r + n * 0.8;
      const onLand = region !== null || onBridge || onHub;

      if (!onLand) {
        tiles[y][x] = T.VOID;
      } else if (onBridge || onHub) {
        tiles[y][x] = T.PATH;
      } else if (
        region.palette?.fluid &&
        dist(x, y, region.cx - 4, region.cy + 3) < 4 &&
        n > 0.5
      ) {
        tiles[y][x] = T.FLUID;
      } else if (n2 > 0.84) {
        tiles[y][x] = T.RIDGE;
      } else if (n > 0.74 && dist(x, y, region.cx, region.cy) > 7) {
        tiles[y][x] = T.BONE;
      } else if (dist(x, y, region.cx, region.cy) < 4 || (n > 0.52 && n < 0.62)) {
        tiles[y][x] = T.PATH;
      } else {
        tiles[y][x] = T.GROUND;
      }
    }
  }

  const spawnX = HUB.cx * TILE + TILE / 2;
  const spawnY = HUB.cy * TILE + TILE / 2;

  return {
    tiles,
    spawnX,
    spawnY,
    width: COLS * TILE,
    height: ROWS * TILE,
    regions: REGIONS,
    hub: HUB,
  };
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

export function getRegionAt(tx, ty) {
  return regionAt(tx, ty);
}

export const REGION_TINT = {
  ki: "rgba(255, 210, 80, 0.06)",
  nu: "rgba(229, 9, 20, 0.08)",
  ai: "rgba(100, 120, 180, 0.09)",
  raku: "rgba(80, 200, 140, 0.07)",
};

export function getAreaName(px, py) {
  const region = regionAt(px / TILE, py / TILE);
  const label = region.label ?? region.name;
  return `NOU — ${label}`;
}

export const PALETTE = {
  [T.VOID]: { base: "#050508", accent: "#0a0812" },
  [T.GROUND]: { base: "#1a1428", accent: "#2a1f3d" },
  [T.PATH]: { base: "#4a2830", accent: "#6b3540" },
  [T.RIDGE]: { base: "#2d4a3a", accent: "#1e3328" },
  [T.FLUID]: { base: "#3d1020", accent: "#5c1830" },
  [T.BONE]: { base: "#3a3040", accent: "#524858" },
};
