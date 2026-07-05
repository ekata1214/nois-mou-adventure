/** Canvas 2D 用の宇宙（VOID）表現 — NOU の void タイル */

const VOID_STARS_SRC = "assets/void/void-stars.png";
const TILE_PX = 1024;

const voidStarsImage = new Image();
let voidStarsReady = false;
let voidStarsFailed = false;

voidStarsImage.decoding = "async";
voidStarsImage.onload = () => {
  voidStarsReady = true;
};
voidStarsImage.onerror = () => {
  voidStarsFailed = true;
};
voidStarsImage.src = VOID_STARS_SRC;

export function preloadVoidCosmos() {
  return new Promise((resolve) => {
    if (voidStarsReady || voidStarsFailed) {
      resolve(voidStarsReady);
      return;
    }
    voidStarsImage.addEventListener("load", () => resolve(true), { once: true });
    voidStarsImage.addEventListener("error", () => resolve(false), { once: true });
  });
}

function drawTiledStars(ctx, width, height, parallaxX, parallaxY) {
  const scale = 1;
  const tile = TILE_PX * scale;
  const ox = ((-parallaxX * 0.35) % tile + tile) % tile;
  const oy = ((-parallaxY * 0.35) % tile + tile) % tile;
  const startX = -ox - tile;
  const startY = -oy - tile;

  for (let y = startY; y < height + tile; y += tile) {
    for (let x = startX; x < width + tile; x += tile) {
      ctx.drawImage(voidStarsImage, x, y, tile, tile);
    }
  }
}

function drawFallbackStars(ctx, width, height, parallaxX, parallaxY, time) {
  const twinkle = 0.85 + Math.sin(time * 0.15) * 0.08;
  const dimCount = Math.floor(420 * 0.35);
  const flareCount = Math.floor(18 * 0.35);

  for (let i = 0; i < dimCount; i += 1) {
    const wx = (i * 173 + 29) % 4096;
    const wy = (i * 251 + 53) % 4096;
    const sx = ((wx - parallaxX * 0.35) % width + width) % width;
    const sy = ((wy - parallaxY * 0.35) % height + height) % height;
    const flicker = 0.45 + Math.sin(time * (0.5 + (i % 7) * 0.09) + i) * 0.35;
    const a = 0.18 + flicker * 0.35;
    const size = (i % 9 === 0 ? 1.6 : 1) * twinkle;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(sx, sy, size, size);
  }

  for (let i = 0; i < flareCount; i += 1) {
    const wx = (i * 811 + 101) % 4096;
    const wy = (i * 613 + 211) % 4096;
    const sx = ((wx - parallaxX) % width + width) % width;
    const sy = ((wy - parallaxY) % height + height) % height;
    const pulse = 0.55 + Math.sin(time * (0.65 + (i % 4) * 0.12) + i * 1.7) * 0.35;
    const size = 10 + (i % 5) * 2.5;
    const alpha = pulse * 0.55;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(sx, sy);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.35);
    core.addColorStop(0, `rgba(255,255,255,${alpha})`);
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 画面全体の深宇宙背景（星テクスチャ + パララックス） */
export function drawVoidCosmosBackground(ctx, width, height, cameraX = 0, cameraY = 0, time = 0) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const parallaxX = cameraX * 0.04;
  const parallaxY = cameraY * 0.04;

  if (voidStarsReady) {
    drawTiledStars(ctx, width, height, parallaxX, parallaxY);
  } else {
    drawFallbackStars(ctx, width, height, parallaxX, parallaxY, time);
  }
}

/** VOID タイル — 画像ベースなので追加の星は控えめに */
export function drawVoidTileCosmos(ctx, px, py, tileSize, tx, ty) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.fillRect(px, py, tileSize, tileSize);

  if ((tx + ty) % 11 === 0) {
    ctx.strokeStyle = "rgba(229, 9, 20, 0.04)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
  }
}
