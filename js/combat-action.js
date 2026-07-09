/** ゼルダ風トップダウン・アクション戦闘 */

export const ACTION_KIND = {
  SLASH: "slash",
  PUNCH: "punch",
  DODGE: "dodge",
  GUARD: "guard",
  FLEE: "flee",
};

export const ACTION_LABELS = {
  slash: "切る",
  punch: "殴る",
  dodge: "避ける",
  guard: "ガード",
  flee: "逃げる",
};

export const ENCOUNTER_ZOOM = 2.45;
export const ZOOM_OUT_DURATION = 0.55;
export const ARENA_RADIUS = 250;

const ENEMY_HP = 42;
const CONTACT_DAMAGE = 9;
const CONTACT_INTERVAL = 0.85;
const SLASH_COOLDOWN = 0.4;
const SLASH_DAMAGE = 14;
const SLASH_RANGE = 46;
const SLASH_ARC = Math.PI * 0.72;
const SLASH_DURATION = 0.34;
const PUNCH_COOLDOWN = 0.26;
const PUNCH_DAMAGE = 9;
const PUNCH_RANGE = 30;
const PUNCH_ARC = Math.PI * 0.55;
const PUNCH_DURATION = 0.22;
const ENEMY_SPEED = 88;
const WIN_PAUSE = 1.35;
const FLEE_CHARGE = 1.15;
const FLEE_EDGE = 52;
const DODGE_DURATION = 0.32;
const DODGE_COOLDOWN = 0.75;
const DODGE_SPEED = 320;
const GUARD_DAMAGE_MUL = 0.18;
const IFRAME_GUARD = 0.08;

const DIR_VECTORS = {
  front: { x: 0, y: 1 },
  back: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createActionCombat(entity, arenaCenter, opts = {}) {
  const diff = opts.difficulty ?? {};
  const hpMult = diff.enemyHpMult ?? 1;
  const maxHp = Math.round(ENEMY_HP * hpMult);
  const pattern = opts.pattern ?? entity?.pattern ?? null;

  return {
    entity,
    pattern,
    enemyHp: maxHp,
    enemyMaxHp: maxHp,
    enemySpeed: ENEMY_SPEED * (diff.enemySpeedMult ?? 1),
    contactDamage: Math.round(CONTACT_DAMAGE * (diff.enemyDamageMult ?? 1)),
    attackCooldown: 0,
    punchCooldown: 0,
    dodgeCooldown: 0,
    swingPhase: 0,
    punchPhase: 0,
    swingDir: { x: 0, y: 1 },
    punchDir: { x: 0, y: 1 },
    hitThisSwing: false,
    hitThisPunch: false,
    phase: "fight",
    winTimer: 0,
    stunTimer: 0,
    flashTimer: 0,
    dodgeTimer: 0,
    dodgeDir: { x: 0, y: 1 },
    guardActive: false,
    guardTimer: 0,
    contactTimer: CONTACT_INTERVAL * 0.4,
    fleeCharge: 0,
    arenaCenter: { ...arenaCenter },
    arenaRadius: ARENA_RADIUS,
    outcomeMessage: "",
    rewardsApplied: false,
    lastActionKind: null,
    telegraphTimer: 0,
    charging: false,
    chargeDir: { x: 0, y: 1 },
    strafeAngle: Math.random() * Math.PI * 2,
  };
}

function aimDirection(player, input, fallback) {
  if (input.moveX !== 0 || input.moveY !== 0) {
    const len = Math.hypot(input.moveX, input.moveY) || 1;
    return { x: input.moveX / len, y: input.moveY / len };
  }
  return DIR_VECTORS[player.dir] ?? fallback ?? DIR_VECTORS.front;
}

function clampToArena(x, y, center, radius) {
  const dx = x - center.x;
  const dy = y - center.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= radius) return { x, y, dist, atEdge: dist > radius - FLEE_EDGE };
  const scale = radius / dist;
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
    dist: radius,
    atEdge: true,
  };
}

function distFromArenaEdge(x, y, center, radius) {
  return radius - Math.hypot(x - center.x, y - center.y);
}

