/** GLB 読み込み — タイムアウト・サイズ制限・HEAD プローブ */

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const CACHE_BUST = "v=20260705shell";

export function assetUrl(basePath, name) {
  const path = `${basePath}/${encodeURIComponent(name)}`;
  return path.includes("?") ? path : `${path}?${CACHE_BUST}`;
}

export async function probeAsset(url) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "default" });
    const bytes = Number(res.headers.get("content-length")) || null;
    return { ok: res.ok, status: res.status, bytes };
  } catch (err) {
    return { ok: false, status: 0, bytes: null, error: err?.message ?? String(err) };
  }
}

export function loadGltfAsync(loader, url, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error(`timeout (${Math.round(timeoutMs / 1000)}s): ${url}`));
          }, timeoutMs)
        : null;

    loader.load(
      url,
      (gltf) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve(gltf);
      },
      undefined,
      (err) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    );
  });
}

/**
 * @param {string} basePath
 * @param {string[]} candidates file names in priority order
 * @param {{ timeoutMs?: number, maxBytes?: number, skipMissing?: boolean }} opts
 */
export async function loadFirstGlb(basePath, candidates, opts = {}) {
  const { timeoutMs = 120000, maxBytes = Infinity } = opts;
  const loader = new GLTFLoader();
  const errors = [];

  for (const name of candidates) {
    const url = assetUrl(basePath, name);
    const probe = await probeAsset(url);
    if (!probe.ok) {
      errors.push(`${name}: HTTP ${probe.status || "fail"}`);
      continue;
    }
    if (probe.bytes != null && probe.bytes > maxBytes) {
      const mb = (probe.bytes / (1024 * 1024)).toFixed(0);
      const limit = (maxBytes / (1024 * 1024)).toFixed(0);
      errors.push(`${name}: skipped (${mb}MB > ${limit}MB limit)`);
      continue;
    }

    try {
      const gltf = await loadGltfAsync(loader, url, { timeoutMs });
      return { gltf, name, url, bytes: probe.bytes };
    } catch (err) {
      errors.push(`${name}: ${err?.message ?? err}`);
    }
  }

  return { errors };
}

export function estimateMobileRoomBudget(manifest) {
  const defaultMb = manifest?.mobileMaxRoomMb ?? 48;
  const mem = navigator.deviceMemory;
  if (typeof mem === "number") {
    if (mem <= 2) return Math.min(defaultMb, 24);
    if (mem <= 4) return Math.min(defaultMb, 40);
  }
  return defaultMb;
}

export function estimateMobileMuuBudget(manifest) {
  const defaultMb = manifest?.mobileMaxMuuMb ?? 64;
  const mem = navigator.deviceMemory;
  if (typeof mem === "number" && mem <= 2) return Math.min(defaultMb, 48);
  return defaultMb;
}
