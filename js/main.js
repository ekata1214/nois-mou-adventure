import {
  TILE,
  COLS,
  ROWS,
  T,
  PALETTE,
  createWorld,
  canMove,
  getAreaName,
  getRegionAt,
  REGION_TINT,
  isWalkable,
} from "./world.js";
import { drawSprite, loadSprites } from "./sprites.js";
import {
  loadSoul,
  saveSoul,
  feedSoul,
  tickSoul,
  getMoveSpeed,
  isMalfunctioning,
  getMoodLabel,
  getHumanGauge,
  applyEncounterChoice,
  damageHp,
  isDead,
  resumeAfterGameOver,
  resetProgress,
  HP_MAX,
} from "./soul.js";
import {
  ENTITY_DEFS,
  spawnEntities,
  updateEntities,
  findNearby,
  drawEntity,
  randomCombatStyle,
  getEntityLine,
  resolveChoice,
} from "./entities.js";
import {
  unlockAudio,
  preloadVoices,
  playVoice,
  playClip,
  voiceForFeedKind,
  voiceForChoice,
  voiceForTimeOfDay,
} from "./audio.js";
import {
  unlockBgm,
  preloadBgm,
  setBgmEnabled,
  onMapRegionChange,
  getBgmRegionKey,
} from "./bgm.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const titleScreen = document.getElementById("title-screen");
const hud = document.getElementById("hud");
const shellScreen = document.getElementById("shell-screen");
const encounterScreen = document.getElementById("encounter-screen");
const combatFlash = document.getElementById("combat-flash");
const combatTypeEl = document.getElementById("combat-type");
const entityNameEl = document.getElementById("entity-name");
const entityLineEl = document.getElementById("entity-line");
const entityVisualEl = document.getElementById("entity-visual");
const choiceResultEl = document.getElementById("choice-result");
const encounterCloseBtn = document.getElementById("encounter-close");
const areaLabel = document.getElementById("area-label");
const moodLabel = document.getElementById("mood-label");
const feedInput = document.getElementById("feed-input");
const feedBtn = document.getElementById("feed-btn");
const feedLog = document.getElementById("feed-log");
const muuSpeech = document.getElementById("muu-speech");
const darkFill = document.getElementById("dark-fill");
const hpFill = document.getElementById("hp-fill");
const humanFill = document.getElementById("human-fill");
const shellHpFill = document.getElementById("shell-hp-fill");
const shellHumanFill = document.getElementById("shell-human-fill");
const gameoverScreen = document.getElementById("gameover-screen");
const retryBtn = document.getElementById("retry-btn");
const fullResetBtn = document.getElementById("full-reset-btn");
const toShellBtn = document.getElementById("to-shell");
const toNouBtn = document.getElementById("to-nou");
const shellMuu = document.getElementById("shell-muu");
const choiceButtons = document.querySelectorAll(".choice-grid button");

const BASE_SPEED = 185;
const SPRITE_W = 54;
const SPRITE_H = 58;

let state = "title";
let mode = "extrovert";
let world;
let player;
let sprites;
let entities;
let soul;
let camera = { x: 0, y: 0 };
let keys = new Set();
let touch = { x: 0, y: 0, active: false, originX: 0, originY: 0 };
let lastTime = 0;
let dither = 0;
let glitch = 0;
let activeEntity = null;
let encounterLocked = false;
let encounterCooldown = 0;
let saveTimer = 0;
let lowHpVoiceTimer = 0;
let currentMapRegion = "";
let pendingMapRegion = "";
let regionStableTimer = 0;

function pulseMuu(ms = 500) {
  if (!shellMuu) return;
  shellMuu.classList.add("speaking");
  setTimeout(() => shellMuu.classList.remove("speaking"), ms);
}

function beginPlay() {
  unlockAudio();
  unlockBgm();
  startGame();
}

function initWorld() {
  world = createWorld();
  player = {
    x: world.spawnX,
    y: world.spawnY,
    w: 28,
    h: 20,
    dir: "front",
  };
  entities = spawnEntities(world, TILE, isWalkable);
}

