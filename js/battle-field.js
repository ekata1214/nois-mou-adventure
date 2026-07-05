import { T, getTilePalette, REGION_TINT } from "./world.js";
import { keyBlack } from "./sprites.js";
import { getSceneryImage } from "./props.js";
import { REGION_ART } from "./entity-icons.js";

export const BATTLE_TILE = 32;
export const BATTLE_COLS = 40;
export const BATTLE_ROWS = 23;
export const BATTLE_W = BATTLE_COLS * BATTLE_TILE;
export const BATTLE_H = BATTLE_ROWS * BATTLE_TILE;

const REGION_BATTLE = {
  ki: {
    label: "黄色の夏",
    sky: ["#0e0c08", "#2a2410", "#6a5a18", "#c8a830"],
    glow: "rgba(255, 220, 60, 0.22)",
    tree: "summer_tree",
    flower: "summer_flower",
    particles: "pollen",
  },
  nu: {
    label: "赤色の秋",
    sky: ["#080404", "#241008", "#4a2010", "#8a3818"],
    glow: "rgba(210, 70, 45, 0.24)",
    tree: "autumn_tree",
    flower: "autumn_flower",
    particles: "leaves",
  },
  ai: {
    label: "水色の梅雨",
    sky: ["#04080c", "#0c1820", "#183040", "#285878"],
    glow: "rgba(120, 200, 235, 0.2)",
    tree: "rain_tree",
    flower: "rain_flower",
    particles: "rain",
  },
  raku: {
    label: "オレンジの夕方",
    sky: ["#0c0604", "#281408", "#502010", "#904020"],
    glow: "rgba(255, 130, 50, 0.22)",
    tree: "sunset_tree",
    flower: "sunset_flower",
    particles: "embers",
  },
  hub: {
    label: "始まりの交差点",
    sky: ["#060608", "#141018", "#241c28", "#3a3040"],
    glow: "rgba(180, 120, 200, 0.12)",
    tree: "summer_tree",
    flower: "summer_flower",
    particles: "pollen",
  },
};

