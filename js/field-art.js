import { T } from "./world.js";

/** ミニマップ用の代表色 */
export const FIELD_MINIMAP = {
  [T.GROUND]: "#5a9e3a",
  [T.PATH]: "#8a8a82",
  [T.RIDGE]: "#6a6a68",
  [T.FLUID]: "#3a7aaa",
  [T.BONE]: "#b8a878",
};

const REGION_GRASS = {
  hub: { top: ["#7ec850", "#6db33f", "#5fa832"], side: ["#6a9838", "#5a8530"], dirt: ["#8b6914", "#6b4f10"] },
  ki: { top: ["#9ed848", "#8ecf3a", "#7ec02e"], side: ["#7aaa38", "#6a9628"], dirt: ["#9a7518", "#7a5a12"] },
  nu: { top: ["#8cb848", "#7aa83a", "#6a982e"], side: ["#6a8830", "#5a7828"], dirt: ["#8a5a18", "#6a4510"] },
  ai: { top: ["#58a868", "#48a060", "#3a9460"], side: ["#3a8860", "#2a7858"], dirt: ["#5a6848", "#4a5840"] },
  raku: { top: ["#b0a848", "#a09838", "#908830"], side: ["#887838", "#786828"], dirt: ["#9a6820", "#7a5018"] },
};

const REGION_PATH = {
  hub: { top: ["#a0a098", "#909088", "#808078"], side: ["#707068", "#606058"] },
  ki: { top: ["#b0a878", "#a09868", "#908858"], side: ["#807048", "#706040"] },
  nu: { top: ["#a88870", "#987860", "#886850"], side: ["#786048", "#685038"] },
  ai: { top: ["#7898a8", "#688898", "#587888"], side: ["#486878", "#385868"] },
  raku: { top: ["#b09870", "#a08860", "#907850"], side: ["#806848", "#705838"] },
};

function hash(x, y, s = 17) {
  let n = x * 374761393 + y * 668265263 + s * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function pick(arr, x, y, s = 0) {
  return arr[hash(x, y, s) % arr.length];
}

function fillBlockTop(ctx, px, py, size, colors, tx, ty) {
  const c = pick(colors, tx, ty, 3);
  ctx.fillStyle = c;
  ctx.fillRect(px + 2, py + 2, size - 6, size - 6);

  for (let i = 0; i < 6; i++) {
    const bx = px + 4 + (hash(tx + i, ty, 11) % (size - 10));
    const by = py + 4 + (hash(tx, ty + i, 13) % (size - 10));
    ctx.fillStyle = hash(tx + i, ty + i, 19) % 2 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(bx, by, 2, 2);
  }
}

function fillBlockSides(ctx, px, py, size, sideColors, dirtColors, tx, ty) {
  ctx.fillStyle = pick(sideColors, tx, ty, 5);
  ctx.fillRect(px + size - 5, py + 4, 4, size - 4);
  ctx.fillStyle = pick(dirtColors ?? sideColors, tx, ty, 7);
  ctx.fillRect(px + 2, py + size - 5, size - 4, 4);
}

function drawGrassBlock(ctx, px, py, size, regionId, tx, ty) {
  const pal = REGION_GRASS[regionId] ?? REGION_GRASS.hub;
  fillBlockTop(ctx, px, py, size, pal.top, tx, ty);
  fillBlockSides(ctx, px, py, size, pal.side, pal.dirt, tx, ty);
}

function drawPathBlock(ctx, px, py, size, regionId, tx, ty) {
  const pal = REGION_PATH[regionId] ?? REGION_PATH.hub;
  fillBlockTop(ctx, px, py, size, pal.top, tx, ty);
  fillBlockSides(ctx, px, py, size, pal.side, null, tx, ty);

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i < 4; i++) {
    const bx = px + 5 + (hash(tx + i * 3, ty, 23) % (size - 12));
    const by = py + 5 + (hash(tx, ty + i * 5, 29) % (size - 12));
    ctx.fillRect(bx, by, 3, 2);
  }
}

