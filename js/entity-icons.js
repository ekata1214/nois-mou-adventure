import { loadImage, keyBlack } from "./sprites.js";

/** 喜・楽 = Hylics風 / 怒・哀 = Giger風 */
export const REGION_ART = {
  ki: "hylics",
  raku: "hylics",
  nu: "giger",
  ai: "giger",
};

export const REGION_MOTIFS = {
  ki: ["apple", "hourglass", "puzzle"],
  nu: ["tiger", "spike", "cigarette"],
  ai: ["eyeball", "ear", "fingernail", "clock"],
  raku: ["lips", "book", "computer"],
};

export const MOTIF_META = {
  lips: { label: "唇", glow: "#f472b6" },
  ear: { label: "耳", glow: "#f5c6a0" },
  eyeball: { label: "目ん玉", glow: "#e50914" },
  fingernail: { label: "ネイル", glow: "#ffb4a0" },
  hourglass: { label: "砂時計", glow: "#ffd24d" },
  apple: { label: "りんご", glow: "#e50914" },
  book: { label: "本", glow: "#c49a6c" },
  tiger: { label: "虎", glow: "#ff9a3c" },
  spike: { label: "釘", glow: "#b0b0c0" },
  clock: { label: "時計", glow: "#d0d0e0" },
  puzzle: { label: "パズル", glow: "#38bdf8" },
  cigarette: { label: "タバコ", glow: "#ff6b35" },
  computer: { label: "パソコン", glow: "#60a5fa" },
};

const HYLICS_MOTIFS = [...REGION_MOTIFS.ki, ...REGION_MOTIFS.raku];
const GIGER_MOTIFS = [...REGION_MOTIFS.nu, ...REGION_MOTIFS.ai];
const ENTITY_ICON_BASE = 88;

export function getRegionArt(regionId) {
  return REGION_ART[regionId] ?? "giger";
}

export function pickMotifForRegion(regionId) {
  const pool = REGION_MOTIFS[regionId];
  if (!pool?.length) return HYLICS_MOTIFS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function loadEntityIcons(basePath) {
  const icons = {};
  const jobs = [];
  for (const id of HYLICS_MOTIFS) {
    jobs.push(
      loadImage(`${basePath}/hylics/${id}.png`).then((img) => {
        icons[`hylics:${id}`] = img;
      })
    );
  }
  for (const id of GIGER_MOTIFS) {
    jobs.push(
      loadImage(`${basePath}/giger/${id}.png`).then((img) => {
        icons[`giger:${id}`] = img;
      })
    );
  }
  await Promise.all(jobs);
  return icons;
}

export function getEntityIconKey(entity) {
  const art = getRegionArt(entity.regionId);
  return `${art}:${entity.motif}`;
}

export function drawEntityIcon(ctx, icons, e, camera) {
  if (!e.alive) return;
  const img = icons[getEntityIconKey(e)];
  if (!img) return;

  const sx = e.x - camera.x;
  const sy = e.y - camera.y;
  const scale = e.scale ?? 1;
  const pulse = 1 + Math.sin(e.pulse) * 0.05;
  const floatY = Math.sin(e.pulse * 1.3 + e.id.length) * 5;
  const size = ENTITY_ICON_BASE * scale * pulse;
  const keyed = keyBlack(img, 36);
  const drawY = sy - floatY;
  const meta = MOTIF_META[e.motif];

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 8, size * 0.34, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  if (meta?.glow) {
    ctx.shadowColor = meta.glow;
    ctx.shadowBlur = 14;
  }

  ctx.filter = "brightness(1.15) contrast(1.2) saturate(1.15)";
  ctx.drawImage(keyed, sx - size / 2, drawY - size / 2, size, size);
  ctx.restore();
}
