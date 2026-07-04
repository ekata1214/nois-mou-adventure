/** 携帯：横画面固定 + ビューポートサイズ */

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent);
const TOUCH_UI = window.matchMedia("(pointer: coarse) and (hover: none)");

export function isMobileDevice() {
  return MOBILE_UA || TOUCH_UI.matches;
}

export function isPortraitViewport() {
  return window.innerHeight > window.innerWidth;
}

/** 縦持ちのとき CSS で横画面レイアウトに回転 */
export function syncMobileLandscape() {
  const mobile = isMobileDevice();
  document.body.classList.toggle("is-mobile", mobile);
  const force = mobile && isPortraitViewport();
  document.body.classList.toggle("force-landscape", force);
  return force;
}

/** fitCanvas 用 — 回転時は見かけの幅/高さを入れ替え */
export function getViewportSize() {
  syncMobileLandscape();
  if (document.body.classList.contains("force-landscape")) {
    return {
      vw: window.innerHeight,
      vh: window.innerWidth,
    };
  }
  const vv = window.visualViewport;
  return {
    vw: vv?.width ?? window.innerWidth,
    vh: vv?.height ?? window.innerHeight,
  };
}

export async function tryLockLandscape() {
  if (!isMobileDevice()) return;
  const orientation = screen.orientation;
  if (!orientation?.lock) return;
  try {
    await orientation.lock("landscape-primary");
  } catch {
    try {
      await orientation.lock("landscape");
    } catch {
      // CSS force-landscape がフォールバック
    }
  }
}

export function bindMobileViewport(onLayout) {
  syncMobileLandscape();

  const refresh = () => {
    syncMobileLandscape();
    onLayout?.();
  };

  window.addEventListener("resize", refresh);
  window.visualViewport?.addEventListener("resize", refresh);
  window.addEventListener("orientationchange", () => setTimeout(refresh, 120));
  TOUCH_UI.addEventListener("change", refresh);
}