function drawRidgeBlock(ctx, px, py, size, tx, ty) {
  const grays = ["#787876", "#686866", "#585856"];
  fillBlockTop(ctx, px, py, size, grays, tx, ty);
  fillBlockSides(ctx, px, py, size, ["#50504e", "#40403e"], null, tx, ty);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(px + 4, py + 4, size - 10, 2);
}

function drawFluidBlock(ctx, px, py, size, regionId, tx, ty, dither) {
  const pulse = 0.65 + Math.sin(dither * 2 + tx * 0.4 + ty * 0.3) * 0.08;
  const blues = regionId === "ai"
    ? [`rgba(70, 150, 210, ${pulse})`, `rgba(55, 130, 190, ${pulse})`]
    : [`rgba(180, 50, 70, ${pulse})`, `rgba(150, 40, 60, ${pulse})`];
  fillBlockTop(ctx, px, py, size, blues, tx, ty);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(px + 6, py + 7, size - 14, 2);
}

function drawBoneBlock(ctx, px, py, size, tx, ty) {
  const sands = ["#c8b888", "#b8a878", "#a89868"];
  fillBlockTop(ctx, px, py, size, sands, tx, ty);
  fillBlockSides(ctx, px, py, size, ["#988858", "#887848"], null, tx, ty);
}

/**
 * Minecraft 風ブロックタイル。VOID は false を返し、呼び出し側で描画する。
 */
export function drawFieldTile(ctx, px, py, tile, regionId, tx, ty, dither, tileSize = 32) {
  if (tile === T.VOID) return false;

  switch (tile) {
    case T.GROUND:
      drawGrassBlock(ctx, px, py, tileSize, regionId ?? "hub", tx, ty);
      break;
    case T.PATH:
      drawPathBlock(ctx, px, py, tileSize, regionId ?? "hub", tx, ty);
      break;
    case T.RIDGE:
      drawRidgeBlock(ctx, px, py, tileSize, tx, ty);
      break;
    case T.FLUID:
      drawFluidBlock(ctx, px, py, tileSize, regionId, tx, ty, dither);
      break;
    case T.BONE:
      drawBoneBlock(ctx, px, py, tileSize, tx, ty);
      break;
    default:
      drawGrassBlock(ctx, px, py, tileSize, regionId ?? "hub", tx, ty);
      break;
  }

  return true;
}

export function getFieldMinimapColor(tile, regionId) {
  if (tile === T.GROUND && regionId && REGION_GRASS[regionId]) {
    return REGION_GRASS[regionId].top[1];
  }
  if (tile === T.PATH && regionId && REGION_PATH[regionId]) {
    return REGION_PATH[regionId].top[1];
  }
  return FIELD_MINIMAP[tile] ?? FIELD_MINIMAP[T.GROUND];
}

/** 遠景：VOID 外周にうっすら草原の空 */
export function drawFieldSky(ctx, width, height, cameraX, cameraY, worldW, worldH) {
  const horizonY = height * 0.42;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#6ec0e8");
  g.addColorStop(0.45, "#98d8f8");
  g.addColorStop(0.72, "#b8e898");
  g.addColorStop(1, "#5a9e3a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const hillColors = ["#4a8e32", "#3a7e28", "#5aae42"];
  for (let i = 0; i < 6; i++) {
    const baseX = ((i * 420 - cameraX * 0.08) % (width + 200)) - 100;
    const h = 40 + (i % 3) * 22;
    ctx.fillStyle = hillColors[i % hillColors.length];
    ctx.beginPath();
    ctx.moveTo(baseX, horizonY + 30);
    ctx.lineTo(baseX + 180, horizonY + 30 - h);
    ctx.lineTo(baseX + 360, horizonY + 30);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 5; i++) {
    const cx = ((i * 280 + 60 - cameraX * 0.04) % (width + 120)) - 40;
    const cy = 28 + (i % 2) * 18;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(cx, cy, 36, 10);
    ctx.fillRect(cx + 10, cy - 8, 24, 10);
    ctx.fillRect(cx + 20, cy - 14, 20, 8);
  }
}
