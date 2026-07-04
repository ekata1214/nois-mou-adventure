import { T } from "./world.js";

/** 感情エリア — 暗め・低彩度（オブジェクト視認性優先） */
const EMOTION = {
  hub: {
    label: "交差点",
    ground: { base: "#343a38", speck: ["#323836", "#363c3a", "#3a403e"] },
    path: { base: "#4a4844", speck: ["#484642", "#4c4a46", "#504e4a"] },
    minimap: { ground: "#3a403e", path: "#504e4a" },
  },
  ki: {
    label: "喜 — 夏",
    ground: { base: "#4a4a30", speck: ["#48482e", "#4c4c32", "#505034", "#545438"] },
    path: { base: "#5a5838", speck: ["#585636", "#5c5a3a", "#605e3e"] },
    minimap: { ground: "#505034", path: "#5c5a3a" },
  },
  nu: {
    label: "怒 — 秋",
    ground: { base: "#4a2c28", speck: ["#482a26", "#4c2e2a", "#50302c", "#543430"] },
    path: { base: "#5a3830", speck: ["#58362e", "#5c3a32", "#603c34"] },
    minimap: { ground: "#50302c", path: "#5c3a32" },
  },
  ai: {
    label: "哀 — 梅雨",
    ground: { base: "#2c4048", speck: ["#2a3e46", "#2e424a", "#32464e", "#364a52"] },
    path: { base: "#384850", speck: ["#36464e", "#3a4a52", "#3e4e56"] },
    minimap: { ground: "#32464e", path: "#3a4a52" },
  },
  raku: {
    label: "楽 — 夕方",
    ground: { base: "#4a3c28", speck: ["#483a26", "#4c3e2a", "#50422e", "#544632"] },
    path: { base: "#5a4830", speck: ["#58462e", "#5c4a32", "#604e36"] },
    minimap: { ground: "#50422e", path: "#5c4a32" },
  },
};

const PATTERN_SIZE = 128;
const SPECK = 4;
const FIELD_DARKEN = "rgba(0, 0, 0, 0.18)";
const canvasCache = new Map();

function hash(x, y, s = 17) {
  let n = x * 374761393 + y * 668265263 + s * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function pick(arr, n) {
  return arr[n % arr.length];
}

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

function ridgeCanvas() {
  return getTextureCanvas("ridge", (pctx, size) => {
    paintFlatFine(pctx, size, {
      base: "#383c38",
      speck: ["#363a36", "#3a3e3a", "#3e423e"],
    }, 300);
  });
}

function drawWorldTexture(ctx, canvas, px, py, tx, ty, tileSize) {
  const ox = (tx * tileSize) % canvas.width;
  const oy = (ty * tileSize) % canvas.height;
  ctx.drawImage(canvas, ox, oy, tileSize, tileSize, px, py, tileSize, tileSize);
}

function finishFieldTile(ctx, px, py, tileSize) {
  ctx.fillStyle = FIELD_DARKEN;
  ctx.fillRect(px, py, tileSize, tileSize);
}

export function prewarmFieldCache() {
  canvasCache.clear();
  for (const region of ["hub", "ki", "nu", "ai", "raku"]) {
    groundCanvas(region);
    pathCanvas(region);
  }
  ridgeCanvas();
}

export function drawFieldTile(ctx, px, py, tile, regionId, tx, ty, dither, tileSize = 32) {
  if (tile === T.VOID) return false;

  const region = regionId ?? "hub";

  switch (tile) {
    case T.GROUND:
      drawWorldTexture(ctx, groundCanvas(region), px, py, tx, ty, tileSize);
      finishFieldTile(ctx, px, py, tileSize);
      break;
    case T.PATH:
      drawWorldTexture(ctx, pathCanvas(region), px, py, tx, ty, tileSize);
      finishFieldTile(ctx, px, py, tileSize);
      break;
    case T.RIDGE:
      drawWorldTexture(ctx, ridgeCanvas(), px, py, tx, ty, tileSize);
      finishFieldTile(ctx, px, py, tileSize);
      break;
    case T.BONE:
      drawWorldTexture(ctx, pathCanvas(region), px, py, tx, ty, tileSize);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(px, py, tileSize, tileSize);
      finishFieldTile(ctx, px, py, tileSize);
      break;
    case T.FLUID: {
      drawWorldTexture(ctx, groundCanvas(region), px, py, tx, ty, tileSize);
      const isRain = region === "ai";
      const pulse = 0.28 + Math.sin(dither * 1.2 + tx * 0.25 + ty * 0.2) * 0.04;
      ctx.fillStyle = isRain ? `rgba(50, 100, 130, ${pulse})` : `rgba(120, 40, 50, ${pulse})`;
      ctx.fillRect(px + 3, py + 5, tileSize - 6, tileSize - 10);
      finishFieldTile(ctx, px, py, tileSize);
      break;
    }
    default:
      drawWorldTexture(ctx, groundCanvas(region), px, py, tx, ty, tileSize);
      finishFieldTile(ctx, px, py, tileSize);
      break;
  }

  return true;
}

export function getFieldMinimapColor(tile, regionId) {
  const emotion = EMOTION[regionId ?? "hub"] ?? EMOTION.hub;
  if (tile === T.PATH) return emotion.minimap.path;
  if (tile === T.GROUND || tile === T.BONE) return emotion.minimap.ground;
  if (tile === T.FLUID) return regionId === "ai" ? "#3e4e56" : "#603c34";
  if (tile === T.RIDGE) return "#3e423e";
  return emotion.minimap.ground;
}

export function getEmotionFieldLabel(regionId) {
  return EMOTION[regionId]?.label ?? EMOTION.hub.label;
}