function hash(x, y, s = 31) {
  let n = x * 374761393 + y * 668265263 + s * 982451653;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function noise(x, y, s = 31) {
  return hash(x, y, s) / 4294967295;
}

function generateTiles(regionId) {
  const tiles = Array.from({ length: BATTLE_ROWS }, () => new Uint8Array(BATTLE_COLS));
  const cx = BATTLE_COLS / 2;
  const cy = BATTLE_ROWS / 2 + 0.5;

  for (let row = 0; row < BATTLE_ROWS; row++) {
    for (let col = 0; col < BATTLE_COLS; col++) {
      const n = noise(col, row, regionId?.length ?? 3);
      const n2 = noise(col * 2, row * 2, 7);
      const dist = Math.hypot(col - cx, row - cy);
      const oval = Math.hypot((col - cx) / 1.15, (row - cy) / 0.92);

      if (oval > 12.5 + n * 1.8) {
        tiles[row][col] = T.GROUND;
      } else if (oval < 2.8 || (Math.abs(col - cx) < 1.2 && oval < 9) || (Math.abs(row - cy) < 1.1 && oval < 8)) {
        tiles[row][col] = T.PATH;
      } else if (n2 > 0.86 && oval < 10) {
        tiles[row][col] = T.RIDGE;
      } else if (regionId === "ai" && n > 0.72 && oval < 7) {
        tiles[row][col] = T.FLUID;
      } else {
        tiles[row][col] = T.GROUND;
      }
    }
  }
  return tiles;
}

function generateProps(cfg, art) {
  const props = [];
  const trees = [
    { x: 140, y: 300, scale: 4.8, layer: "back", phase: 0.2 },
    { x: 420, y: 260, scale: 5.4, layer: "back", phase: 1.1 },
    { x: 760, y: 290, scale: 5.1, layer: "back", phase: 2.4 },
    { x: 1040, y: 320, scale: 4.6, layer: "back", phase: 0.8 },
    { x: 260, y: 340, scale: 3.6, layer: "mid", phase: 1.7 },
    { x: 980, y: 360, scale: 3.4, layer: "mid", phase: 2.9 },
  ];

  for (const tree of trees) {
    props.push({
      ...tree,
      type: cfg.tree,
      kind: "tree",
      art,
    });
  }

  for (let i = 0; i < 10; i++) {
    props.push({
      x: 80 + i * 118 + (i % 2) * 30,
      y: 430 + (i % 3) * 28,
      scale: 2.1 + (i % 4) * 0.35,
      layer: i % 2 === 0 ? "mid" : "front",
      phase: i * 0.9,
      type: cfg.flower,
      kind: "flower",
      art,
    });
  }

  return props.sort((a, b) => a.y - b.y);
}

export function createBattleField(regionId) {
  const id = REGION_BATTLE[regionId] ? regionId : "hub";
  const cfg = REGION_BATTLE[id];
  const art = REGION_ART[id] ?? "giger";
  return {
    regionId: id,
    art,
    cfg,
    tiles: generateTiles(id),
    props: generateProps(cfg, art),
    width: BATTLE_W,
    height: BATTLE_H,
  };
}

export function enterBattleField(field, player, entity) {
  const cx = field.width / 2;
  const cy = field.height / 2 - 10;
  player.x = cx;
  player.y = cy + 108;
  entity.x = cx + (hash(entity.id?.length ?? 3, 1) / 4294967295 - 0.5) * 80;
  entity.y = cy - 96;
  return { center: { x: cx, y: cy }, radius: 210 };
}

export function canMoveBattleField(field, x, y, w, h) {
  const pts = [
    [x + 6, y + 8],
    [x + w - 6, y + 8],
    [x + 6, y + h - 4],
    [x + w - 6, y + h - 4],
  ];
  const cx = field.width / 2;
  const cy = field.height / 2 - 10;
  return pts.every(([px, py]) => {
    const dist = Math.hypot(px - cx, py - cy);
    if (dist > 228) return false;
    const col = Math.floor(px / BATTLE_TILE);
    const row = Math.floor(py / BATTLE_TILE);
    if (row < 0 || col < 0 || row >= BATTLE_ROWS || col >= BATTLE_COLS) return false;
    const tile = field.tiles[row][col];
    return tile !== T.RIDGE && tile !== T.FLUID;
  });
}

function drawSky(ctx, w, h, cfg) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  cfg.sky.forEach((color, i) => g.addColorStop(i / (cfg.sky.length - 1), color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.35, h * 0.75);
  glow.addColorStop(0, cfg.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawBattleTiles(ctx, field, time) {
  const { tiles, regionId } = field;
  for (let row = 0; row < BATTLE_ROWS; row++) {
    for (let col = 0; col < BATTLE_COLS; col++) {
      const tile = tiles[row][col];
      const pal = getTilePalette(tile, regionId);
      const px = col * BATTLE_TILE;
      const py = row * BATTLE_TILE;
      ctx.fillStyle = pal.base;
      ctx.fillRect(px, py, BATTLE_TILE, BATTLE_TILE);

      if (REGION_TINT[regionId]) {
        ctx.fillStyle = REGION_TINT[regionId];
        ctx.fillRect(px, py, BATTLE_TILE, BATTLE_TILE);
      }

      if ((col + row + Math.floor(time * 2)) % 3 === 0) {
        ctx.fillStyle = pal.accent;
        ctx.fillRect(px, py + 8, BATTLE_TILE, 3);
      }

      if (tile === T.FLUID) {
        const pulse = 0.2 + Math.sin(time * 2 + col * 0.4 + row * 0.3) * 0.1;
        ctx.fillStyle = `rgba(120, 200, 235, ${pulse})`;
        ctx.fillRect(px + 4, py + 6, BATTLE_TILE - 8, BATTLE_TILE - 10);
      }

      if (tile === T.RIDGE) {
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(px + BATTLE_TILE / 2, py + BATTLE_TILE / 2, BATTLE_TILE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawBattleProp(ctx, p, time) {
  const raw = getSceneryImage(p.art, p.type);
  if (!raw) return;
  const img = keyBlack(raw, p.kind === "tree" ? 40 : 36);

  const base = p.kind === "tree" ? 168 : 92;
  const size = base * p.scale;
  const bob = Math.sin(time * 0.7 + p.phase) * (p.kind === "tree" ? 2 : 4);
  const alpha = p.layer === "back" ? 0.9 : p.layer === "mid" ? 0.94 : 0.98;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, p.x - size / 2, p.y - size + bob, size, size);
  ctx.restore();
}

function drawAtmosphere(ctx, w, h, kind, time) {
  if (kind === "rain") {
    ctx.strokeStyle = "rgba(150, 210, 240, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const x = (i * 53 + time * 180) % w;
      const y = (i * 37 + time * 320) % h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 12);
      ctx.stroke();
    }
  }

  if (kind === "leaves") {
    ctx.fillStyle = "rgba(220, 90, 40, 0.18)";
    for (let i = 0; i < 24; i++) {
      const x = (i * 97 + time * 40) % w;
      const y = (i * 61 + time * 55) % (h * 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 2, i + time, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (kind === "pollen") {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.15, 0, w * 0.5, 0, h * 0.65);
    g.addColorStop(0, "rgba(255, 220, 60, 0.08)");
    g.addColorStop(1, "rgba(255, 220, 60, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  if (kind === "embers") {
    const g = ctx.createLinearGradient(0, h * 0.25, 0, h);
    g.addColorStop(0, "rgba(255, 120, 50, 0)");
    g.addColorStop(1, "rgba(255, 100, 40, 0.08)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

export function drawBattleField(ctx, canvas, field, time, scale = 1) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  const offsetY = Math.max(0, (h - BATTLE_H) / 2);
  ctx.translate(0, offsetY);

  drawSky(ctx, w, BATTLE_H, field.cfg);
  drawBattleTiles(ctx, field, time);

  for (const p of field.props) {
    if (p.layer === "back") drawBattleProp(ctx, p, time);
  }
  for (const p of field.props) {
    if (p.layer === "mid") drawBattleProp(ctx, p, time);
  }

  drawAtmosphere(ctx, w, BATTLE_H, field.cfg.particles, time);

  ctx.restore();
}

export function drawBattleFieldForeground(ctx, canvas, field, time, scale = 1) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const offsetY = Math.max(0, (h - BATTLE_H) / 2);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  ctx.translate(0, offsetY);

  for (const p of field.props) {
    if (p.layer === "front") drawBattleProp(ctx, p, time);
  }

  ctx.restore();
}

export function getBattleAreaLabel(field) {
  return `NOU — ${field.cfg.label}`;
}
