import { REGION_GATHER_ITEM, itemMeta } from "./gather-craft.js";

const PER_REGION = 5;
const RESPAWN_MS = 42_000;
const PICKUP_RANGE = 38;
const PICKUP_RANGE_GATHER = 44;

function hash(n) {
  return ((n * 2654435761) >>> 0) / 4294967295;
}

export function spawnGatherables(world, TILE, isWalkable) {
  const nodes = [];
  let id = 0;

  for (const region of world.regions) {
    const itemId = REGION_GATHER_ITEM[region.id];
    if (!itemId) continue;

    for (let n = 0; n < PER_REGION; n++) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const angle = hash(id + attempt * 5) * Math.PI * 2;
        const radius = 4 + hash(id + attempt * 11) * (region.r - 6);
        const tx = Math.round(region.cx + Math.cos(angle) * radius);
        const ty = Math.round(region.cy + Math.sin(angle) * radius);
        if (!isWalkable(world.tiles, tx, ty)) continue;
        if (Math.hypot(tx - region.cx, ty - region.cy) < 3.5) continue;

        nodes.push({
          id: `g${id++}`,
          itemId,
          regionId: region.id,
          x: tx * TILE + TILE / 2 + (hash(id) - 0.5) * 10,
          y: ty * TILE + TILE / 2 + (hash(id * 3) - 0.5) * 8,
          phase: hash(id * 7) * Math.PI * 2,
          alive: true,
          respawnAt: 0,
        });
        break;
      }
    }
  }

  return nodes;
}

export function updateGatherables(nodes, now = Date.now()) {
  for (const node of nodes) {
    if (!node.alive && node.respawnAt > 0 && now >= node.respawnAt) {
      node.alive = true;
      node.respawnAt = 0;
    }
  }
}

export function findNearbyGatherable(nodes, px, py, gatherMode = false) {
  const range = gatherMode ? PICKUP_RANGE_GATHER : PICKUP_RANGE;
  let best = null;
  let bestDist = range;
  for (const node of nodes) {
    if (!node.alive) continue;
    const d = Math.hypot(node.x - px, node.y - py);
    if (d < bestDist) {
      best = node;
      bestDist = d;
    }
  }
  return best;
}

export function pickupGatherable(node, now = Date.now()) {
  node.alive = false;
  node.respawnAt = now + RESPAWN_MS;
}

export function drawGatherables(ctx, nodes, camera, time, { gatherMode = false } = {}) {
  const sorted = [...nodes].filter((n) => n.alive).sort((a, b) => a.y - b.y);

  for (const node of sorted) {
    const meta = itemMeta(node.itemId);
    const sx = node.x - camera.x;
    const sy = node.y - camera.y;
    if (sx < -40 || sy < -40 || sx > ctx.canvas.width + 40 || sy > ctx.canvas.height + 40) continue;

    const bob = Math.sin(time * 2.2 + node.phase) * 3;
    const pulse = 0.55 + Math.sin(time * 3.5 + node.phase) * 0.25;
    const r = gatherMode ? 14 + pulse * 4 : 8 + pulse * 2;
    const alpha = gatherMode ? 0.95 : 0.42;

    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.arc(sx, sy + bob, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(sx, sy + bob - 2, 0, sx, sy + bob, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, meta.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy + bob, r, 0, Math.PI * 2);
    ctx.fill();

    if (gatherMode) {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy + bob, r + 5 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
