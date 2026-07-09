/** 遭遇難易度 — 連勝で上がり、連敗で救済 */

export function getDifficulty(soul) {
  const encounters = soul.totalEncounters ?? 0;
  const winStreak = soul.winStreak ?? 0;
  const loseStreak = soul.loseStreak ?? 0;
  const human = soul.humanSpark ?? 0;

  let tier = 1 + Math.floor(encounters / 8) * 0.12;
  tier += winStreak * 0.06;
  tier -= loseStreak * 0.08;
  tier += human * 0.008;

  const chapter = soul.chapter ?? 0;
  tier += chapter * 0.05;

  return {
    tier: Math.max(0.75, Math.min(2.2, tier)),
    enemyHpMult: Math.max(0.85, Math.min(1.65, tier)),
    enemySpeedMult: Math.max(0.9, Math.min(1.35, 0.95 + (tier - 1) * 0.4)),
    enemyDamageMult: Math.max(0.85, Math.min(1.45, tier)),
    playerDamageMult: Math.max(0.9, Math.min(1.15, 1.05 - loseStreak * 0.03)),
    rpgHpMult: Math.max(0.85, Math.min(1.35, tier)),
    mercy: loseStreak >= 2,
    pressure: winStreak >= 3,
  };
}

export function recordEncounterOutcome(soul, victory) {
  if (victory) {
    soul.winStreak = (soul.winStreak ?? 0) + 1;
    soul.loseStreak = 0;
  } else {
    soul.loseStreak = (soul.loseStreak ?? 0) + 1;
    soul.winStreak = 0;
  }
  return soul;
}

export function scaleRpgOutcome(result, diff) {
  const mult = diff.rpgHpMult;
  return {
    ...result,
    hpDelta: Math.round((result.hpDelta ?? 0) * mult),
    darkDelta: Math.round((result.darkDelta ?? 0) * (diff.mercy ? 0.82 : 1)),
  };
}
