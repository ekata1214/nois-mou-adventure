/** 携帯 DS 風バーチャルパッド（左: 移動 / 右: アクション） */

import { isMobileDevice } from "./mobile-viewport.js";
import { dpadDirFromPoint, resolveDpadDirsFromDir } from "./dpad-input.js?v=20260730dpadbtn";

const dpadState = { up: false, down: false, left: false, right: false };

let rootEl = null;
let faceEl = null;
let dpadEl = null;
let onAction = null;
let dpadPointerId = null;
let activeDir = null;

export function getMobileMoveVector() {
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
  return dpadState.up || dpadState.down || dpadState.left || dpadState.right;
}

function clearDpad() {
  activeDir = null;
  dpadPointerId = null;
  Object.keys(dpadState).forEach((k) => {
    dpadState[k] = false;
  });
  dpadEl?.querySelectorAll(".dpad-btn.pressed").forEach((b) => b.classList.remove("pressed"));
}

/** 遭遇開始・ズーム等でモバイル入力を完全リセット */
export function clearMobileInput() {
  clearDpad();
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

function applyDir(dir) {
  activeDir = dir;
  const resolved = resolveDpadDirsFromDir(dir);
  dpadState.up = resolved.up;
  dpadState.down = resolved.down;
  dpadState.left = resolved.left;
  dpadState.right = resolved.right;
  syncDpadPressedClasses();
}

function updateFromPoint(clientX, clientY, { starting = false } = {}) {
  if (!dpadEl) return false;
  const dir = dpadDirFromPoint(clientX, clientY, dpadEl);
  if (starting && !dir) return false;
  // 指がアーム外に出たら停止（押しっぱなし誤爆を防ぐ）
  applyDir(dir);
  return true;
}

function bindDpadPad(pad) {
  if (!pad) return;

  pad.addEventListener(
    "pointerdown",
    (e) => {
      if (dpadPointerId !== null) return;
      const ok = updateFromPoint(e.clientX, e.clientY, { starting: true });
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
      updateFromPoint(e.clientX, e.clientY, { starting: false });
    },
    { passive: false }
  );

  const end = (e) => {
    if (e.pointerId !== dpadPointerId) return;
    e.preventDefault();
    clearDpad();
  };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
  pad.addEventListener("lostpointercapture", () => {
    if (dpadPointerId !== null) clearDpad();
  });
}

function bindHoldButton(btn, onPress, onRelease) {
  if (!btn) return;
  let pid = null;
  const press = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pid = e.pointerId;
    try {
      btn.setPointerCapture?.(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    btn.classList.add("pressed");
    onPress();
  };
  const release = (e) => {
    if (pid !== null && e.pointerId !== pid) return;
    e.preventDefault();
    pid = null;
    btn.classList.remove("pressed");
    onRelease();
  };
  btn.addEventListener("pointerdown", press);
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("lostpointercapture", () => {
    if (pid === null) return;
    pid = null;
    btn.classList.remove("pressed");
    onRelease();
  });
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
