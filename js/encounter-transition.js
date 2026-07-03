/** ポケモン風エンカウント遷移 — 暗転 → 寄る → 広がる */

export const ZOOM_COMBAT = 2.45;
export const ZOOM_PEAK = 3.65;
export const BLACKOUT_DURATION = 0.26;
export const ZOOM_IN_DURATION = 0.48;
export const WIDEN_DURATION = 0.55;
export const ZOOM_OUT_DURATION = 0.55;

export const ENCOUNTER_PHASE = {
  BLACKOUT: "encounter-blackout",
  ZOOM_IN: "encounter-zoom-in",
  WIDEN: "encounter-widen",
};

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeOutQuad(t) {
  return 1 - (1 - t) ** 2;
}

export function stepEncounterTransition(phase, timer, dt) {
  if (phase === ENCOUNTER_PHASE.BLACKOUT) {
    timer += dt;
    const t = Math.min(1, timer / BLACKOUT_DURATION);
    const flash = t < 0.18 ? Math.sin((t / 0.18) * Math.PI) * 0.92 : 0;
    return {
      phase: t >= 1 ? ENCOUNTER_PHASE.ZOOM_IN : phase,
      timer: t >= 1 ? 0 : timer,
      zoom: 1,
      blackout: Math.max(flash, easeOutCubic(t)),
      flash,
      stripe: 0,
    };
  }

  if (phase === ENCOUNTER_PHASE.ZOOM_IN) {
    timer += dt;
    const t = Math.min(1, timer / ZOOM_IN_DURATION);
    const eased = easeOutCubic(t);
    return {
      phase: t >= 1 ? ENCOUNTER_PHASE.WIDEN : phase,
      timer: t >= 1 ? 0 : timer,
      zoom: 1 + (ZOOM_PEAK - 1) * eased,
      blackout: 0.88 - eased * 0.28,
      flash: 0,
      stripe: eased,
    };
  }

  if (phase === ENCOUNTER_PHASE.WIDEN) {
    timer += dt;
    const t = Math.min(1, timer / WIDEN_DURATION);
    const eased = easeOutQuad(t);
    return {
      phase: t >= 1 ? "done" : phase,
      timer: t >= 1 ? 0 : timer,
      zoom: ZOOM_PEAK + (ZOOM_COMBAT - ZOOM_PEAK) * eased,
      blackout: 0.6 * (1 - eased),
      flash: 0,
      stripe: 1 - eased,
    };
  }

  return { phase, timer, zoom: 1, blackout: 0, flash: 0, stripe: 0 };
}

export function drawEncounterTransition(ctx, canvas, center, camera, { phase, timer, blackout, flash, stripe }) {
  const cx = center.x - camera.x;
  const cy = center.y - camera.y;

  if (phase === ENCOUNTER_PHASE.ZOOM_IN && stripe > 0) {
    const t = Math.min(1, timer / ZOOM_IN_DURATION);
    const bars = 7;
    const barH = Math.max(10, canvas.height * 0.09);
    const squeeze = (1 - t * 0.92) * canvas.height * 0.42;
    ctx.save();
    ctx.fillStyle = "#050508";
    for (let i = 0; i < bars; i++) {
      const y = (i / (bars - 1)) * (canvas.height - barH);
      const offset = Math.sin(i * 1.7 + timer * 14) * squeeze * 0.08;
      const h = barH + squeeze * (0.35 + (i % 2) * 0.2);
      ctx.fillRect(-4, y + offset - squeeze * 0.15, canvas.width + 8, h);
    }
    ctx.restore();
  }

  if (phase === ENCOUNTER_PHASE.WIDEN) {
    const t = Math.min(1, timer / WIDEN_DURATION);
    const eased = easeOutQuad(t);
    const radius = (0.06 + eased * 1.05) * Math.hypot(canvas.width, canvas.height) * 0.55;
    const alpha = (1 - eased) * 0.92;
    if (alpha > 0.02) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.restore();
    }
  }

  if (flash > 0.02) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.85})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (blackout > 0.02 && phase !== ENCOUNTER_PHASE.WIDEN) {
    ctx.fillStyle = `rgba(0, 0, 0, ${blackout})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (phase === ENCOUNTER_PHASE.ZOOM_IN || phase === ENCOUNTER_PHASE.WIDEN) {
    const pulse = 0.25 + Math.sin(timer * 10) * 0.08;
    ctx.strokeStyle = `rgba(229, 9, 20, ${pulse * (1 - stripe * 0.5)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 18 + stripe * 42, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function isTransitionPhase(phase) {
  return (
    phase === ENCOUNTER_PHASE.BLACKOUT ||
    phase === ENCOUNTER_PHASE.ZOOM_IN ||
    phase === ENCOUNTER_PHASE.WIDEN
  );
}
