/** Canvas 2D 用の宇宙（VOID）表現 — 殻モードと NOU の void タイルで共有 */

function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

function rand01(x, y, salt = 0) {
  return (hash2(x + salt * 97, y + salt * 131) & 0xffff) / 0xffff;
}

function drawStarFlare(ctx, x, y, size, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(x, y);

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.35);
  core.addColorStop(0, `rgba(255,255,255,${alpha})`);
  core.addColorStop(0.35, `rgba(210,235,255,${alpha * 0.65})`);
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(230,245,255,${alpha * 0.75})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.08, size, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 画面全体の深宇宙背景（カメラに連動してわずかにパララックス） */
export function drawVoidCosmosBackground(ctx, width, height, cameraX = 0, cameraY = 0, time = 0) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const parallaxX = cameraX * 0.04;
  const parallaxY = cameraY * 0.04;
  const twinkle = 0.85 + Math.sin(time * 0.15) * 0.08;

  for (let i = 0; i < 420; i += 1) {
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

  for (let i = 0; i < 18; i += 1) {
    const wx = (i * 811 + 101) % 4096;
    const wy = (i * 613 + 211) % 4096;
    const sx = ((wx - parallaxX) % width + width) % width;
    const sy = ((wy - parallaxY) % height + height) % height;
    const pulse = 0.55 + Math.sin(time * (0.65 + (i % 4) * 0.12) + i * 1.7) * 0.35;
    drawStarFlare(ctx, sx, sy, 10 + (i % 5) * 2.5, pulse * 0.55);
  }
}

/** VOID タイル1枚ぶんの星（ワールド座標で固定） */
export function drawVoidTileCosmos(ctx, px, py, tileSize, tx, ty, time = 0) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(px, py, tileSize, tileSize);

  const starCount = 5 + (hash2(tx, ty) % 4);
  for (let i = 0; i < starCount; i += 1) {
    const rx = rand01(tx, ty, i * 3 + 1);
    const ry = rand01(tx, ty, i * 3 + 2);
    const sx = px + 4 + rx * (tileSize - 8);
    const sy = py + 4 + ry * (tileSize - 8);
    const flicker = 0.5 + Math.sin(time * (0.8 + (i % 3) * 0.15) + hash2(tx + i, ty) * 0.001) * 0.4;
    const bright = rand01(tx, ty, i + 40) > 0.82;
    if (bright) {
      drawStarFlare(ctx, sx, sy, 5 + rand01(tx, ty, i + 50) * 4, flicker * 0.7);
    } else {
      ctx.fillStyle = `rgba(235,245,255,${0.25 + flicker * 0.45})`;
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }
  }

  if (rand01(tx, ty, 99) > 0.93) {
    const nx = px + tileSize * rand01(tx, ty, 100);
    const ny = py + tileSize * rand01(tx, ty, 101);
    const neb = ctx.createRadialGradient(nx, ny, 0, nx, ny, tileSize * 0.55);
    neb.addColorStop(0, "rgba(80,120,200,0.06)");
    neb.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = neb;
    ctx.fillRect(px, py, tileSize, tileSize);
  }
}
