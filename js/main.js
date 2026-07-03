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
  getTilePalette,
  isWalkable,
  isInVoid,
  VOID_REALM,
} from "./world.js";
import { drawSprite, loadSprites } from "./sprites.js";
import { loadEntityIcons, MOTIF_META, getRegionArt } from "./entity-icons.js";
import {
  loadSoul,
  saveSoul,
  answerShellQuestion,
  tickSoul,
  getMoveSpeed,
  isMalfunctioning,
  getMoodLabel,
  getHumanGauge,
  applyEncounterChoice,
  isDead,
  resumeAfterGameOver,
  resetProgress,
  HP_MAX,
} from "./soul.js";
import {
  ENTITY_DEFS,
  CHOICE,
  spawnEntities,
  updateEntities,
  findNearby,
  drawEntity,
  randomCombatStyle,
  getEntityLine,
  resolveChoice,
} from "./entities.js";
import {
  createActionCombat,
  updateActionCombat,
  drawActionCombat,
} from "./combat-action.js";
import {
  stepEncounterTransition,
  drawEncounterTransition,
  isTransitionPhase,
  ENCOUNTER_PHASE,
  ZOOM_OUT_DURATION,
} from "./encounter-transition.js";
import {
  createBattleField,
  enterBattleField,
  canMoveBattleField,
  drawBattleField,
  drawBattleFieldForeground,
  getBattleAreaLabel,
} from "./battle-field.js";
import {
  unlockAudio,
  preloadVoices,
  playVoice,
  playClip,
  playFootstep,
  voiceForFeedKind,
  voiceForChoice,
  voiceForTimeOfDay,
} from "./audio.js";
import {
  unlockBgm,
  preloadBgm,
  setBgmEnabled,
  onMapRegionChange,
  onShellBgmStart,
  getBgmRegionKey,
} from "./bgm.js";
import { spawnProps, drawProps, loadScenery } from "./props.js";
import { pickShellQuestion, SHELL_ANSWER_MIN } from "./shell-questions.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const titleScreen = document.getElementById("title-screen");
const hud = document.getElementById("hud");
const shellScreen = document.getElementById("shell-screen");
const encounterScreen = document.getElementById("encounter-screen");
const encounterPanel = document.querySelector(".encounter-panel");
const combatFlash = document.getElementById("combat-flash");
const combatTypeEl = document.getElementById("combat-type");
const actionCombatHud = document.getElementById("action-combat-hud");
const actionEntityNameEl = document.getElementById("action-entity-name");
const actionEnemyHpFill = document.getElementById("action-enemy-hp-fill");
const actionAttackBtn = document.getElementById("action-attack-btn");
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
const feedCharCount = document.getElementById("feed-char-count");
const muuSpeech = document.getElementById("muu-speech");
const shellQuestionEl = document.getElementById("shell-question");
const darkFill = document.getElementById("dark-fill");
const hpFill = document.getElementById("hp-fill");
const humanFill = document.getElementById("human-fill");
const shellHpFill = document.getElementById("shell-hp-fill");
const shellHumanFill = document.getElementById("shell-human-fill");
const gameoverScreen = document.getElementById("gameover-screen");
const gameoverTitle = document.getElementById("gameover-title");
const gameoverLine = document.getElementById("gameover-line");
const retryBtn = document.getElementById("retry-btn");
const fullResetBtn = document.getElementById("full-reset-btn");
const toShellBtn = document.getElementById("to-shell");
const toNouBtn = document.getElementById("to-nou");
const shellMuu = document.getElementById("shell-muu");
const choiceButtons = document.querySelectorAll(".choice-grid button");

const BASE_SPEED = 255;
const SPRITE_W = 116;
const SPRITE_H = 80;
const SPRITE_SQUASH = 0.88;
const SHELL_MUU_SCALE = 3;
const NOU_SPRITE_SCALE = 2;