function hasIframes(combat) {
  return combat.dodgeTimer > 0;
}

function tryMeleeHit(combat, player, cfg) {
  const e = combat.entity;
  const dx = e.x - player.x;
  const dy = e.y - player.y;
  const edist = Math.hypot(dx, dy);
  const angleToEnemy = Math.atan2(dy, dx);
  const swingAngle = Math.atan2(cfg.dir.y, cfg.dir.x);
  let angleDiff = angleToEnemy - swingAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  if (edist > cfg.range || Math.abs(angleDiff) > cfg.arc / 2) return false;

  combat.enemyHp -= cfg.damage;
  combat.stunTimer = cfg.stun ?? 0.28;
  combat.flashTimer = 0.12;
  combat.lastActionKind = cfg.kind;

  if (edist > 0) {
    const kb = cfg.knockback ?? 18;
    e.x -= (dx / edist) * kb;
    e.y -= (dy / edist) * kb;
    const clamped = clampToArena(e.x, e.y, combat.arenaCenter, combat.arenaRadius);
    e.x = clamped.x;
    e.y = clamped.y;
  }

  if (combat.enemyHp <= 0) {
    combat.phase = "win";
    combat.winTimer = 0;
    e.alive = false;
  }
  return true;
}

export function updateActionCombat(combat, player, dt, input) {
  const e = combat.entity;
  const events = {};

  if (combat.phase === "win" || combat.phase === "lose" || combat.phase === "fled") {
    combat.winTimer += dt;
    if (combat.flashTimer > 0) combat.flashTimer -= dt;
    return {
      over: combat.winTimer >= (combat.phase === "fled" ? 0.55 : WIN_PAUSE),
      victory: combat.phase === "win",
      fled: combat.phase === "fled",
      events,
    };
  }

  const arenaPos = clampToArena(player.x, player.y, combat.arenaCenter, combat.arenaRadius);
  player.x = arenaPos.x;
  player.y = arenaPos.y;

  combat.guardActive = Boolean(input.guardHeld) && combat.dodgeTimer <= 0 && combat.swingPhase <= 0 && combat.punchPhase <= 0;
  if (combat.guardActive) {
    combat.guardTimer = (combat.guardTimer ?? 0) + dt;
  } else {
    combat.guardTimer = 0;
  }

  if (combat.dodgeTimer > 0) {
    combat.dodgeTimer -= dt;
    player.x += combat.dodgeDir.x * DODGE_SPEED * dt;
    player.y += combat.dodgeDir.y * DODGE_SPEED * dt;
    const afterDodge = clampToArena(player.x, player.y, combat.arenaCenter, combat.arenaRadius);
    player.x = afterDodge.x;
    player.y = afterDodge.y;
  }

  if (combat.stunTimer > 0) {
    combat.stunTimer -= dt;
  } else if (!hasIframes(combat)) {
    const edx = player.x - e.x;
    const edy = player.y - e.y;
    const edist = Math.hypot(edx, edy) || 1;
    const nx = edx / edist;
    const ny = edy / edist;
    const p = combat.pattern;
    let chase = (combat.guardActive ? combat.enemySpeed * 0.72 : combat.enemySpeed) * (p?.speed ?? 1);

    if (p?.charge) {
      if (!combat.charging && edist < 120 && combat.telegraphTimer <= 0) {
        combat.telegraphTimer = p.telegraph ?? 0.8;
        combat.chargeDir = { x: nx, y: ny };
      }
      if (combat.telegraphTimer > 0) {
        combat.telegraphTimer -= dt;
        if (combat.telegraphTimer <= 0) combat.charging = true;
      } else if (combat.charging) {
        chase *= p.chargeSpeed ?? 2.4;
        e.x += combat.chargeDir.x * chase * dt;
        e.y += combat.chargeDir.y * chase * dt;
        if (edist > 140) combat.charging = false;
      } else {
        e.x += nx * chase * dt * 0.35;
        e.y += ny * chase * dt * 0.35;
      }
    } else if (p?.strafe) {
      combat.strafeAngle += dt * 2.2;
      const sx = Math.cos(combat.strafeAngle) * chase * dt;
      const sy = Math.sin(combat.strafeAngle) * chase * dt;
      e.x += nx * chase * dt * 0.45 + sx;
      e.y += ny * chase * dt * 0.45 + sy;
    } else if (p?.flee && edist < 90) {
      e.x -= nx * chase * dt;
      e.y -= ny * chase * dt;
    } else {
      e.x += nx * chase * dt;
      e.y += ny * chase * dt;
    }

    const enemyPos = clampToArena(e.x, e.y, combat.arenaCenter, combat.arenaRadius);
    e.x = enemyPos.x;
    e.y = enemyPos.y;
  }

  combat.contactTimer = (combat.contactTimer ?? 0) + dt;
  const touchDist = Math.hypot(player.x - e.x, player.y - e.y);
  if (touchDist < 34 && combat.contactTimer >= CONTACT_INTERVAL && !hasIframes(combat)) {
    combat.contactTimer = 0;
    let dmg = combat.contactDamage ?? CONTACT_DAMAGE;
    if (combat.charging) dmg = Math.round(dmg * (combat.pattern?.chargeDamage ?? 1.4));
    if (combat.guardActive) {
      dmg *= GUARD_DAMAGE_MUL;
      if (combat.guardTimer > 0.35 && combat.charging) {
        combat.stunTimer = 0.55;
        combat.charging = false;
        combat.telegraphTimer = 0;
        combat.enemyHp -= 22;
        events.guardCounter = true;
        if (combat.enemyHp <= 0) {
          combat.phase = "win";
          combat.winTimer = 0;
          e.alive = false;
        }
      }
    }
    events.playerHit = dmg;
    if (combat.guardActive) events.guardHit = true;
  }

  if (combat.attackCooldown > 0) combat.attackCooldown -= dt;
  if (combat.punchCooldown > 0) combat.punchCooldown -= dt;
  if (combat.dodgeCooldown > 0) combat.dodgeCooldown -= dt;
  if (combat.flashTimer > 0) combat.flashTimer -= dt;

  const edgeDist = distFromArenaEdge(player.x, player.y, combat.arenaCenter, combat.arenaRadius);
  if (input.fleeHeld && combat.dodgeTimer <= 0) {
    combat.fleeCharge = Math.min(FLEE_CHARGE, combat.fleeCharge + dt);
    if (combat.fleeCharge >= FLEE_CHARGE || edgeDist < FLEE_EDGE) {
      combat.phase = "fled";
      combat.winTimer = 0;
      events.fled = true;
      return { over: false, victory: false, fled: false, events };
    }
  } else if (input.fleeJustPressed && edgeDist < FLEE_EDGE) {
    combat.phase = "fled";
    combat.winTimer = 0;
    events.fled = true;
    return { over: false, victory: false, fled: false, events };
  } else if (!input.fleeHeld) {
    combat.fleeCharge = Math.max(0, combat.fleeCharge - dt * 2.5);
  }

  if (input.dodgeJustPressed && combat.dodgeCooldown <= 0 && !combat.guardActive) {
    combat.dodgeTimer = DODGE_DURATION;
    combat.dodgeCooldown = DODGE_COOLDOWN;
    combat.dodgeDir = aimDirection(player, input, combat.dodgeDir);
    combat.lastActionKind = ACTION_KIND.DODGE;
    events.dodged = true;
  }

  if (combat.swingPhase > 0) {
    combat.swingPhase -= dt;
    const swingT = 1 - combat.swingPhase / SLASH_DURATION;
    if (!combat.hitThisSwing && swingT > 0.28 && swingT < 0.62) {
      if (
        tryMeleeHit(combat, player, {
          dir: combat.swingDir,
          range: SLASH_RANGE,
          arc: SLASH_ARC,
          damage: SLASH_DAMAGE,
          kind: ACTION_KIND.SLASH,
          knockback: 22,
        })
      ) {
        combat.hitThisSwing = true;
        events.enemyHit = ACTION_KIND.SLASH;
      }
    }
  } else if (input.slashJustPressed && combat.attackCooldown <= 0 && !combat.guardActive && combat.dodgeTimer <= 0) {
    combat.swingPhase = SLASH_DURATION;
    combat.hitThisSwing = false;
    combat.attackCooldown = SLASH_COOLDOWN;
    combat.swingDir = aimDirection(player, input, combat.swingDir);
    combat.lastActionKind = ACTION_KIND.SLASH;
    events.attacked = ACTION_KIND.SLASH;
  }

  if (combat.punchPhase > 0) {
    combat.punchPhase -= dt;
    const punchT = 1 - combat.punchPhase / PUNCH_DURATION;
    if (!combat.hitThisPunch && punchT > 0.32 && punchT < 0.72) {
      if (
        tryMeleeHit(combat, player, {
          dir: combat.punchDir,
          range: PUNCH_RANGE,
          arc: PUNCH_ARC,
          damage: PUNCH_DAMAGE,
          kind: ACTION_KIND.PUNCH,
          knockback: 10,
          stun: 0.18,
        })
      ) {
        combat.hitThisPunch = true;
        events.enemyHit = ACTION_KIND.PUNCH;
      }
    }
  } else if (input.punchJustPressed && combat.punchCooldown <= 0 && !combat.guardActive && combat.dodgeTimer <= 0) {
    combat.punchPhase = PUNCH_DURATION;
    combat.hitThisPunch = false;
    combat.punchCooldown = PUNCH_COOLDOWN;
    combat.punchDir = aimDirection(player, input, combat.punchDir);
    combat.lastActionKind = ACTION_KIND.PUNCH;
    events.attacked = ACTION_KIND.PUNCH;
  }

  return {
    over: false,
    victory: false,
    fled: false,
    events,
    edgeDist,
    fleeCharge: combat.fleeCharge,
    guardActive: combat.guardActive,
  };
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

  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const ex = e.x - camera.x;
  const ey = e.y - camera.y;

  if (combat.telegraphTimer > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 80, 40, ${0.35 + (1 - combat.telegraphTimer) * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, 28 + (1 - combat.telegraphTimer) * 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (combat.guardActive) {
    ctx.save();
    ctx.strokeStyle = `rgba(140, 190, 255, ${0.45 + Math.sin(dither * 8) * 0.12})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(100, 160, 255, 0.08)";
    ctx.fill();
    ctx.restore();
  }

  if (combat.dodgeTimer > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(242, 242, 242, 0.12)";
    ctx.beginPath();
    ctx.arc(px - combat.dodgeDir.x * 8, py - combat.dodgeDir.y * 8, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (combat.swingPhase > 0) {
    const swingT = 1 - combat.swingPhase / SLASH_DURATION;
    const reach = SLASH_RANGE * (0.5 + swingT * 0.55);
    const baseAngle = Math.atan2(combat.swingDir.y, combat.swingDir.x);
    const arcStart = baseAngle - SLASH_ARC / 2 + swingT * 0.5;
    const arcEnd = baseAngle + SLASH_ARC / 2;

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

  if (combat.punchPhase > 0) {
    const punchT = 1 - combat.punchPhase / PUNCH_DURATION;
    const reach = PUNCH_RANGE * (0.6 + punchT * 0.5);
    const ang = Math.atan2(combat.punchDir.y, combat.punchDir.x);
    const hx = px + Math.cos(ang) * reach;
    const hy = py + Math.sin(ang) * reach;
    ctx.save();
    ctx.fillStyle = `rgba(255, 200, 160, ${0.5 * (1 - punchT)})`;
    ctx.beginPath();
    ctx.arc(hx, hy, 10 + punchT * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (combat.fleeCharge > 0.05) {
    const pct = combat.fleeCharge / FLEE_CHARGE;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(px - 30, py - 48, 60, 5);
    ctx.fillStyle = `rgba(180, 180, 200, ${0.5 + pct * 0.5})`;
    ctx.fillRect(px - 30, py - 48, 60 * pct, 5);
    ctx.restore();
  }

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

  if (combat.phase === "fled") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#c8c8d0";
    ctx.font = "600 20px Helvetica Neue, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("……距離を置いた。", canvas.width / 2, canvas.height / 2);
  }
}
