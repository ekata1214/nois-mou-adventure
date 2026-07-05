/** ゼルダ風トップダウン・アクション戦闘 */

/** @planned 斬る以外: 話しかける / 撫でる / 見つめる / 守る — いずれも人間らしいアクション */
export const PLANNED_ACTION_KINDS = ["slash", "talk", "pet", "watch", "guard"];

export const ENCOUNTER_ZOOM = 2.45;
export const ZOOM_OUT_DURATION = 0.55;
export const ARENA_RADIUS = 250;

const ENEMY_HP = 42;
const CONTACT_DAMAGE = 9;
const CONTACT_INTERVAL = 0.85;
const ATTACK_COOLDOWN = 0.4;
const ATTACK_DAMAGE = 14;
const ATTACK_RANGE = 46;
const ATTACK_ARC = Math.PI * 0.72;
const ENEMY_SPEED = 88;
const WIN_PAUSE = 1.35;
const SWING_DURATION = 0.34;

const DIR_VECTORS = {
  front: { x: 0, y: 1 },
  back: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createActionCombat(entity, arenaCenter) {
  return {
    entity,
    enemyHp: ENEMY_HP,
    enemyMaxHp: ENEMY_HP,
    attackCooldown: 0,
    contactTimer: CONTACT_INTERVAL * 0.4,
    swingPhase: 0,
    swingDir: { x: 0, y: 1 },
    hitThisSwing: false,
    phase: "fight",
    winTimer: 0,
    stunTimer: 0,
    flashTimer: 0,
    arenaCenter: { ...arenaCenter },
    arenaRadius: ARENA_RADIUS,
    outcomeMessage: "",
    rewardsApplied: false,
  };
}

function swingDirection(player, input) {
  if (input.attackDirX !== 0 || input.attackDirY !== 0) {
    const len = Math.hypot(input.attackDirX, input.attackDirY) || 1;
    return { x: input.attackDirX / len, y: input.attackDirY / len };
  }
  return DIR_VECTORS[player.dir] ?? DIR_VECTORS.front;
}

function clampToArena(x, y, center, radius) {
  const dx = x - center.x;
  const dy = y - center.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= radius) return { x, y };
  const scale = radius / dist;
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function updateActionCombat(combat, player, dt, input) {
  const e = combat.entity;
  const events = {};

  if (combat.phase === "win" || combat.phase === "lose") {
    combat.winTimer += dt;
    if (combat.flashTimer > 0) combat.flashTimer -= dt;
    return {
      over: combat.winTimer >= WIN_PAUSE,
      victory: combat.phase === "win",
      events,
    };
  }

  const arenaPos = clampToArena(player.x, player.y, combat.arenaCenter, combat.arenaRadius);
  player.x = arenaPos.x;
  player.y = arenaPos.y;

  if (combat.stunTimer > 0) {
    combat.stunTimer -= dt;
  } else {
    const edx = player.x - e.x;
    const edy = player.y - e.y;
    const edist = Math.hypot(edx, edy) || 1;
    const nx = e.x + (edx / edist) * ENEMY_SPEED * dt;
    const ny = e.y + (edy / edist) * ENEMY_SPEED * dt;
    const enemyPos = clampToArena(nx, ny, combat.arenaCenter, combat.arenaRadius);
    e.x = enemyPos.x;
    e.y = enemyPos.y;
  }

  combat.contactTimer += dt;
  const touchDist = Math.hypot(player.x - e.x, player.y - e.y);
  if (touchDist < 34 && combat.contactTimer >= CONTACT_INTERVAL) {
    combat.contactTimer = 0;
    events.playerHit = CONTACT_DAMAGE;
  }

  if (combat.attackCooldown > 0) combat.attackCooldown -= dt;

  if (combat.swingPhase > 0) {
    combat.swingPhase -= dt;
    const swingT = 1 - combat.swingPhase / SWING_DURATION;
    if (!combat.hitThisSwing && swingT > 0.28 && swingT < 0.62) {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const edist = Math.hypot(dx, dy);
      const angleToEnemy = Math.atan2(dy, dx);
      const swingAngle = Math.atan2(combat.swingDir.y, combat.swingDir.x);
      let angleDiff = angleToEnemy - swingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (edist < ATTACK_RANGE && Math.abs(angleDiff) < ATTACK_ARC / 2) {
        combat.enemyHp -= ATTACK_DAMAGE;
        combat.hitThisSwing = true;
        combat.stunTimer = 0.3;
        combat.flashTimer = 0.12;
        events.enemyHit = true;

        if (edist > 0) {
          e.x -= (dx / edist) * 22;
          e.y -= (dy / edist) * 22;
          const kb = clampToArena(e.x, e.y, combat.arenaCenter, combat.arenaRadius);
          e.x = kb.x;
          e.y = kb.y;
        }

        if (combat.enemyHp <= 0) {
          combat.phase = "win";
          combat.winTimer = 0;
          e.alive = false;
        }
      }
    }
  } else if (input.attackJustPressed && combat.attackCooldown <= 0) {
    combat.swingPhase = SWING_DURATION;
    combat.hitThisSwing = false;
    combat.attackCooldown = ATTACK_COOLDOWN;
    combat.swingDir = swingDirection(player, input);
    events.attacked = true;
  }

  if (combat.flashTimer > 0) combat.flashTimer -= dt;

  return { over: false, victory: false, events };
}

export function drawActionCombat(ctx, combat, player, camera, canvas, dither, entityDefs, onBattleField = false) {
  const e = combat.entity;
  const def = entityDefs[e.type];

  if (!onBattleField) {
    const cx = combat.arenaCenter.x - camera.x;
    const cy = combat.arenaCenter.y - camera.y;
    const screenR = combat.arenaRadius * (camera.zoom ?? 2.45);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.arc(cx, cy, screenR * 0.92, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.fill("evenodd");

    ctx.strokeStyle = `rgba(229, 9, 20, ${0.35 + Math.sin(dither * 3) * 0.12})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, screenR * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  } else {
    ctx.save();
    ctx.strokeStyle = `rgba(229, 9, 20, ${0.18 + Math.sin(dither * 3) * 0.06})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width * 0.34, canvas.height * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (combat.swingPhase > 0) {
    const px = player.x - camera.x;
    const py = player.y - camera.y;
    const swingT = 1 - combat.swingPhase / SWING_DURATION;
    const reach = ATTACK_RANGE * (0.5 + swingT * 0.55);
    const baseAngle = Math.atan2(combat.swingDir.y, combat.swingDir.x);
    const arcStart = baseAngle - ATTACK_ARC / 2 + swingT * 0.5;
    const arcEnd = baseAngle + ATTACK_ARC / 2;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 220, 180, ${0.55 + (1 - swingT) * 0.35})`;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(px, py, reach, arcStart, arcEnd);
    ctx.stroke();
    ctx.strokeStyle = `rgba(229, 9, 20, ${0.25 * (1 - swingT)})`;
    ctx.lineWidth = 12;
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.arc(px, py, reach * 0.85, arcStart, arcEnd);
    ctx.stroke();
    ctx.restore();
  }

  const ex = e.x - camera.x;
  const ey = e.y - camera.y;
  const hpPct = Math.max(0, combat.enemyHp / combat.enemyMaxHp);
  const barW = 56;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(ex - barW / 2, ey - 58, barW, 6);
  ctx.fillStyle = def?.color ?? "#e50914";
  ctx.fillRect(ex - barW / 2, ey - 58, barW * hpPct, 6);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ex - barW / 2, ey - 58, barW, 6);

  if (combat.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${combat.flashTimer * 3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (combat.phase === "win") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f2f2f2";
    ctx.font = "600 22px Helvetica Neue, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("……消えた。", canvas.width / 2, canvas.height / 2);
  }
}