let state = "title";
let mode = "extrovert";
let world;
let player;
let sprites;
let entityIcons;
let entities;
let props;
let soul;
let camera = { x: 0, y: 0 };
let keys = new Set();
const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
let tapTarget = null;
let touch = { x: 0, y: 0, active: false, originX: 0, originY: 0 };
let lastTime = 0;
let dither = 0;
let glitch = 0;
let activeEntity = null;
let encounterLocked = false;
let encounterCooldown = 0;
let encounterPhase = null;
let combatStyle = null;
let encounterZoom = 1;
let encounterCenter = { x: 0, y: 0 };
let encounterBlackout = 0;
let encounterFlash = 0;
let encounterStripe = 0;
let battleMorph = 0;
let battleScale = 1;
let battleField = null;
let overworldSnapshot = null;
let zoomTimer = 0;
let actionCombat = null;
let attackJustPressed = false;
let saveTimer = 0;
let lowHpVoiceTimer = 0;
let currentMapRegion = "";
let pendingMapRegion = "";
let regionStableTimer = 0;
let stepDistance = 0;
let currentShellQuestion = "";
const STEP_INTERVAL = 30;

function pulseMuu(ms = 500) {
  if (!shellMuu) return;
  shellMuu.classList.add("speaking");
  setTimeout(() => shellMuu.classList.remove("speaking"), ms);
}

function drawShellMuu() {
  if (!shellMuu || !sprites?.front) return;
  const sctx = shellMuu.getContext("2d");
  const w = shellMuu.width;
  const h = shellMuu.height;
  sctx.clearRect(0, 0, w, h);

  const warmth = soul?.brainWarmth ?? 0;
  const width = SPRITE_W * SHELL_MUU_SCALE * (1 + warmth * 0.05);
  const height = SPRITE_H * SPRITE_SQUASH * SHELL_MUU_SCALE * (1 - warmth * 0.03);
  drawSprite(sctx, sprites.front, w / 2, h * 0.96, width, height);
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
  props = spawnProps(world, TILE, isWalkable);
}

