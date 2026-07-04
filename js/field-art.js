import { T } from "./world.js";

/** ミニマップ用の代表色 */
export const FIELD_MINIMAP = {
  [T.GROUND]: "#4a7a38",
  [T.PATH]: "#8a7a58",
  [T.RIDGE]: "#5a6a52",
  [T.FLUID]: "#3a7aaa",
  [T.BONE]: "#a89868",
};

/** 低コントラスト草地（細かい点滅を抑える） */
const REGION_MOSS = {
  hub: { base: "#3a6830", patch: ["#386830", "#3e6e34", "#447238", "#4a783c"] },
  ki: { base: "#3e7028", patch: ["#3c6e26", "#42742c", "#487a30", "#4e8034"] },
  nu: { base: "#345828", patch: ["#325626", "#385c2a", "#3e6230", "#446834"] },
  ai: { base: "#285840", patch: ["#26563e", "#2c5c44", "#32624a", "#386850"] },
  raku: { base: "#3a5028", patch: ["#384e26", "#3e542c", "#445a30", "#4a6034"] },
};

const REGION_DIRT = {
  hub: { base: "#6a5a38", patch: ["#645434", "#6a5a38", "#706040", "#766648"] },
  ki: { base: "#706038", patch: ["#6a5a34", "#706038", "#76663c", "#7c6c40"] },
  nu: { base: "#604830", patch: ["#5a442c", "#604830", "#664c34", "#6c5038"] },
  ai: { base: "#445860", patch: ["#40545c", "#445860", "#485c64", "#4c6068"] },
  raku: { base: "#705030", patch: ["#6a4c2c", "#705030", "#765434", "#7c5838"] },
};

const PATTERN_SIZE = 256;
const MICRO = 16;
const canvasCache = new Map();

function hash(x, y, s = 17) {
  let n = x * 374761393 + y * 668265263 + s * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function pick(arr, n) {
  return arr[n % arr.length];
}

/** 大粒・低コントラスト（ブロック縁・点滅なし） */
function paintSoftField(ctx, size, palette, seed) {
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, size, size);

  const cols = Math.ceil(size / MICRO);
  const rows = Math.ceil(size / MICRO);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const gx = col * MICRO;
      const gy = row * MICRO;
      const h = hash(col + seed, row + seed * 3, seed * 7);
      if (h % 3 === 0) continue;
      ctx.fillStyle = pick(palette.patch, h);
      ctx.fillRect(gx + 1, gy + 1, MICRO - 2, MICRO - 2);
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

function mossCanvas(regionId) {
  const region = regionId ?? "hub";
  return getTextureCanvas(`moss:${region}`, (pctx, size) => {
    paintSoftField(pctx, size, REGION_MOSS[region] ?? REGION_MOSS.hub, 100);
  });
}

function dirtCanvas(regionId) {
  const region = regionId ?? "hub";
  return getTextureCanvas(`dirt:${region}`, (pctx, size) => {
    paintSoftField(pctx, size, REGION_DIRT[region] ?? REGION_DIRT.hub, 200);
  });
}

function ridgeCanvas() {
  return getTextureCanvas("ridge", (pctx, size) => {
    paintSoftField(pctx, size, {
      base: "#4a5a48",
      patch: ["#465648", "#4a5a48", "#4e5e4c", "#526250"],
    }, 300);
  });
}

function boneCanvas() {
  return getTextureCanvas("bone", (pctx, size) => {
    paintSoftField(pctx, size, {
      base: "#9a8868",
      patch: ["#968464", "#9a8868", "#9e8c6c", "#a29070"],
    }, 400);
  });
}

/** ワールド座標に固定して描画（カメラ移動時のパターン泳ぎを防ぐ） */
function drawWorldTexture(ctx, canvas, px, py, tx, ty, tileSize) {
  const ox = (tx * tileSize) % canvas.width;
  const oy = (ty * tileSize) % canvas.height;
  ctx.drawImage(canvas, ox, oy, tileSize, tileSize, px, py, tileSize, tileSize);
}

export function prewarmFieldCache() {
  canvasCache.clear();
  for (const region of ["hub", "ki", "nu", "ai", "raku"]) {
    mossCanvas(region);
    dirtCanvas(region);
  }
  ridgeCanvas();
  boneCanvas();
}

export function drawFieldTile(ctx, px, py, tile, regionId, tx, ty, dither, tileSize = 32) {
  if (tile === T.VOID) return false;

  const region = regionId ?? "hub";

  switch (tile) {
    case T.GROUND:
      drawWorldTexture(ctx, mossCanvas(region), px, py, tx, ty, tileSize);
      break;
    case T.PATH:
      drawWorldTexture(ctx, dirtCanvas(region), px, py, tx, ty, tileSize);
      break;
    case T.RIDGE:
      drawWorldTexture(ctx, ridgeCanvas(), px, py, tx, ty, tileSize);
      break;
    case T.BONE:
      drawWorldTexture(ctx, boneCanvas(), px, py, tx, ty, tileSize);
      break;
    case T.FLUID: {
      drawWorldTexture(ctx, ridgeCanvas(), px, py, tx, ty, tileSize);
      const isRain = region === "ai";
      const pulse = 0.35 + Math.sin(dither * 1.2 + tx * 0.25 + ty * 0.2) * 0.06;
      ctx.fillStyle = isRain ? `rgba(70, 150, 200, ${pulse})` : `rgba(180, 50, 70, ${pulse})`;
      ctx.fillRect(px + 4, py + 6, tileSize - 8, tileSize - 12);
      break;
    }
    default:
      drawWorldTexture(ctx, mossCanvas(region), px, py, tx, ty, tileSize);
      break;
  }

  return true;
}

export function getFieldMinimapColor(tile, regionId) {
  if (tile === T.GROUND && regionId && REGION_MOSS[regionId]) {
    return REGION_MOSS[regionId].patch[2];
  }
  if (tile === T.PATH && regionId && REGION_DIRT[regionId]) {
    return REGION_DIRT[regionId].patch[2];
  }
  return FIELD_MINIMAP[tile] ?? FIELD_MINIMAP[T.GROUND];
}
