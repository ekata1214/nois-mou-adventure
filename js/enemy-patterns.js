/** 敵行動パターン — アクション戦闘用 */

export const PATTERNS = {
  rush: {
    id: "rush",
    label: "突進",
    speed: 1.15,
    telegraph: 0,
    charge: false,
  },
  strafe: {
    id: "strafe",
    label: "牽制",
    speed: 0.85,
    telegraph: 0,
    charge: false,
    strafe: true,
  },
  charger: {
    id: "charger",
    label: "溜め",
    speed: 0.55,
    telegraph: 0.85,
    charge: true,
    chargeSpeed: 2.4,
    chargeDamage: 1.45,
  },
  skittish: {
    id: "skittish",
    label: "逃げ",
    speed: 0.7,
    telegraph: 0,
    charge: false,
    flee: true,
  },
};

const TYPE_PATTERN_POOL = {
  anger: ["rush", "charger"],
  joy: ["strafe", "rush"],
  void: ["skittish", "charger"],
  anxiety: ["skittish", "strafe"],
  love: ["strafe", "rush"],
  guilt: ["charger", "rush"],
  envy: ["rush", "strafe"],
  hope: ["strafe", "skittish"],
  loneliness: ["skittish", "charger"],
  curiosity: ["strafe", "charger"],
};

export function pickPatternForEntity(entity, regionId) {
  const pool = TYPE_PATTERN_POOL[entity.type] ?? ["rush", "strafe"];
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if (regionId === "nu" && Math.random() < 0.35) pick = "charger";
  if (regionId === "raku" && Math.random() < 0.3) pick = "strafe";
  return PATTERNS[pick] ?? PATTERNS.rush;
}

export function patternLabel(pattern) {
  return pattern?.label ?? "—";
}
