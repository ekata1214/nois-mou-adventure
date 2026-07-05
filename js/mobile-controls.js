/** 携帯 DS 風バーチャルパッド（左: 移動 / 右: アクション） */

import { isMobileDevice } from "./mobile-viewport.js";

const dpadState = { up: false, down: false, left: false, right: false };

let rootEl = null;
let faceEl = null;
let onAction = null;

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

function setDpad(dir, active) {
  if (!(dir in dpadState)) return;
  dpadState[dir] = active;
}

function bindHoldButton(btn, onPress, onRelease) {
  if (!btn) return;
  const press = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
  btn.addEventListener("pointerleave", release);
}

export function syncMobileControls(opts = {}) {
  if (!rootEl) return;
  const mobile = isMobileDevice();
  const show =
    mobile &&
    opts.state === "play" &&
    opts.mode === "extrovert" &&
    !opts.gameover;

  rootEl.classList.toggle("hidden", !show);
  rootEl.setAttribute("aria-hidden", show ? "false" : "true");

  const actionMode = show && opts.encounterPhase === "action";
  faceEl?.classList.toggle("hidden", !actionMode);
  rootEl.classList.toggle("action-mode", actionMode);
  document.body.classList.toggle("mobile-action-mode", actionMode);
}

export function initMobileControls(hooks = {}) {
  onAction = hooks.onAction;
  rootEl = document.getElementById("mobile-controls");
  faceEl = document.getElementById("mobile-face");
  if (!rootEl || !isMobileDevice()) return;

  rootEl.querySelectorAll("[data-dpad]").forEach((btn) => {
    const dir = btn.dataset.dpad;
    bindHoldButton(
      btn,
      () => setDpad(dir, true),
      () => setDpad(dir, false)
    );
  });

  faceEl?.querySelectorAll("[data-action]").forEach((btn) => {
    const kind = btn.dataset.action;
    const press = () => onAction?.({ kind, phase: "down" });
    const release = () => onAction?.({ kind, phase: "up" });
    bindHoldButton(btn, press, release);
  });

  window.addEventListener("blur", () => {
    Object.keys(dpadState).forEach((k) => {
      dpadState[k] = false;
    });
    rootEl?.querySelectorAll(".dpad-btn.pressed, .face-btn.pressed").forEach((b) => {
      b.classList.remove("pressed");
    });
    onAction?.({ kind: "reset", phase: "up" });
  });
}
