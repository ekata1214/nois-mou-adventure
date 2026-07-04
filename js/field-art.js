import { T } from "./world.js";

/** ミニマップ用の代表色 */
export const FIELD_MINIMAP = {
  [T.GROUND]: "#4a7a38",
  [T.PATH]: "#8a7a58",
  [T.RIDGE]: "#5a6a52",
  [T.FLUID]: "#3a7aaa",
  [T.BONE]: "#a89868",
};

/** 苔・草地パレット（地域ごと） */
const REGION_MOSS = {
  hub: {
    base: "#3d6a32",
    patch: ["#2e5528", "#3a6830", "#4a7a38", "#5a8a42", "#6a9a48", "#7aaa52", "#8aba58"],
  },
  ki: {
    base: "#4a7828",
    patch: ["#3a6820", "#4a7828", "#5a8830", "#6a9838", "#7aa840", "#8ab848", "#9ac850"],
  },
  nu: {
    base: "#3a5828",
    patch: ["#2a4818", "#385828", "#486830", "#587838", "#688840", "#789848", "#88a850"],
  },
  ai: {
    base: "#2a5848",
    patch: ["#1a4838", "#285840", "#386848", "#487850", "#588858", "#689860", "#78a868"],
  },
  raku: {
    base: "#4a5028",
    patch: ["#3a4018", "#485028", "#586030", "#687038", "#788040", "#889048", "#98a050"],
  },
};

const REGION_DIRT = {
  hub: { base: "#6a5a38", patch: ["#5a4a28", "#6a5a38", "#7a6a48", "#8a7a58", "#9a8a68"] },
  ki: { base: "#7a6838", patch: ["#6a5828", "#7a6838", "#8a7848", "#9a8858", "#aa9868"] },
  nu: { base: "#6a4830", patch: ["#5a3820", "#6a4830", "#7a5840", "#8a6850", "#9a7860"] },
  ai: { base: "#4a5860", patch: ["#3a4850", "#4a5860", "#5a6870", "#6a7880", "#7a8890"] },
  raku: { base: "#7a5830", patch: ["#6a4820", "#7a5830", "#8a6840", "#9a7850", "#aa8860"] },
};

const TILE_CACHE = new Map();
const MICRO = 4;
const VARIANTS = 4;

function hash(x, y, s = 17) {
  let n = x * 374761393 + y * 668265263 + s * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function pick(arr, n) {
  return arr[n % arr.length];
}

function paintMicroField(ctx, size, palette, seed) {
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, size, size);

  const cols = Math.ceil(size / MICRO);
  const rows = Math.ceil(size / MICRO);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const gx = col * MICRO;
      const gy = row * MICRO;
      const h = hash(col + seed, row + seed * 3, seed * 7);
      const color = pick(palette.patch, h);
      const bump = h % 5;

      if (bump === 0) {
        ctx.fillStyle = color;
        ctx.fillRect(gx, gy, MICRO, MICRO);
      } else if (bump === 1) {
        ctx.fillStyle = color;
        ctx.fillRect(gx, gy - 1, MICRO, MICRO + 1);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(gx, gy + MICRO - 1, MICRO, 1);
      } else if (bump === 2) {
        ctx.fillStyle = color;
        ctx.fillRect(gx + 1, gy + 1, MICRO, MICRO);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(gx, gy, MICRO, 1);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(gx, gy, MICRO - 1, MICRO - 1);
        ctx.fillStyle = pick(palette.patch, h >> 4);
        ctx.fillRect(gx + 1, gy + 1, MICRO - 1, MICRO - 1);
      }

      if (h % 11 === 0) {
        ctx.fillStyle = bump % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
        ctx.fillRect(gx + 1, gy + 1, 2, 2);
      }
    }
  }
}

function paintOrganicGround(ctx, size, regionId, variant) {
  const pal = REGION_MOSS[regionId] ?? REGION_MOSS.hub;
  paintMicroField(ctx, size, pal, 100 + variant * 17);
}

