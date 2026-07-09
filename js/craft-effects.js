import { GATHER_ITEMS, itemMeta } from "./gather-craft.js";

const LAMP_DURATION_MS = 300_000;
const POT_GROW_MS = 120_000;

export function hasCraft(soul, id) {
  return soul.crafted?.includes(id) ?? false;
}

export function isLampActive(soul) {
  return hasCraft(soul, "warm_lamp") && (soul.lampUntil ?? 0) > Date.now();
}

export function useWarmLamp(soul) {
  if (!hasCraft(soul, "warm_lamp")) return { ok: false, msg: "まだない" };
  if (isLampActive(soul)) return { ok: false, msg: "もう灯ってる" };
  soul.lampUntil = Date.now() + LAMP_DURATION_MS;
  soul.darkEntity = Math.max(0, soul.darkEntity - 8);
  return { ok: true, msg: "……灯り、ついた。闇が遠のく。" };
}

export function pinToMemoWall(soul, text, question) {
  if (!hasCraft(soul, "memo_wall")) return { ok: false };
  const trimmed = text?.trim();
  if (!trimmed || trimmed.length < 40) return { ok: false, msg: "もう少し長く書いて" };
  soul.memoPosts = soul.memoPosts ?? [];
  soul.memoPosts.unshift({
    text: trimmed.slice(0, 280),
    question: question?.slice(0, 100) ?? "",
    at: Date.now(),
  });
  soul.memoPosts = soul.memoPosts.slice(0, 12);
  soul.humanSpark = Math.min(40, (soul.humanSpark ?? 0) + 1.2);
  return { ok: true, msg: "……壁に、貼った。" };
}

export function readMemoWall(soul) {
  if (!hasCraft(soul, "memo_wall")) return { ok: false, msg: "壁がない" };
  const posts = soul.memoPosts ?? [];
  if (!posts.length) return { ok: false, msg: "まだ何も貼ってない" };
  const post = posts[Math.floor(Math.random() * Math.min(3, posts.length))];
  soul.humanSpark = Math.min(40, (soul.humanSpark ?? 0) + 0.8);
  soul.darkEntity = Math.max(0, soul.darkEntity - 4);
  return { ok: true, msg: `「${post.text.slice(0, 48)}…」`, post };
}

export function getPotStatus(soul) {
  if (!hasCraft(soul, "grow_pot")) return { ready: false, label: "—" };
  const at = soul.potReadyAt ?? 0;
  if (at <= Date.now()) return { ready: true, label: "収穫できる" };
  const sec = Math.ceil((at - Date.now()) / 1000);
  return { ready: false, label: `あと ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` };
}

export function harvestPot(soul) {
  if (!hasCraft(soul, "grow_pot")) return { ok: false, msg: "鉢がない" };
  const at = soul.potReadyAt ?? 0;
  if (at > Date.now()) return { ok: false, msg: "まだ育ってない" };

  const keys = Object.keys(GATHER_ITEMS);
  const pick = keys[Math.floor(Math.random() * keys.length)];
  soul.inventory = soul.inventory ?? {};
  soul.inventory[pick] = (soul.inventory[pick] ?? 0) + 1;
  soul.potReadyAt = Date.now() + POT_GROW_MS;
  return { ok: true, msg: `${itemMeta(pick).name} が育った`, itemId: pick };
}

/** tickSoul から呼ぶ — ランプ等のパッシブ補正 */
export function craftTickModifiers(soul, dt, opts = {}) {
  const mods = { darkRate: 1, hpDrain: 1, shellHealBonus: 0 };

  if (isLampActive(soul)) {
    mods.darkRate *= 0.45;
    if (opts.inShell) mods.shellHealBonus += 0.15;
  }

  if (hasCraft(soul, "memo_wall") && (soul.memoPosts?.length ?? 0) > 0) {
    mods.darkRate *= 0.92;
  }

  return mods;
}

export function getCraftUseButtons(soul) {
  const rows = [];
  if (hasCraft(soul, "warm_lamp")) {
    rows.push({
      id: "warm_lamp",
      label: isLampActive(soul) ? "ランプ点灯中" : "ランプをつける",
      disabled: isLampActive(soul),
    });
  }
  if (hasCraft(soul, "memo_wall")) {
    rows.push({ id: "memo_wall_read", label: "メモを読む", disabled: !(soul.memoPosts?.length) });
    rows.push({ id: "memo_wall_pin", label: "今の答えを貼る", disabled: false });
  }
  if (hasCraft(soul, "grow_pot")) {
    const pot = getPotStatus(soul);
    rows.push({
      id: "grow_pot",
      label: pot.ready ? "鉢を収穫" : `育てる鉢 (${pot.label})`,
      disabled: !pot.ready,
    });
  }
  return rows;
}