function startGame() {
  titleScreen.classList.add("hidden");
  if (isDead(soul)) {
    triggerGameOver();
    return;
  }
  hud.classList.remove("hidden");
  canvas.classList.remove("hidden");
  state = "play";
  mode = "extrovert";
  shellScreen.classList.add("hidden");
  encounterScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  setBgmEnabled(true);
  currentMapRegion = "";
  pendingMapRegion = "";
  regionStableTimer = 0;
  refreshSoulUI();
}

function triggerGameOver() {
  if (state === "gameover") return;
  state = "gameover";
  encounterScreen.classList.add("hidden");
  shellScreen.classList.add("hidden");
  canvas.classList.add("hidden");
  hud.classList.add("hidden");
  gameoverScreen.classList.remove("hidden");
  activeEntity = null;
  encounterLocked = false;
  saveSoul(soul);
  setBgmEnabled(false);
  playVoice("gameover", { volume: 0.9, force: true });
}

function retryFromDeath() {
  soul = resumeAfterGameOver(soul);
  state = "play";
  gameoverScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  enterShell();
  playVoice("shell_idle", { volume: 0.7 });
  pulseMuu(600);
  muuSpeech.textContent = soul.lastReply;
  refreshSoulUI();
}

function fullReset() {
  soul = resetProgress(soul);
  state = "play";
  gameoverScreen.classList.add("hidden");
  initWorld();
  player.x = world.spawnX;
  player.y = world.spawnY;
  hud.classList.remove("hidden");
  canvas.classList.add("hidden");
  shellScreen.classList.remove("hidden");
  mode = "introvert";
  muuSpeech.textContent = soul.lastReply;
  refreshSoulUI();
}

function enterShell() {
  if (activeEntity) return;
  const fromNou = mode === "extrovert";
  mode = "introvert";
  shellScreen.classList.remove("hidden");
  canvas.classList.add("hidden");
  encounterScreen.classList.add("hidden");
  refreshSoulUI();
  muuSpeech.textContent = soul.lastReply;
  if (fromNou) {
    playClip(voiceForTimeOfDay(), 0.72);
    pulseMuu(700);
  }
  setBgmEnabled(false);
}

function enterNou() {
  if (isDead(soul)) {
    muuSpeech.textContent = "……";
    return;
  }
  mode = "extrovert";
  shellScreen.classList.add("hidden");
  canvas.classList.remove("hidden");
  refreshSoulUI();
  setBgmEnabled(true);
  currentMapRegion = "";
  pendingMapRegion = "";
  playVoice("nou_enter", { volume: 0.5 });
}

function refreshGauges() {
  const hp = soul.hp ?? HP_MAX;
  const human = getHumanGauge(soul);
  const hpPct = `${hp}%`;
  const humanPct = `${human}%`;

  hpFill.style.width = hpPct;
  humanFill.style.width = humanPct;
  shellHpFill.style.width = hpPct;
  shellHumanFill.style.width = humanPct;

  const maxed = human >= 99.5;
  humanFill.classList.toggle("max", maxed);
  shellHumanFill.classList.toggle("max", maxed);
}