function paintOrganicPath(ctx, size, regionId, variant) {
  const pal = REGION_DIRT[regionId] ?? REGION_DIRT.hub;
  paintMicroField(ctx, size, pal, 200 + variant * 23);

  ctx.fillStyle = "rgba(0,0,0,0.04)";
  for (let i = 0; i < 5; i++) {
    const h = hash(i, variant, 311);
    const x = h % (size - 6);
    const y = (h >> 4) % (size - 4);
    ctx.fillRect(x + 2, y + 2, 4, 1);
  }
}

function paintOrganicRidge(ctx, size, variant) {
  paintMicroField(ctx, size, {
    base: "#4a5a48",
    patch: ["#3a4a38", "#4a5a48", "#5a6a58", "#6a7a68", "#7a8a78", "#5a5048"],
  }, 300 + variant);

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.55, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function paintOrganicBone(ctx, size, variant) {
  paintMicroField(ctx, size, {
    base: "#9a8868",
    patch: ["#8a7858", "#9a8868", "#aa9878", "#b8a888", "#c8b898"],
  }, 400 + variant);
}

function paintOrganicFluid(ctx, size, regionId, variant) {
  const isRain = regionId === "ai";
  paintMicroField(ctx, size, {
    base: isRain ? "#285868" : "#582028",
    patch: isRain
      ? ["#285868", "#386878", "#487888", "#588898", "#6898a8"]
      : ["#582028", "#683038", "#784048", "#885058", "#986068"],
  }, 500 + variant);
}

function cacheKey(tile, regionId, variant) {
  return `${tile}:${regionId}:${variant}`;
}

function getTileTexture(tile, regionId, tx, ty) {
  const region = regionId ?? "hub";
  const variant = hash(tx, ty, tile * 31) % VARIANTS;
  const key = cacheKey(tile, region, variant);
  if (TILE_CACHE.has(key)) return TILE_CACHE.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const tctx = canvas.getContext("2d");

  switch (tile) {
    case T.GROUND:
      paintOrganicGround(tctx, 32, region, variant);
      break;
    case T.PATH:
      paintOrganicPath(tctx, 32, region, variant);
      break;
    case T.RIDGE:
      paintOrganicRidge(tctx, 32, variant);
      break;
    case T.FLUID:
      paintOrganicFluid(tctx, 32, region, variant);
      break;
    case T.BONE:
      paintOrganicBone(tctx, 32, variant);
      break;
    default:
      paintOrganicGround(tctx, 32, region, variant);
      break;
  }

  TILE_CACHE.set(key, canvas);
  return canvas;
}

/**
 * 有機的な苔・草地タイル。VOID は false。
 */
export function drawFieldTile(ctx, px, py, tile, regionId, tx, ty, dither, tileSize = 32) {
  if (tile === T.VOID) return false;

  const tex = getTileTexture(tile, regionId, tx, ty);
  ctx.drawImage(tex, px, py, tileSize, tileSize);

  if (tile === T.FLUID) {
    const pulse = 0.08 + Math.sin(dither * 2 + tx * 0.4 + ty * 0.3) * 0.06;
    const isRain = regionId === "ai";
    ctx.fillStyle = isRain ? `rgba(120, 200, 240, ${pulse})` : `rgba(220, 60, 80, ${pulse})`;
    ctx.fillRect(px + 4, py + 6, tileSize - 8, tileSize - 12);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(px + 8, py + 10, tileSize - 16, 2);
  }

  return true;
}

export function getFieldMinimapColor(tile, regionId) {
  if (tile === T.GROUND && regionId && REGION_MOSS[regionId]) {
    return REGION_MOSS[regionId].patch[3];
  }
  if (tile === T.PATH && regionId && REGION_DIRT[regionId]) {
    return REGION_DIRT[regionId].patch[2];
  }
  return FIELD_MINIMAP[tile] ?? FIELD_MINIMAP[T.GROUND];
}
