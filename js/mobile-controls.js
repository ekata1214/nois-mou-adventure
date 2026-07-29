/** 携帯 DS 風バーチャルパッド（左: 移動 / 右: アクション） */

import { isMobileDevice } from "./mobile-viewport.js";

const dpadState = { up: false, down: false, left: false, right: false };
const analog = { x: 0, y: 0, active: false };

let rootEl = null;
let faceEl = null;
let dpadEl = null;
let onAction = null;
let dpadPointerId = null;

export function getMobileMoveVector() {
  if (analog.active) {
    const len = Math.hypot(analog.x, analog.y);
    if (len < 0.12) return { x: 0, y: 0 };
    // 内側は弱め、外側でフル速度（スルスル感）
    const mag = Math.min(1, (len - 0.12) / 0.78);
    const curved = Math.pow(mag, 0.85);
    return { x: (analog.x / len) * curved, y: (analog.y / len) * curved };
  }

  let x = 0;
  let y = 0;
  if (dpadState.left) x -= 1;
  if (dpadState.right) x += 1;
  if (dpadState.up) y -= 1;
  if (dpadState.down) y += 1;
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

export function isMobileDpadActive() {
  if (analog.active && (Math.abs(analog.x) > 0.12 || Math.abs(analog.y) > 0.12)) return true;
  return dpadState.up || dpadState.down || dpadState.left || dpadState.right;
}

function clearAnalog() {
  analog.x = 0;
  analog.y = 0;
  analog.active = false;
  dpadPointerId = null;
  Object.keys(dpadState).forEach((k) => {
    dpadState[k] = false;
  });
  dpadEl?.querySelectorAll(".dpad-btn.pressed").forEach((b) => b.classList.remove("pressed"));
}

function syncDpadPressedClasses() {
  if (!dpadEl) return;
  dpadEl.querySelectorAll("[data-dpad]").forEach((btn) => {
    const dir = btn.dataset.dpad;
    btn.classList.toggle("pressed", !!dpadState[dir]);
  });
}

function updateAnalogFromEvent(e) {
  if (!dpadEl) return;
  const rect = dpadEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = Math.min(rect.width, rect.height) * 0.48;
  let x = (e.clientX - cx) / radius;
  let y = (e.clientY - cy) / radius;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  analog.x = x;
  analog.y = y;
  analog.active = true;

  const dead = 0.28;
  dpadState.left = x < -dead;
  dpadState.right = x > dead;
  dpadState.up = y < -dead;
  dpadState.down = y > dead;
  syncDpadPressedClasses();
}

function bindDpadPad(pad) {
  if (!pad) return;

  pad.addEventListener(
    "pointerdown",
    (e) => {
      if (dpadPointerId !== null) return;
      e.preventDefault();
      e.stopPropagation();
      dpadPointerId = e.pointerId;
      try {
        pad.setPointerCapture?.(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      updateAnalogFromEvent(e);
    },
    { passive: false }
  );

  pad.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId !== dpadPointerId) return;
      e.preventDefault();
      updateAnalogFromEvent(e);
    },
    { passive: false }
  );

  const end = (e) => {
    if (e.pointerId !== dpadPointerId) return;
    e.preventDefault();
    clearAnalog();
  };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
  pad.addEventListener("lostpointercapture", () => {
    if (dpadPointerId !== null) clearAnalog();
  });
}

function bindHoldButton(btn, onPress, onRelease) {
  if (!btn) return;
  const press = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      btn.setPointerCapture?.(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    btn.classList.add("pressed");
    onPress();
  };
  const release = (e) => {
    e.preventDefault();
    btn.classList.remove("pressed");
    onRelease();
  };
  btn.addEventListener("pointerdown", press);
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);
  // pointerleave はスライド操作を切るので付けない
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  btn.addEventListener("selectstart", (e) => e.preventDefault());
}

export function syncMobileControls(opts = {}) {
  if (!rootEl) return;
  const mobile = isMobileDevice();
  // RPG / ズーム中は十字キーを隠す（ACTION戦闘だけ操作UIを出す）
  const phase = opts.encounterPhase;
  const fieldControlsOk = !phase || phase === "action";
  const show =
    mobile &&
    opts.state === "play" &&
    opts.mode === "extrovert" &&
    !opts.gameover &&
    fieldControlsOk;

  rootEl.classList.toggle("hidden", !show);
  rootEl.setAttribute("aria-hidden", show ? "false" : "true");
  if (!show) clearAnalog();

  const actionMode = show && phase === "action";
  faceEl?.classList.toggle("hidden", !actionMode);
  rootEl.classList.toggle("action-mode", actionMode);
  document.body.classList.toggle("mobile-action-mode", actionMode);
}

export function initMobileControls(hooks = {}) {
  onAction = hooks.onAction;
  rootEl = document.getElementById("mobile-controls");
  faceEl = document.getElementById("mobile-face");
  dpadEl = rootEl?.querySelector(".mobile-dpad") ?? null;
  if (!rootEl || !isMobileDevice()) return;

  const blockBrowserChrome = (e) => {
    e.preventDefault();
  };
  document.addEventListener("contextmenu", blockBrowserChrome, { passive: false });
  document.addEventListener("selectstart", blockBrowserChrome, { passive: false });
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.target?.closest?.("input, textarea, a[href]")) return;
    },
    { passive: true }
  );

  bindDpadPad(dpadEl);

  faceEl?.querySelectorAll("[data-action]").forEach((btn) => {
    const kind = btn.dataset.action;
    const press = () => onAction?.({ kind, phase: "down" });
    const release = () => onAction?.({ kind, phase: "up" });
    bindHoldButton(btn, press, release);
  });

  window.addEventListener("blur", () => {
    clearAnalog();
    rootEl?.querySelectorAll(".face-btn.pressed").forEach((b) => {
      b.classList.remove("pressed");
    });
    onAction?.({ kind: "reset", phase: "up" });
  });
}