function refreshSoulUI() {
  darkFill.style.width = `${soul.darkEntity}%`;
  moodLabel.textContent = getMoodLabel(soul);
  refreshGauges();
  feedLog.innerHTML = soul.feeds
    .slice(0, 5)
    .map(
      (f) =>
        `<li><span class="tag">${f.kind}</span>${escapeHtml(f.text.slice(0, 60))}${f.text.length > 60 ? "…" : ""}</li>`
    )
    .join("");
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function submitFeed() {
  const { soul: next, reply, kind } = feedSoul(soul, feedInput.value);
  soul = next;
  if (reply) {
    muuSpeech.textContent = reply;
    feedInput.value = "";
    refreshSoulUI();
    if (kind) {
      playVoice(voiceForFeedKind(kind), { volume: 0.88 });
      pulseMuu(800);
    }
  }
}

function showCombatFlash(style) {
  combatFlash.classList.remove("hidden", "action", "rpg");
  combatFlash.classList.add(style);
  combatTypeEl.textContent =
    style === "action" ? "COMBAT — ACTION (ZELDA)" : "COMBAT — RPG (DRAGON QUEST)";
  setTimeout(() => {
    combatFlash.classList.add("hidden");
    combatFlash.classList.remove(style);
  }, 450);
}

function openEncounter(entity) {
  if (encounterLocked || encounterCooldown > 0 || isDead(soul)) return;

  soul = damageHp(soul, 5);
  refreshGauges();
  if (isDead(soul)) {
    triggerGameOver();
    return;
  }

  activeEntity = entity;
  encounterLocked = true;
  encounterScreen.classList.remove("hidden");
  choiceResultEl.textContent = "";
  encounterCloseBtn.classList.add("hidden");
  choiceButtons.forEach((b) => (b.disabled = false));

  const def = ENTITY_DEFS[entity.type];
  const style = randomCombatStyle();
  showCombatFlash(style);

  entityNameEl.textContent = def.name;
  entityLineEl.textContent = getEntityLine(entity);
  entityVisualEl.style.background = `radial-gradient(circle at 40% 35%, ${def.core}, ${def.color} 70%)`;
  entityVisualEl.style.boxShadow = `0 0 50px ${def.color}55`;
  playVoice("encounter_open", { volume: 0.8 });
}

function closeEncounter() {
  encounterScreen.classList.add("hidden");
  activeEntity = null;
  encounterLocked = false;
  encounterCooldown = 1.2;
  combatTypeEl.textContent = "";
}

function handleChoice(choiceKey) {
  if (!activeEntity) return;
  playVoice(voiceForChoice(choiceKey), { volume: 0.85 });
  const result = resolveChoice(activeEntity, choiceKey);
  soul = applyEncounterChoice(soul, choiceKey, result);
  choiceResultEl.textContent = result.message;
  choiceButtons.forEach((b) => (b.disabled = true));
  encounterCloseBtn.classList.remove("hidden");
  refreshSoulUI();

  if (soul.darkEntity > 85) glitch = 0.4;
  if (isDead(soul)) {
    closeEncounter();
    triggerGameOver();
  }
}

function updateMapBgm(dt) {
  if (state !== "play" || mode !== "extrovert") return;

  const region = getRegionAt(player.x / TILE, player.y / TILE);
  const key = getBgmRegionKey(region);

  if (key === currentMapRegion) {
    pendingMapRegion = "";
    regionStableTimer = 0;
    return;
  }

  if (key !== pendingMapRegion) {
    pendingMapRegion = key;
    regionStableTimer = 0;
    return;
  }

  regionStableTimer += dt;
  if (regionStableTimer >= 0.35) {
    currentMapRegion = key;
    pendingMapRegion = "";
    regionStableTimer = 0;
    onMapRegionChange(key);
  }
}

function updatePlayer(dt) {
  if (encounterLocked || isDead(soul)) return;

  const speed = getMoveSpeed(BASE_SPEED, soul);
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

  if (touch.active) {
    dx = touch.x;
    dy = touch.y;
  }

  if (isMalfunctioning(soul) && Math.random() < 0.03) {
    dx += (Math.random() - 0.5) * 2;
    dy += (Math.random() - 0.5) * 2;
    glitch = 0.15;
  }

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    if (Math.abs(dx) > Math.abs(dy)) {
      player.dir = dx > 0 ? "right" : "left";
    } else {
      player.dir = dy > 0 ? "front" : "back";
    }
  }

  const nx = player.x + dx * speed * dt;
  if (canMove(world.tiles, nx - player.w / 2, player.y - player.h, player.w, player.h)) {
    player.x = nx;
  }
  const ny = player.y + dy * speed * dt;
  if (canMove(world.tiles, player.x - player.w / 2, ny - player.h, player.w, player.h)) {
    player.y = ny;
  }

  const near = findNearby(entities, player.x, player.y);
  if (near) openEncounter(near);

  areaLabel.textContent = `${getAreaName(player.x, player.y)} / ${getMoodLabel(soul)}`;
  moodLabel.textContent = getMoodLabel(soul);
}