function startGame() {
  titleScreen.classList.add("hidden");
  if (isDead(soul)) {
    triggerGameOverIfDead();
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
  fitCanvas();
}

function triggerGameOver({ fromVoid = false } = {}) {
  if (state === "gameover") return;
  state = "gameover";
  encounterScreen.classList.add("hidden");
  actionCombatHud.classList.add("hidden");
  shellScreen.classList.add("hidden");
  canvas.classList.add("hidden");
  hud.classList.add("hidden");
  gameoverScreen.classList.remove("hidden");
  activeEntity = null;
  encounterLocked = false;
  encounterPhase = null;
  encounterZoom = 1;
  encounterBlackout = 0;
  encounterFlash = 0;
  encounterStripe = 0;
  battleMorph = 0;
  battleScale = 1;
  battleField = null;
  overworldSnapshot = null;
  actionCombat = null;
  combatStyle = null;
  saveSoul(soul);

  if (fromVoid) {
    gameoverTitle.textContent = "VOIDに触れすぎた";
    gameoverLine.textContent =
      "ムー君は、人間の思考の中でしか生きられない。時間と空間がある、俺らの現実——ここでは、存在を保てない。";
  } else {
    gameoverTitle.textContent = "体力が尽きた";
    gameoverLine.textContent = "……";
  }

  setBgmEnabled(false);
  playVoice("gameover", { volume: 0.9, force: true });
}

function triggerGameOverIfDead() {
  if (!isDead(soul)) return;
  const fromVoid = mode === "extrovert" && isInVoid(world.tiles, player.x, player.y);
  triggerGameOver({ fromVoid });
}

function retryFromDeath() {
  soul = resumeAfterGameOver(soul);
  state = "play";
  gameoverScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  enterShell();
  playVoice("shell_idle", { volume: 0.7 });
  pulseMuu(600);
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
  presentShellQuestion();
  refreshSoulUI();
  setBgmEnabled(true);
  onShellBgmStart();
}

function presentShellQuestion() {
  currentShellQuestion = pickShellQuestion(currentShellQuestion);
  muuSpeech.textContent = currentShellQuestion;
  if (shellQuestionEl) shellQuestionEl.textContent = currentShellQuestion;
  feedInput.value = "";
  updateFeedCharCount();
  pulseMuu(500);
}

function updateFeedCharCount() {
  if (!feedCharCount) return;
  const len = feedInput.value.trim().length;
  feedCharCount.textContent = `${len} / ${SHELL_ANSWER_MIN}`;
  feedCharCount.classList.toggle("ready", len >= SHELL_ANSWER_MIN);
}

function enterShell() {
  if (activeEntity) return;
  const fromNou = mode === "extrovert";
  mode = "introvert";
  shellScreen.classList.remove("hidden");
  canvas.classList.add("hidden");
  encounterScreen.classList.add("hidden");
  presentShellQuestion();
  refreshSoulUI();
  setBgmEnabled(true);
  onShellBgmStart();
  if (fromNou) {
    playClip(voiceForTimeOfDay(), 0.72);
    pulseMuu(700);
  }
  drawShellMuu();
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
  fitCanvas();
  setBgmEnabled(true);
  currentMapRegion = "";
  pendingMapRegion = "";
  regionStableTimer = 0;
  const region = getRegionAt(player.x / TILE, player.y / TILE);
  onMapRegionChange(getBgmRegionKey(region), { force: true });
  currentMapRegion = getBgmRegionKey(region);
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
  const inVoid = state === "play" && mode === "extrovert" && isInVoid(world.tiles, player.x, player.y);
  darkFill.style.width = `${soul.darkEntity}%`;
  moodLabel.textContent = getMoodLabel(soul, { inVoid });
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
  const result = answerShellQuestion(soul, feedInput.value, currentShellQuestion, SHELL_ANSWER_MIN);
  soul = result.soul;
  if (!result.reply) return;

  muuSpeech.textContent = result.reply;
  refreshSoulUI();
  updateFeedCharCount();

  if (result.ok) {
    feedInput.value = "";
    updateFeedCharCount();
    playVoice(voiceForFeedKind(result.kind ?? "philosophical"), { volume: 0.88 });
    pulseMuu(800);
    setTimeout(presentShellQuestion, 2200);
  } else {
    playVoice("feed_negative", { volume: 0.55 });
    pulseMuu(400);
  }
}

function showEncounterFlash() {
  combatTypeEl.textContent = "";
}

function prepEncounterUI(entity) {
  const def = ENTITY_DEFS[entity.type];
  const motifMeta = MOTIF_META[entity.motif];
  entityNameEl.textContent = motifMeta?.label ?? def.name;
  entityLineEl.textContent = getEntityLine(entity);
  entityVisualEl.src = entity.motif
    ? `assets/icons/${getRegionArt(entity.regionId)}/${entity.motif}.png`
    : "";
  entityVisualEl.alt = motifMeta?.label ?? def.name;
  entityVisualEl.style.filter = `drop-shadow(0 0 28px ${motifMeta?.glow ?? def.color}99)`;
  actionEntityNameEl.textContent = motifMeta?.label ?? def.name;
}

function isBattleView() {
  return (
    battleMorph > 0 ||
    encounterPhase === "action" ||
    encounterPhase === "rpg" ||
    encounterPhase === "zoom-out"
  );
}

function restoreOverworldPositions() {
  if (!overworldSnapshot) return;
  player.x = overworldSnapshot.playerX;
  player.y = overworldSnapshot.playerY;
  if (activeEntity) {
    activeEntity.x = overworldSnapshot.entityX;
    activeEntity.y = overworldSnapshot.entityY;
  }
}

function beginCombatAfterZoom() {
  if (!activeEntity || !battleField) return;

  const layout = enterBattleField(battleField, player, activeEntity);
  encounterCenter = layout.center;
  battleMorph = 1;
  battleScale = 1;
  camera.x = 0;
  camera.y = 0;

  if (combatStyle === "rpg") {
    encounterPhase = "rpg";
    encounterScreen.classList.remove("flash-only");
    encounterScreen.classList.add("zoom-backdrop");
    encounterPanel?.classList.remove("hidden");
    combatTypeEl.textContent = "COMBAT — RPG (DRAGON QUEST)";
    choiceResultEl.textContent = "";
    encounterCloseBtn.classList.add("hidden");
    choiceButtons.forEach((b) => (b.disabled = false));
  } else {
    encounterPhase = "action";
    encounterScreen.classList.add("hidden");
    encounterScreen.classList.remove("flash-only", "zoom-backdrop");
    actionCombat = createActionCombat(activeEntity, layout.center);
    actionCombat.arenaRadius = layout.radius;
    actionCombatHud.classList.remove("hidden");
    actionEnemyHpFill.style.width = "100%";
  }
}

function updateEncounterTransition(dt) {
  if (isTransitionPhase(encounterPhase)) {
    const step = stepEncounterTransition(encounterPhase, zoomTimer, dt);
    encounterZoom = step.zoom;
    encounterBlackout = step.blackout;
    encounterFlash = step.flash;
    encounterStripe = step.stripe;
    battleMorph = step.battleMorph ?? battleMorph;
    battleScale = step.battleScale ?? battleScale;
    zoomTimer = step.timer;
    if (step.phase === "done") {
      beginCombatAfterZoom();
      return;
    }
    if (step.phase !== encounterPhase) encounterPhase = step.phase;
    return;
  }

  if (encounterPhase === "zoom-out") {
    zoomTimer += dt;
    const t = Math.min(1, zoomTimer / ZOOM_OUT_DURATION);
    const eased = t * t;
    battleMorph = 1 - eased;
    battleScale = 1 + eased * 1.5;
    encounterBlackout = 0.4 * eased;
    encounterZoom = 1;
    if (t >= 1) {
      restoreOverworldPositions();
      finishEncounterClose();
    }
  }
}

function finishEncounterClose() {
  encounterPhase = null;
  encounterZoom = 1;
  encounterBlackout = 0;
  encounterFlash = 0;
  encounterStripe = 0;
  battleMorph = 0;
  battleScale = 1;
  battleField = null;
  overworldSnapshot = null;
  combatStyle = null;
  zoomTimer = 0;
  activeEntity = null;
  encounterLocked = false;
  encounterCooldown = 1.2;
  actionCombat = null;
  actionCombatHud.classList.add("hidden");
  encounterScreen.classList.add("hidden");
  encounterScreen.classList.remove("zoom-backdrop", "flash-only");
  encounterPanel?.classList.remove("hidden");
  combatTypeEl.textContent = "";
}

function openEncounter(entity) {
  if (encounterLocked || encounterCooldown > 0 || isDead(soul)) return;

  activeEntity = entity;
  encounterLocked = true;
  tapTarget = null;
  combatStyle = randomCombatStyle();
  overworldSnapshot = {
    playerX: player.x,
    playerY: player.y,
    entityX: entity.x,
    entityY: entity.y,
  };
  battleField = createBattleField(entity.regionId);
  battleMorph = 0;
  battleScale = 2.5;
  encounterCenter = {
    x: (player.x + entity.x) / 2,
    y: (player.y + entity.y) / 2,
  };
  encounterPhase = ENCOUNTER_PHASE.BLACKOUT;
  encounterZoom = 1;
  encounterBlackout = 0;
  encounterFlash = 0;
  encounterStripe = 0;
  zoomTimer = 0;

  prepEncounterUI(entity);
  showEncounterFlash();
  playVoice("encounter_open", { volume: 0.8 });
}

function closeEncounter() {
  encounterScreen.classList.add("hidden");
  encounterScreen.classList.remove("zoom-backdrop", "flash-only");
  encounterPanel?.classList.remove("hidden");
  actionCombatHud.classList.add("hidden");

  if (encounterPhase === "rpg" || encounterPhase === "action") {
    encounterPhase = "zoom-out";
    zoomTimer = 0;
    actionCombat = null;
    return;
  }

  finishEncounterClose();
}

function updateActionCombatFrame(dt) {
  if (encounterPhase !== "action" || !actionCombat) return;

  const input = {
    attackJustPressed,
    attackDirX: 0,
    attackDirY: 0,
  };
  if (keys.has("ArrowLeft") || keys.has("KeyA")) input.attackDirX -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) input.attackDirX += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) input.attackDirY -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) input.attackDirY += 1;

  const result = updateActionCombat(actionCombat, player, dt, input);
  attackJustPressed = false;

  actionEnemyHpFill.style.width = `${(actionCombat.enemyHp / actionCombat.enemyMaxHp) * 100}%`;

  if (result.events?.playerHit) {
    soul.hp = Math.max(0, (soul.hp ?? HP_MAX) - result.events.playerHit);
    playVoice("low_hp", { volume: 0.5 });
    refreshGauges();
    if (isDead(soul)) {
      closeEncounter();
      triggerGameOverIfDead();
      return;
    }
  }

  if (result.events?.enemyHit) {
    playClip(voiceForChoice(CHOICE.KILL), 0.35);
  }

  if (result.over) {
    if (result.victory) {
      const outcome = resolveChoice(activeEntity, CHOICE.KILL);
      soul = applyEncounterChoice(soul, CHOICE.KILL, outcome);
      refreshSoulUI();
      if (soul.darkEntity > 85) glitch = 0.4;
    }
    setTimeout(() => closeEncounter(), 80);
  }
}

