import { loadImage, keyBlack } from "./sprites.js";
import { REGION_ART } from "./entity-icons.js";

const SCENERY_BY_REGION = {
  ki: { tree: "summer_tree", flower: "summer_flower" },
  nu: { tree: "autumn_tree", flower: "autumn_flower" },
  ai: { tree: "rain_tree", flower: "rain_flower" },
  raku: { tree: "sunset_tree", flower: "sunset_flower" },
};

const TREE_COUNT = 8;
const FLOWER_COUNT = 12;
const TREE_BASE = 168;
const FLOWER_BASE = 92;

let sceneryImages = null;
const keyedCache = new Map();

function hash(n) {
  return ((n * 2654435761) >>> 0) / 4294967295;
}

function getKeyed(img) {
  if (!img?.src) return img;
  if (!keyedCache.has(img.src)) keyedCache.set(img.src, keyBlack(img, 40));
  return keyedCache.get(img.src);
}

export async function loadScenery(basePath) {
  const images = {};
  const jobs = [];
  for (const [regionId, cfg] of Object.entries(SCENERY_BY_REGION)) {
    const art = REGION_ART[regionId];
    for (const name of [cfg.tree, cfg.flower]) {
      const key = `${art}:${name}`;
      jobs.push(
        loadImage(`${basePath}/${art}/${name}.png`).then((img) => {
          images[key] = img;
        })
      );
    }
  }
  await Promise.all(jobs);
  sceneryImages = images;
  keyedCache.clear();
  return images;
}

export function getSceneryImage(art, type) {
  return sceneryImages?.[`${art}:${type}`] ?? null;
}

export function spawnProps(world, TILE, isWalkable) {
  const props = [];
  let id = 0;

  for (const region of world.regions) {
    const cfg = SCENERY_BY_REGION[region.id];
    if (!cfg) continue;
    const art = REGION_ART[region.id] ?? "giger";

    const plan = [
      ...Array(TREE_COUNT).fill("tree"),
      ...Array(FLOWER_COUNT).fill("flower"),
    ];

    for (const kind of plan) {
      for (let attempt = 0; attempt < 55; attempt++) {
        const angle = hash(id + attempt * 3) * Math.PI * 2;
        const radius = 3.5 + hash(id + attempt * 7) * (region.r - 5);
        const tx = Math.round(region.cx + Math.cos(angle) * radius);
        const ty = Math.round(region.cy + Math.sin(angle) * radius);
        if (!isWalkable(world.tiles, tx, ty)) continue;
        if (Math.hypot(tx - region.cx, ty - region.cy) < 3) continue;

        const type = kind === "tree" ? cfg.tree : cfg.flower;
        const scale =
          kind === "tree"
            ? 1.0 + hash(id * 11) * 0.65
            : 0.65 + hash(id * 13) * 0.5;

        props.push({
          id: `p${id++}`,
          type,
          kind,
          art,
          region: region.id,
          x: tx * TILE + TILE / 2 + (hash(id) - 0.5) * 14,
          y: ty * TILE + TILE / 2 + (hash(id * 2) - 0.5) * 10,
          scale,
          phase: hash(id * 5) * Math.PI * 2,
        });
        break;
      }
    }
  }

  return props;
}

export function drawProps(ctx, props, camera, time) {
  if (!sceneryImages) return;

  const sorted = [...props].sort((a, b) => a.y - b.y);
  for (const p of sorted) {
    const img = sceneryImages[`${p.art}:${p.type}`];
    if (!img) continue;

    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    const base = p.kind === "tree" ? TREE_BASE : FLOWER_BASE;
    const size = base * p.scale;
    if (sx < -size || sy < -size * 1.2 || sx > ctx.canvas.width + size || sy > ctx.canvas.height + size) {
      continue;
    }

    const bob = Math.sin(time * 0.7 + p.phase) * (p.kind === "tree" ? 1.2 : 2.8);
    const keyed = getKeyed(img);
    const footY = sy + bob;

    ctx.save();
    ctx.globalAlpha = p.kind === "tree" ? 0.94 : 0.88;
    ctx.drawImage(keyed, sx - size / 2, footY - size, size, size);
    ctx.restore();
  }
}
