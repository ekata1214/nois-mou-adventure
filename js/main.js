import {
  TILE,
  COLS,
  ROWS,
  T,
  PALETTE,
  createWorld,
  canMove,
  getAreaName,
} from "./world.js";
import { drawSprite, loadSprites } from "./sprites.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const titleScreen = document.getElementById("title-screen");
const hud = document.getElementById("hud");
const areaLabel = document.getElementById("area-label");

const MOVE_SPEED = 150;
const SPRITE_W = 72;
const SPRITE_H = 120;

let state = "title";
let world;
let player;
let sprites;
let camera = { x: 0, y: 0 };
let keys = new Set();
let touch = { x: 0, y: 0, active: false };
let lastTime = 0;
let dither = 0;

function initWorld() {
  world = createWorld();
  player = {
    x: world.spawnX,
    y: world.spawnY,
    w: 28,
    h: 20,
    dir: "front",
    vx: 0,
    vy: 0,
  };
}

function startGame() {
  titleScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  state = "play";
}

function updatePlayer(dt) {
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

  player.vx = dx * MOVE_SPEED;
  player.vy = dy * MOVE_SPEED;

  const nx = player.x + player.vx * dt;
  if (canMove(world.tiles, nx - player.w / 2, player.y - player.h, player.w, player.h)) {
    player.x = nx;
  }
  const ny = player.y + player.vy * dt;
  if (canMove(world.tiles, player.x - player.w / 2, ny - player.h, player.w, player.h)) {
    player.y = ny;
  }

  areaLabel.textContent = getAreaName(player.x, player.y);
}

function updateCamera() {
  const targetX = player.x - canvas.width / 2;
  const targetY = player.y - canvas.height / 2;
  const maxX = world.width - canvas.width;
  const maxY = world.height - canvas.height;
  camera.x = Math.max(0, Math.min(targetX, maxX));
  camera.y = Math.max(0, Math.min(targetY, maxY));
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

  // light dither dots (Hylics-ish)
  if (tile !== T.VOID && ((tx * 7 + ty * 13) % 5 === 0)) {
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

function drawRedFrame() {
  ctx.strokeStyle = "rgba(229, 9, 20, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
}

function drawPlayer() {
  const img = sprites[player.dir];
  if (!img) return;
  const sx = player.x - camera.x;
  const sy = player.y - camera.y;
  drawSprite(ctx, img, sx, sy, SPRITE_W, SPRITE_H);

  // faint brain glow
  ctx.fillStyle = "rgba(229, 9, 20, 0.12)";
  ctx.beginPath();
  ctx.arc(sx, sy - SPRITE_H + 28, 18, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  drawVoidGrain();
  drawWorld();
  drawPlayer();
  drawRedFrame();
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  dither += dt;

  if (state === "play") {
    updatePlayer(dt);
    updateCamera();
    draw();
  }

  requestAnimationFrame(loop);
}

function bindInput() {
  window.addEventListener("keydown", (e) => {
    if (state === "title" && (e.code === "Space" || e.code === "Enter")) {
      startGame();
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  titleScreen.addEventListener("click", startGame);

  canvas.addEventListener("pointerdown", (e) => {
    touch.active = true;
    touch.originX = e.clientX;
    touch.originY = e.clientY;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!touch.active) return;
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
  initWorld();
  sprites = await loadSprites("assets/muu");
  bindInput();
  requestAnimationFrame(loop);
}

boot();