function handleChoice(choiceKey) {
  if (!activeEntity || encounterPhase !== "rpg") return;
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
    triggerGameOverIfDead();
  }
}

function updateMapBgm(dt) {
  if (state !== "play" || mode !== "extrovert" || encounterLocked) return;

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

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX + camera.x,
    y: (clientY - rect.top) * scaleY + camera.y,
  };
}

function fitCanvas() {
  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  const aspect = canvas.width / canvas.height;
  let w;
  let h;
  if (vw / vh > aspect) {
    h = vh;
    w = h * aspect;
  } else {
    w = vw;
    h = w / aspect;
  }
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
}

function bindViewport() {
  fitCanvas();
  window.addEventListener("resize", fitCanvas);
  window.visualViewport?.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 100));
}

function drawTapMarker() {
  if (!tapTarget || mode !== "extrovert" || encounterLocked) return;
  if (encounterPhase && encounterPhase !== "action") return;
  const sx = tapTarget.x - camera.x;
  const sy = tapTarget.y - camera.y;
  const pulse = 0.5 + Math.sin(dither * 6) * 0.2;
  ctx.strokeStyle = `rgba(229, 9, 20, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(229, 9, 20, ${pulse * 0.35})`;
  ctx.beginPath();
  ctx.arc(sx, sy, 4, 0, Math.PI * 2);
  ctx.fill();
}