function updateCamera() {
  const targetX = player.x - canvas.width / 2;
  const targetY = player.y - canvas.height / 2;
  camera.x = Math.max(0, Math.min(targetX, world.width - canvas.width));
  camera.y = Math.max(0, Math.min(targetY, world.height - canvas.height));
}

function drawVoidGrain() {
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTile(x, y, tile, tx, ty) {
  const pal = PALETTE[tile] ?? PALETTE[T.VOID];
  const px = x - camera.x;
  const py = y - camera.y;

  ctx.fillStyle = pal.base;
  ctx.fillRect(px, py, TILE, TILE);

  if (tile !== T.VOID) {
    const region = getRegionAt(tx, ty);
    const tint = region?.id && REGION_TINT[region.id];
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(px, py, TILE, TILE);
    }
  }

  const stripe = (tx + ty + Math.floor(dither * 2)) % 3 === 0;
  if (stripe && tile !== T.VOID) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(px, py + 8, TILE, 3);
  }

  if (tile === T.FLUID) {
    const pulse = 0.15 + Math.sin(dither * 2 + tx * 0.4 + ty * 0.3) * 0.08;
    ctx.fillStyle = `rgba(200, 40, 60, ${pulse})`;
    ctx.fillRect(px + 4, py + 6, TILE - 8, TILE - 10);
  }

  if (tile === T.RIDGE) {
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tile !== T.VOID && (tx * 7 + ty * 13) % 5 === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(px + 10, py + 14, 2, 2);
  }
}

function drawWorld() {
  const c0 = Math.floor(camera.x / TILE);
  const r0 = Math.floor(camera.y / TILE);
  const c1 = Math.ceil((camera.x + canvas.width) / TILE);
  const r1 = Math.ceil((camera.y + canvas.height) / TILE);

  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (row < 0 || col < 0 || row >= ROWS || col >= COLS) continue;
      drawTile(col * TILE, row * TILE, world.tiles[row][col], col, row);
    }
  }
}

function drawEntities() {
  for (const e of entities) drawEntity(ctx, e, camera, dither);
}

function drawDarkEntity() {
  if (soul.darkEntity < 20) return;
  const alpha = (soul.darkEntity / 100) * 0.35;
  ctx.fillStyle = `rgba(80, 0, 20, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGlitch() {
  if (glitch <= 0) return;
  glitch -= 0.016;
  ctx.fillStyle = `rgba(229, 9, 20, ${glitch * 0.4})`;
  ctx.fillRect(0, Math.random() * canvas.height, canvas.width, 4);
}

function drawRedFrame() {
  const pulse = soul.darkEntity > 50 ? 0.55 : 0.35;
  ctx.strokeStyle = `rgba(229, 9, 20, ${pulse})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
}

