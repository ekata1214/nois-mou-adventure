import { T } from "./world.js";

/** 感情エリア — 色が一目でわかるフラット草地 */
const EMOTION = {
  hub: {
    label: "交差点",
    ground: { base: "#526858", speck: ["#506658", "#546a5c", "#586e60"] },
    path: { base: "#908878", speck: ["#8e8676", "#928c7c", "#969280"] },
    tint: null,
    minimap: { ground: "#586e60", path: "#908878" },
  },
  ki: {
    label: "喜 — 夏",
    ground: { base: "#9cb828", speck: ["#98b424", "#a0bc2c", "#a8c434", "#b0cc3c"] },
    path: { base: "#d4b840", speck: ["#d0b43c", "#d8bc44", "#e0c44c"] },
    tint: "rgba(255, 228, 80, 0.14)",
    minimap: { ground: "#a8c434", path: "#d8bc44" },
  },
  nu: {
    label: "怒 — 秋",
    ground: { base: "#a03828", speck: ["#9c3424", "#a83c2c", "#b44434", "#c04c3c"] },
    path: { base: "#c84830", speck: ["#c4442c", "#cc4c34", "#d4543c"] },
    tint: "rgba(240, 80, 50, 0.14)",
    minimap: { ground: "#b44434", path: "#cc4c34" },
  },
  ai: {
    label: "哀 — 梅雨",
    ground: { base: "#3a7888", speck: ["#367484", "#3e7c8c", "#468494", "#4e8c9c"] },
    path: { base: "#4a8898", speck: ["#468494", "#508c9c", "#5894a4"] },
    tint: "rgba(120, 200, 240, 0.16)",
    minimap: { ground: "#468494", path: "#508c9c" },
  },
  raku: {
    label: "楽 — 夕方",
    ground: { base: "#b87828", speck: ["#b47424", "#bc7c2c", "#c48434", "#cc8c3c"] },
    path: { base: "#d89040", speck: ["#d48c3c", "#dc943c", "#e49c48"] },
    tint: "rgba(255, 140, 60, 0.14)",
    minimap: { ground: "#c48434", path: "#dc943c" },
  },
};

const PATTERN_SIZE = 128;
const SPECK = 4;
const canvasCache = new Map();

function hash(x, y, s = 17) {
  let n = x * 374761393 + y * 668265263 + s * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function pick(arr, n) {
  return arr[n % arr.length];
}

/** フラット＋細かい斑点（立体感なし） */
function paintFlatFine(ctx, size, palette, seed) {
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, size, size);

  const cols = Math.ceil(size / SPECK);
  const rows = Math.ceil(size / SPECK);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const h = hash(col + seed, row + seed * 5, seed * 11);
      if (h % 3 === 0) continue;
      const gx = col * SPECK;
      const gy = row * SPECK;
      ctx.fillStyle = pick(palette.speck, h);
      const dot = h % 5 === 0 ? 1 : 2;
      ctx.fillRect(gx + 1, gy + 1, dot, dot);
    }
  }
}

function getTextureCanvas(key, paintFn) {
  if (canvasCache.has(key)) return canvasCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = PATTERN_SIZE;
  canvas.height = PATTERN_SIZE;
  paintFn(canvas.getContext("2d"), PATTERN_SIZE);
  canvasCache.set(key, canvas);
  return canvas;
}

function groundCanvas(regionId) {
  const emotion = EMOTION[regionId] ?? EMOTION.hub;
  return getTextureCanvas(`g:${regionId}`, (pctx, size) => {
    paintFlatFine(pctx, size, emotion.ground, 100);
  });
}

function pathCanvas(regionId) {
  const emotion = EMOTION[regionId] ?? EMOTION.hub;
  return getTextureCanvas(`p:${regionId}`, (pctx, size) => {
    paintFlatFine(pctx, size, emotion.path, 200);
  });
}

function ridgeCanvas(regionId) {
  const emotion = EMOTION[regionId] ?? EMOTION.hub;
  return getTextureCanvas(`r:${regionId}`, (pctx, size) => {
    paintFlatFine(pctx, size, {
      base: "#505850",
      speck: ["#4e564e", "#525a52", "#565e56"],
    }, 300);
    pctx.fillStyle = emotion.tint ?? "rgba(0,0,0,0.08)";
    pctx.fillRect(0, 0, size, size);
  });
}

function drawWorldTexture(ctx, canvas, px, py, tx, ty, tileSize) {
  const ox = (tx * tileSize) % canvas.width;
  const oy = (ty * tileSize) % canvas.height;
  ctx.drawImage(canvas, ox, oy, tileSize, tileSize, px, py, tileSize, tileSize);
}

function applyEmotionTint(ctx, px, py, tileSize, regionId) {
  const tint = EMOTION[regionId]?.tint;
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(px, py, tileSize, tileSize);
  }
}

export function prewarmFieldCache() {
  canvasCache.clear();
  for (const region of ["hub", "ki", "nu", "ai", "raku"]) {
    groundCanvas(region);
    pathCanvas(region);
    ridgeCanvas(region);
  }
}

export function drawFieldTile(ctx, px, py, tile, regionId, tx, ty, dither, tileSize = 32) {
  if (tile === T.VOID) return false;

  const region = regionId ?? "hub";

  switch (tile) {
    case T.GROUND:
      drawWorldTexture(ctx, groundCanvas(region), px, py, tx, ty, tileSize);
      applyEmotionTint(ctx, px, py, tileSize, region);
      break;
    case T.PATH:
      drawWorldTexture(ctx, pathCanvas(region), px, py, tx, ty, tileSize);
      applyEmotionTint(ctx, px, py, tileSize, region);
      break;
    case T.RIDGE:
      drawWorldTexture(ctx, ridgeCanvas(region), px, py, tx, ty, tileSize);
      break;
    case T.BONE:
      drawWorldTexture(ctx, pathCanvas(region), px, py, tx, ty, tileSize);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(px, py, tileSize, tileSize);
      break;
    case T.FLUID: {
      drawWorldTexture(ctx, groundCanvas(region), px, py, tx, ty, tileSize);
      const isRain = region === "ai";
      const pulse = 0.45 + Math.sin(dither * 1.2 + tx * 0.25 + ty * 0.2) * 0.05;
      ctx.fillStyle = isRain ? `rgba(80, 170, 220, ${pulse})` : `rgba(200, 50, 70, ${pulse})`;
      ctx.fillRect(px + 3, py + 5, tileSize - 6, tileSize - 10);
      break;
    }
    default:
      drawWorldTexture(ctx, groundCanvas(region), px, py, tx, ty, tileSize);
      applyEmotionTint(ctx, px, py, tileSize, region);
      break;
  }

  return true;
}

export function getFieldMinimapColor(tile, regionId) {
  const emotion = EMOTION[regionId ?? "hub"] ?? EMOTION.hub;
  if (tile === T.PATH) return emotion.minimap.path;
  if (tile === T.GROUND || tile === T.BONE) return emotion.minimap.ground;
  if (tile === T.FLUID) return regionId === "ai" ? "#5894a4" : "#c4543c";
  if (tile === T.RIDGE) return "#565e56";
  return emotion.minimap.ground;
}

export function getEmotionFieldLabel(regionId) {
  return EMOTION[regionId]?.label ?? EMOTION.hub.label;
}