function updatePlayer(dt) {
  if (isDead(soul)) return;
  if (encounterLocked && encounterPhase !== "action") return;

  const speed = getMoveSpeed(BASE_SPEED, soul);
  let dx = 0;
  let dy = 0;

  if (isTouchDevice && tapTarget) {
    const dist = Math.hypot(tapTarget.x - player.x, tapTarget.y - player.y);
    if (dist < 14) {
      tapTarget = null;
    } else {
      dx = tapTarget.x - player.x;
      dy = tapTarget.y - player.y;
    }
  } else {
    if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) dy -= 1;

    if (!isTouchDevice && touch.active) {
      dx = touch.x;
      dy = touch.y;
    }
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

  const prevX = player.x;
  const prevY = player.y;
  const inBattleAction = encounterPhase === "action" && battleField;

  const nx = player.x + dx * speed * dt;
  const moveFn = inBattleAction
    ? (x, y, w, h) => canMoveBattleField(battleField, x, y, w, h)
    : (x, y, w, h) => canMove(world.tiles, x, y, w, h);

  if (moveFn(nx - player.w / 2, player.y - player.h, player.w, player.h)) {
    player.x = nx;
  }
  const ny = player.y + dy * speed * dt;
  if (moveFn(player.x - player.w / 2, ny - player.h, player.w, player.h)) {
    player.y = ny;
  }

  const moved = Math.hypot(player.x - prevX, player.y - prevY);
  if (moved > 0.5) {
    stepDistance += moved;
    if (stepDistance >= STEP_INTERVAL) {
      stepDistance = 0;
      const inVoid = isInVoid(world.tiles, player.x, player.y);
      playFootstep({ inVoid });
    }
  } else {
    stepDistance = 0;
  }

  if (battleField && isBattleView()) {
    areaLabel.textContent = `${getBattleAreaLabel(battleField)} / ${getMoodLabel(soul)}`;
    moodLabel.textContent = getMoodLabel(soul);
  } else {
    const inVoid = isInVoid(world.tiles, player.x, player.y);
    areaLabel.textContent = `${getAreaName(player.x, player.y, world.tiles)} / ${getMoodLabel(soul, { inVoid })}`;
    moodLabel.textContent = getMoodLabel(soul, { inVoid });
  }

  const near = findNearby(entities, player.x, player.y);
  if (near && !encounterPhase) openEncounter(near);
}

