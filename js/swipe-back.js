/** Left-edge swipe → back (in-app), like native. */
export function bindEdgeSwipeBack(onBack, options = {}) {
  const edge = options.edge ?? 28;
  const minDx = options.minDx ?? 72;
  const maxDy = options.maxDy ?? 64;
  let startX = 0;
  let startY = 0;
  let active = false;

  const onStart = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const x = e.clientX;
    if (x > edge) return;
    active = true;
    startX = x;
    startY = e.clientY;
  };

  const onEnd = (e) => {
    if (!active) return;
    active = false;
    const dx = e.clientX - startX;
    const dy = Math.abs(e.clientY - startY);
    if (dx >= minDx && dy <= maxDy) onBack();
  };

  const onCancel = () => {
    active = false;
  };

  window.addEventListener("pointerdown", onStart, { passive: true });
  window.addEventListener("pointerup", onEnd, { passive: true });
  window.addEventListener("pointercancel", onCancel, { passive: true });

  return () => {
    window.removeEventListener("pointerdown", onStart);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onCancel);
  };
}
