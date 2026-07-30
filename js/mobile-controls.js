/** 携帯 DS 風バーチャルパッド（左: 移動 / 右: アクション） */

import { isMobileDevice } from "./mobile-viewport.js";
import { isOnDpadCross, normalizePadCoords, resolveDpadDirs } from "./dpad-input.js?v=20260729dpadfix";

const dpadState = { up: false, down: false, left: false, right: false };
const analog = { x: 0, y: 0, active: false };

let rootEl = null;
let faceEl = null;
let dpadEl = null;
let onAction = null;
let dpadPointerId = null;

export function getMobileMoveVector() {
  if (analog.active && (analog.x !== 0 || analog.y !== 0)) {
    return { x: analog.x, y: analog.y };
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
  if (analog.active && (analog.x !== 0 || analog.y !== 0)) return true;
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

/** 遭遇開始・ズーム等でモバイル入力を完全リセット */
export function clearMobileInput() {
  clearAnalog();
  rootEl?.querySelectorAll(".face-btn.pressed").forEach((b) => b.classList.remove("pressed"));
  onAction?.({ kind: "reset", phase: "up" });
}

function syncDpadPressedClasses() {
  if (!dpadEl) return;
  dpadEl.querySelectorAll("[data-dpad]").forEach((btn) => {
    const dir = btn.dataset.dpad;
    btn.classList.toggle("pressed", !!dpadState[dir]);
  });
}

function applyResolved(resolved) {
  dpadState.up = resolved.up;
  dpadState.down = resolved.down;
  dpadState.left = resolved.left;
  dpadState.right = resolved.right;
  analog.x = resolved.x;
  analog.y = resolved.y;
  analog.active = resolved.active;
  if (!resolved.active) {
    analog.x = 0;
    analog.y = 0;
  }
  syncDpadPressedClasses();
}

function updateAnalogFromEvent(e, { starting = false } = {}) {
  if (!dpadEl) return false;
  const rect = dpadEl.getBoundingClientRect();
  const forceLandscape = document.body.classList.contains("force-landscape");
  const { x, y } = normalizePadCoords(e.clientX, e.clientY, rect, { forceLandscape });

  // 開始時は十字アーム上のみ。ドラッグ継続中は少し外まで許容
  if (starting) {
    if (!isOnDpadCross(x, y)) return false;
  } else if (!isOnDpadCross(x, y, 0.55) && Math.hypot(x, y) > 1.25) {
    applyResolved(resolveDpadDirs(0, 0));
    return true;
  }

  const resolved = resolveDpadDirs(x, y, { wasActive: analog.active || !starting });
  applyResolved(resolved);
  return true;
}

function bindDpadPad(pad) {
  if (!pad) return;

  pad.addEventListener(
    "pointerdown",
    (e) => {
      if (dpadPointerId !== null) return;
      const ok = updateAnalogFromEvent(e, { starting: true });
      if (!ok) return;
      e.preventDefault();
      e.stopPropagation();
      dpadPointerId = e.pointerId;
      try {
        pad.setPointerCapture?.(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    },
    { passive: false }
  );

  pad.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId !== dpadPointerId) return;
      e.preventDefault();
      updateAnalogFromEvent(e, { starting: false });
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
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  btn.addEventListener("selectstart", (e) => e.preventDefault());
}

export function syncMobileControls(opts = {}) {
  if (!rootEl) return;
  const mobile = isMobileDevice();
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
  if (!show) clearMobileInput();

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
    clearMobileInput();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearMobileInput();
  });
}