function updateCamera() {
  if (isBattleView() && battleMorph >= 0.45) {
    camera.x = 0;
    camera.y = 0;
    return;
  }

  if (encounterPhase && (isTransitionPhase(encounterPhase) || encounterPhase === "zoom-out")) {
    const viewW = canvas.width / encounterZoom;
    const viewH = canvas.height / encounterZoom;
    camera.x = encounterCenter.x - viewW / 2;
    camera.y = encounterCenter.y - viewH / 2;
    camera.x = Math.max(0, Math.min(camera.x, world.width - viewW));
    camera.y = Math.max(0, Math.min(camera.y, world.height - viewH));
    return;
  }

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
  const region = getRegionAt(tx, ty);
  const regionId = region?.id;
  const pal = getTilePalette(tile, regionId);
  const px = x - camera.x;
  const py = y - camera.y;

  ctx.fillStyle = pal.base;
  ctx.fillRect(px, py, TILE, TILE);

  if (tile === T.VOID) {
    ctx.strokeStyle = "rgba(229, 9, 20, 0.07)";
    ctx.lineWidth = 1;
    if ((tx + ty) % 3 === 0) {
      ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
    }
    if ((tx * 5 + ty * 3) % 7 === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(px + 14, py + 14, 2, 2);
    }
  }

  if (tile !== T.VOID && regionId && REGION_TINT[regionId]) {
    ctx.fillStyle = REGION_TINT[regionId];
    ctx.fillRect(px, py, TILE, TILE);
  }

  const stripe = (tx + ty + Math.floor(dither * 2)) % 3 === 0;
  if (stripe && tile !== T.VOID) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(px, py + 8, TILE, 3);
  }

  if (tile === T.FLUID) {
    const pulse = 0.2 + Math.sin(dither * 2 + tx * 0.4 + ty * 0.3) * 0.1;
    if (regionId === "ai") {
      ctx.fillStyle = `rgba(120, 200, 235, ${pulse})`;
    } else {
      ctx.fillStyle = `rgba(200, 40, 60, ${pulse})`;
    }
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
  for (const e of entities) drawEntity(ctx, e, camera, dither, entityIcons);
}