function drawPlayer() {
  const img = sprites[player.dir];
  if (!img) return;
  const sx = player.x - camera.x;
  const sy = player.y - camera.y;

  const warmth = soul.brainWarmth ?? 0;
  const width = SPRITE_W * (1 + warmth * 0.05);
  const height = SPRITE_H * (1 - warmth * 0.03);
  drawSprite(ctx, img, sx, sy, width, height);

  const r = 229 + warmth * 20;
  const g = 9 - warmth * 40;
  const glow = 0.12 + Math.max(0, warmth) * 0.25;
  ctx.fillStyle = `rgba(${r}, ${Math.max(0, g)}, 20, ${glow})`;
  ctx.beginPath();
  ctx.arc(sx, sy - height + 16, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawMinimap() {
  const mw = 140;
  const mh = 105;
  const pad = 14;
  const mx = canvas.width - mw - pad;
  const my = pad;

  ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = "rgba(229, 9, 20, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, mh);

  const sx = mw / COLS;
  const sy = mh / ROWS;
  for (let row = 0; row < ROWS; row += 2) {
    for (let col = 0; col < COLS; col += 2) {
      const tile = world.tiles[row][col];
      if (tile === T.VOID) continue;
      const pal = PALETTE[tile] ?? PALETTE[T.GROUND];
      ctx.fillStyle = pal.base;
      ctx.fillRect(mx + col * sx, my + row * sy, sx * 2 + 1, sy * 2 + 1);
    }
  }

  for (const e of entities) {
    if (!e.alive) continue;
    const def = ENTITY_DEFS[e.type];
    ctx.fillStyle = def.color;
    ctx.fillRect(mx + (e.x / TILE) * sx - 1, my + (e.y / TILE) * sy - 1, 3, 3);
  }

  ctx.fillStyle = "#fff";
  ctx.fillRect(mx + (player.x / TILE) * sx - 2, my + (player.y / TILE) * sy - 2, 4, 4);
}

function draw() {
  drawVoidGrain();
  drawWorld();
  drawEntities();
  drawPlayer();
  drawDarkEntity();
  drawGlitch();
  drawRedFrame();
  drawMinimap();
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  dither += dt;

  if (encounterCooldown > 0) encounterCooldown -= dt;

  if (state === "play") {
    soul = tickSoul(soul, dt, {
      playing: true,
      inNou: mode === "extrovert",
    });
    refreshGauges();

    saveTimer += dt;
    if (saveTimer > 12) {
      saveSoul(soul);
      saveTimer = 0;
    }

    if (isDead(soul)) triggerGameOver();
  }

  if (state === "play" && mode === "extrovert" && !isDead(soul)) {
    const hp = soul.hp ?? HP_MAX;
    if (hp < 22) {
      lowHpVoiceTimer += dt;
      if (lowHpVoiceTimer > 18) {
        playVoice("low_hp", { volume: 0.45 });
        lowHpVoiceTimer = 0;
      }
    } else {
      lowHpVoiceTimer = 0;
    }
  }

  if (state === "play" && mode === "introvert") {
    refreshSoulUI();
  }

  if (state === "play" && mode === "extrovert") {
    if (!encounterLocked) {
      updateEntities(entities, dt, world.tiles, TILE, (tiles, x, y, w, h) =>
        canMove(tiles, x, y, w, h)
      );
    }
    updatePlayer(dt);
    updateMapBgm(dt);
    updateCamera();
    draw();
  }

  requestAnimationFrame(loop);
}

function bindInput() {
  window.addEventListener("keydown", (e) => {
    if (state === "title" && (e.code === "Space" || e.code === "Enter")) {
      beginPlay();
      return;
    }
    if (state !== "play") return;

    if (e.code === "Tab" && !encounterLocked) {
      e.preventDefault();
      if (mode === "extrovert") enterShell();
      else enterNou();
      return;
    }

    if (mode === "extrovert" && !encounterLocked && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  titleScreen.addEventListener("click", beginPlay);
  retryBtn.addEventListener("click", retryFromDeath);
  fullResetBtn.addEventListener("click", fullReset);
  toShellBtn.addEventListener("click", enterShell);
  toNouBtn.addEventListener("click", enterNou);
  feedBtn.addEventListener("click", submitFeed);
  encounterCloseBtn.addEventListener("click", closeEncounter);

  choiceButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleChoice(btn.dataset.choice));
  });

  feedInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitFeed();
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "extrovert" || encounterLocked) return;
    touch.active = true;
    touch.originX = e.clientX;
    touch.originY = e.clientY;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!touch.active || mode !== "extrovert" || encounterLocked) return;
    const dx = e.clientX - touch.originX;
    const dy = e.clientY - touch.originY;
    const m = 48;
    touch.x = Math.max(-1, Math.min(1, dx / m));
    touch.y = Math.max(-1, Math.min(1, dy / m));
  });
  const endTouch = () => {
    touch.active = false;
    touch.x = 0;
    touch.y = 0;
  };
  canvas.addEventListener("pointerup", endTouch);
  canvas.addEventListener("pointerleave", endTouch);
}

async function boot() {
  soul = loadSoul();
  initWorld();
  preloadVoices();
  preloadBgm();
  sprites = await loadSprites("assets/muu");
  bindInput();
  refreshSoulUI();
  requestAnimationFrame(loop);
}

boot();
