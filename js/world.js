export const TILE = 32;
export const COLS = 96;
export const ROWS = 72;

export const T = {
  /** マップ外 — 物理的な現実世界（VOID）。ムー君はここでは生きられない */
  VOID: 0,
  GROUND: 1,
  PATH: 2,
  RIDGE: 3,
  FLUID: 4,
  BONE: 5,
};

const SOLID = new Set([T.RIDGE, T.FLUID]);

/** 喜怒哀楽 — 季節・時間帯で表現 */
const REGIONS = [
  {
    id: "ki",
    cx: 48,
    cy: 16,
    r: 14,
    name: "喜",
    label: "喜 — 黄色の夏",
    theme: "summer",
    art: "hylics",
    bias: ["joy", "hope"],
    palette: { ground: "#2a2810", path: "#6a5a20", fluid: false },
  },
  {
    id: "nu",
    cx: 78,
    cy: 36,
    r: 14,
    name: "怒",
    label: "怒 — 赤色の秋",
    theme: "autumn",
    art: "giger",
    bias: ["anger", "envy"],
    palette: { ground: "#281410", path: "#6a3020", fluid: false },
  },
  {
    id: "ai",
    cx: 48,
    cy: 56,
    r: 14,
    name: "哀",
    label: "哀 — 水色の梅雨",
    theme: "rainy",
    art: "giger",
    bias: ["loneliness", "void", "anxiety", "guilt"],
    palette: { ground: "#101820", path: "#304858", fluid: true },
  },
  {
    id: "raku",
    cx: 18,
    cy: 36,
    r: 14,
    name: "楽",
    label: "楽 — オレンジの夕方",
    theme: "sunset",
    art: "hylics",
    bias: ["love", "curiosity", "joy"],
    palette: { ground: "#281810", path: "#5a3820", fluid: false },
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
        dist(x, y, region.cx - 4, region.cy + 3) < 5 &&
        n > 0.45
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

export function getTileAt(tiles, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return T.VOID;
  return tiles[ty][tx];
}

export function isInVoid(tiles, px, py) {
  return getTileAt(tiles, px, py) === T.VOID;
}

/** VOID = 俺らの現実世界。時間と空間が物理的に存在する領域 */
export const VOID_REALM = {
  name: "VOID",
  label: "現実世界",
  tagline: "時間と空間がある、俺らの世界",
};

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
  ki: "rgba(255, 220, 60, 0.14)",
  nu: "rgba(210, 70, 45, 0.13)",
  ai: "rgba(120, 200, 235, 0.14)",
  raku: "rgba(255, 130, 50, 0.13)",
};

export const REGION_TILE = {
  ki: { ground: "#2a2810", path: "#5a4a18", accent: "#ffd84d", fluid: "#4a4010" },
  nu: { ground: "#281410", path: "#5a2818", accent: "#e85030", fluid: "#3a1810" },
  ai: { ground: "#101820", path: "#283848", accent: "#88cce8", fluid: "#1a3040" },
  raku: { ground: "#281810", path: "#4a3018", accent: "#ff8830", fluid: "#3a2010" },
};

export function getTilePalette(tile, regionId) {
  const base = PALETTE[tile] ?? PALETTE[T.VOID];
  const regional = regionId && REGION_TILE[regionId];
  if (!regional || tile === T.VOID || tile === T.RIDGE) return base;

  if (tile === T.GROUND) return { base: regional.ground, accent: regional.accent };
  if (tile === T.PATH) return { base: regional.path, accent: regional.accent };
  if (tile === T.FLUID) return { base: regional.fluid, accent: regional.accent };
  if (tile === T.BONE) return { base: base.base, accent: regional.accent };
  return base;
}

export function getAreaName(px, py, tiles) {
  if (tiles && isInVoid(tiles, px, py)) {
    return `VOID — ${VOID_REALM.label}`;
  }
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