function drawDarkEntity() {
  if (soul.darkEntity < 45) return;
  const alpha = ((soul.darkEntity - 45) / 55) * 0.12;
  ctx.fillStyle = `rgba(80, 0, 20, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVoidHazard() {
  if (mode !== "extrovert" || !isInVoid(world.tiles, player.x, player.y)) return;
  const pulse = 0.1 + Math.sin(dither * 4) * 0.04;
  ctx.fillStyle = `rgba(0, 0, 0, ${pulse})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = `rgba(229, 9, 20, ${0.22 + Math.sin(dither * 5) * 0.1})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.fillStyle = "rgba(229, 9, 20, 0.7)";
  ctx.font = "bold 11px Helvetica Neue, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("VOID", 20, canvas.height - 36);
  ctx.fillStyle = "rgba(180, 180, 180, 0.55)";
  ctx.font = "10px Helvetica Neue, sans-serif";
  ctx.fillText(VOID_REALM.tagline, 20, canvas.height - 20);
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
  const width = SPRITE_W * NOU_SPRITE_SCALE * (1 + warmth * 0.05);
  const height = SPRITE_H * SPRITE_SQUASH * NOU_SPRITE_SCALE * (1 - warmth * 0.03);

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 5, width * 0.34, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  drawSprite(ctx, img, sx, sy, width, height);
  ctx.restore();
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
    const meta = MOTIF_META[e.motif];
    ctx.fillStyle = meta?.glow ?? ENTITY_DEFS[e.type].color;
    ctx.fillRect(mx + (e.x / TILE) * sx - 1, my + (e.y / TILE) * sy - 1, 3, 3);
  }

  ctx.fillStyle = "#fff";
  ctx.fillRect(mx + (player.x / TILE) * sx - 2, my + (player.y / TILE) * sy - 2, 4, 4);
}

function drawRegionAmbience() {
  const key = currentMapRegion;
  if (!key || key === "hub") return;

  if (key === "ai") {
    ctx.strokeStyle = "rgba(150, 210, 240, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
      const x = (i * 53 + dither * 140) % canvas.width;
      const y = (i * 37 + dither * 220) % canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 10);
      ctx.stroke();
    }
  }

  if (key === "ki") {
    const g = ctx.createRadialGradient(canvas.width * 0.5, 0, 0, canvas.width * 0.5, 0, canvas.height * 0.7);
    g.addColorStop(0, "rgba(255, 220, 60, 0.03)");
    g.addColorStop(1, "rgba(255, 220, 60, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (key === "nu") {
    ctx.fillStyle = "rgba(200, 60, 40, 0.015)";
    for (let i = 0; i < 8; i++) {
      const x = (i * 97 + dither * 30) % canvas.width;
      const y = (i * 61 + dither * 20) % (canvas.height * 0.6);
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 2, i, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (key === "raku") {
    const g = ctx.createLinearGradient(0, canvas.height * 0.3, 0, canvas.height);
    g.addColorStop(0, "rgba(255, 120, 50, 0)");
    g.addColorStop(1, "rgba(255, 100, 40, 0.04)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function draw() {
  drawVoidGrain();

  if (isBattleView() && battleField) {
    if (battleMorph < 1 || encounterPhase === "zoom-out") {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - battleMorph * 1.05);
      drawWorld();
      drawProps(ctx, props, camera, dither);
      if (battleMorph < 0.4) {
        for (const e of entities) {
          if (e !== activeEntity) drawEntity(ctx, e, camera, dither, entityIcons);
        }
        drawPlayer();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1, battleMorph * 1.1);
    drawBattleField(ctx, canvas, battleField, dither, battleScale);
    if (battleMorph > 0.32) {
      if (activeEntity?.alive !== false) drawEntity(ctx, activeEntity, camera, dither, entityIcons);
      drawPlayer();
      drawBattleFieldForeground(ctx, canvas, battleField, dither, battleScale);
    }
    ctx.restore();
  } else if (isTransitionPhase(encounterPhase)) {
    drawWorld();
    drawProps(ctx, props, camera, dither);
    drawEntities();
    drawPlayer();
  } else {
    drawWorld();
    drawProps(ctx, props, camera, dither);
    drawDarkEntity();
    drawVoidHazard();
    drawRegionAmbience();
    drawTapMarker();
    drawEntities();
    drawPlayer();
  }

  if (encounterPhase === "action" && actionCombat) {
    drawActionCombat(ctx, actionCombat, player, camera, canvas, dither, ENTITY_DEFS, true);
  }

  if (isTransitionPhase(encounterPhase)) {
    drawEncounterTransition(ctx, canvas, encounterCenter, camera, {
      phase: encounterPhase,
      timer: zoomTimer,
      blackout: encounterBlackout,
      flash: encounterFlash,
      stripe: encounterStripe,
      battleMorph,
    });
  }

  if (encounterPhase === "zoom-out" && encounterBlackout > 0.02) {
    ctx.fillStyle = `rgba(0, 0, 0, ${encounterBlackout})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawGlitch();
  drawRedFrame();
  if (!encounterPhase) drawMinimap();
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
      inVoid: mode === "extrovert" && isInVoid(world.tiles, player.x, player.y),
    });
    refreshGauges();

    saveTimer += dt;
    if (saveTimer > 12) {
      saveSoul(soul);
      saveTimer = 0;
    }

    if (isDead(soul)) triggerGameOverIfDead();
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
    drawShellMuu();
  }

  if (state === "play" && mode === "extrovert") {
    if (encounterPhase) updateEncounterTransition(dt);
    if (encounterPhase === "action") updateActionCombatFrame(dt);
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

    if (encounterPhase === "action" && (e.code === "Space" || e.code === "KeyZ" || e.code === "KeyJ")) {
      e.preventDefault();
      attackJustPressed = true;
      return;
    }

    const allowMoveKeys =
      mode === "extrovert" &&
      (!encounterLocked || encounterPhase === "action") &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code);
    if (allowMoveKeys) {
      e.preventDefault();
    }
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  titleScreen.addEventListener("click", beginPlay);
  titleScreen.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      beginPlay();
    },
    { passive: false }
  );
  retryBtn.addEventListener("click", retryFromDeath);
  fullResetBtn.addEventListener("click", fullReset);
  toShellBtn.addEventListener("click", enterShell);
  toNouBtn.addEventListener("click", enterNou);
  feedBtn.addEventListener("click", submitFeed);
  feedInput.addEventListener("input", updateFeedCharCount);
  encounterCloseBtn.addEventListener("click", closeEncounter);

  actionAttackBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (encounterPhase === "action") attackJustPressed = true;
  });

  choiceButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleChoice(btn.dataset.choice));
  });

  feedInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitFeed();
  });

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (mode !== "extrovert") return;
      if (encounterLocked && encounterPhase !== "action") return;
      if (isTouchDevice) {
        e.preventDefault();
        tapTarget = screenToWorld(e.clientX, e.clientY);
        return;
      }
      touch.active = true;
      touch.originX = e.clientX;
      touch.originY = e.clientY;
    },
    { passive: false }
  );
  canvas.addEventListener("pointermove", (e) => {
    if (isTouchDevice || !touch.active || mode !== "extrovert") return;
    if (encounterLocked && encounterPhase !== "action") return;
    const dx = e.clientX - touch.originX;
    const dy = e.clientY - touch.originY;
    const m = 28;
    touch.x = Math.max(-1, Math.min(1, dx / m));
    touch.y = Math.max(-1, Math.min(1, dy / m));
  });
  const endTouch = () => {
    if (isTouchDevice) return;
    touch.active = false;
    touch.x = 0;
    touch.y = 0;
  };
  canvas.addEventListener("pointerup", endTouch);
  canvas.addEventListener("pointercancel", endTouch);
  canvas.addEventListener("pointerleave", endTouch);

  bindViewport();
}

