import { T } from "./world.js";

/** ミニマップ用の代表色 */
export const FIELD_MINIMAP = {
  [T.GROUND]: "#4a7a38",
  [T.PATH]: "#8a7a58",
  [T.RIDGE]: "#5a6a52",
  [T.FLUID]: "#3a7aaa",
  [T.BONE]: "#a89868",
};

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

const PATTERN_SIZE = 128;
const MICRO = 4;
const patternCache = new Map();

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
    }
  }
}

function makePattern(key, paintFn) {
  if (patternCache.has(key)) return patternCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = PATTERN_SIZE;
  canvas.height = PATTERN_SIZE;
  const pctx = canvas.getContext("2d");
  paintFn(pctx, PATTERN_SIZE);
  const pattern = pctx.createPattern(canvas, "repeat");
  patternCache.set(key, pattern);
  return pattern;
}

function mossPattern(regionId) {
  const region = regionId ?? "hub";
  return makePattern(`moss:${region}`, (pctx, size) => {
    paintMicroField(pctx, size, REGION_MOSS[region] ?? REGION_MOSS.hub, 100);
  });
}

function dirtPattern(regionId) {
  const region = regionId ?? "hub";
  return makePattern(`dirt:${region}`, (pctx, size) => {
    paintMicroField(pctx, size, REGION_DIRT[region] ?? REGION_DIRT.hub, 200);
  });
}

function ridgePattern() {
  return makePattern("ridge", (pctx, size) => {
    paintMicroField(pctx, size, {
      base: "#4a5a48",
      patch: ["#3a4a38", "#4a5a48", "#5a6a58", "#6a7a68", "#7a8a78"],
    }, 300);
  });
}

function bonePattern() {
  return makePattern("bone", (pctx, size) => {
    paintMicroField(pctx, size, {
      base: "#9a8868",
      patch: ["#8a7858", "#9a8868", "#aa9878", "#b8a888"],
    }, 400);
  });
}

/** 起動時にテクスチャを先に作る（初回フレームのフリーズ防止） */
export function prewarmFieldCache() {
  for (const region of ["hub", "ki", "nu", "ai", "raku"]) {
    mossPattern(region);
    dirtPattern(region);
  }
  ridgePattern();
  bonePattern();
}

export function drawFieldTile(ctx, px, py, tile, regionId, tx, ty, dither, tileSize = 32) {
  if (tile === T.VOID) return false;

  const region = regionId ?? "hub";

  switch (tile) {
    case T.GROUND:
      ctx.fillStyle = mossPattern(region);
      ctx.fillRect(px, py, tileSize, tileSize);
      break;
    case T.PATH:
      ctx.fillStyle = dirtPattern(region);
      ctx.fillRect(px, py, tileSize, tileSize);
      break;
    case T.RIDGE:
      ctx.fillStyle = ridgePattern();
      ctx.fillRect(px, py, tileSize, tileSize);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(px + 4, py + tileSize - 8, tileSize - 8, 6);
      break;
    case T.BONE:
      ctx.fillStyle = bonePattern();
      ctx.fillRect(px, py, tileSize, tileSize);
      break;
    case T.FLUID: {
      const isRain = region === "ai";
      ctx.fillStyle = isRain ? "rgba(40, 88, 104, 0.92)" : "rgba(88, 32, 40, 0.92)";
      ctx.fillRect(px, py, tileSize, tileSize);
      const pulse = 0.12 + Math.sin(dither * 2 + tx * 0.4 + ty * 0.3) * 0.08;
      ctx.fillStyle = isRain ? `rgba(120, 200, 240, ${pulse})` : `rgba(220, 60, 80, ${pulse})`;
      ctx.fillRect(px + 3, py + 5, tileSize - 6, tileSize - 10);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(px + 7, py + 9, tileSize - 14, 2);
      break;
    }
    default:
      ctx.fillStyle = mossPattern(region);
      ctx.fillRect(px, py, tileSize, tileSize);
      break;
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