async function boot() {
  bindViewport();
  soul = loadSoul();
  initWorld();
  preloadVoices();
  preloadBgm();
  sprites = await loadSprites("assets/muu");
  entityIcons = await loadEntityIcons("assets/icons");
  await loadScenery("assets/scenery");
  bindInput();
  refreshSoulUI();
  drawShellMuu();
  if (new URLSearchParams(location.search).has("shot")) {
    window.__shot = {
      forceEncounter(style = "action") {
        const entity = entities.find((e) => e.alive);
        if (!entity) return false;
        player.x = entity.x;
        player.y = entity.y + 72;
        combatStyle = style;
        openEncounter(entity);
        return true;
      },
      setZoomProgress(t) {
        if (!encounterPhase) return;
        if (t < 0.12) {
          encounterPhase = ENCOUNTER_PHASE.BLACKOUT;
          zoomTimer = t / 0.12 * 0.26;
        } else if (t < 0.55) {
          encounterPhase = ENCOUNTER_PHASE.ZOOM_IN;
          zoomTimer = ((t - 0.12) / 0.43) * 0.48;
        } else if (t < 1) {
          encounterPhase = ENCOUNTER_PHASE.WIDEN;
          zoomTimer = ((t - 0.55) / 0.45) * 0.55;
        }
        const step = stepEncounterTransition(encounterPhase, zoomTimer, 0);
        encounterZoom = step.zoom;
        encounterBlackout = step.blackout;
        encounterFlash = step.flash;
        encounterStripe = step.stripe;
        battleMorph = step.battleMorph ?? battleMorph;
        battleScale = step.battleScale ?? battleScale;
        if (t >= 1 && isTransitionPhase(encounterPhase)) beginCombatAfterZoom();
      },
      forceAutumnAction() {
        const entity = entities.find((e) => e.alive && e.regionId === "nu") ?? entities.find((e) => e.alive);
        if (!entity) return false;
        entity.regionId = "nu";
        combatStyle = "action";
        player.x = entity.x;
        player.y = entity.y + 72;
        openEncounter(entity);
        return true;
      },
      swing() {
        attackJustPressed = true;
      },
      get phase() {
        return encounterPhase;
      },
    };
  }
  requestAnimationFrame(loop);
}

boot();
