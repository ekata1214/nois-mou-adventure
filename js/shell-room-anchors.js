import * as THREE from "three";
import { getRoomBounds, raycastFloorY } from "./shell-floor.js";

const ANCHOR_PREFIX = /^(?:anchor|slot|craft)[_-]/i;

/** GLB 内の Empty 等（名前が anchor_* / slot_* / craft_*）を収集 */
export function scanRoomAnchors(roomRoot) {
  const anchors = new Map();
  if (!roomRoot) return anchors;

  roomRoot.updateMatrixWorld(true);
  roomRoot.traverse((obj) => {
    const raw = obj.name?.trim?.();
    if (!raw || !ANCHOR_PREFIX.test(raw)) return;

    const key = raw.replace(ANCHOR_PREFIX, "").toLowerCase().replace(/-/g, "_");
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    obj.matrixWorld.decompose(position, quaternion, scale);

    anchors.set(key, { name: raw, position, quaternion, scale });
  });

  return anchors;
}

export function resolveCraftAnchor(recipeId, anchors, manifest) {
  if (!anchors?.size) return null;
  const mapped = manifest?.craftAnchors?.[recipeId] ?? recipeId;
  const key = String(mapped).toLowerCase().replace(/-/g, "_");
  return anchors.get(key) ?? null;
}

/** 開発者向け: 部屋 GLB の認識状況をコンソールに出す */
export function logRoomPlacementDiagnostics(roomRoot, anchors, fit, manifest) {
  const box = getRoomBounds(roomRoot);
  const meshNames = [];
  roomRoot.traverse((obj) => {
    if (obj.isMesh && meshNames.length < 24) meshNames.push(obj.name || "(unnamed)");
  });

  const cx = (box.min.x + box.max.x) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;
  const probeY = raycastFloorY(roomRoot, cx, cz, manifest);

  console.info("[shell-room] placement diagnostics");
  console.info("  bounds:", {
    min: [box.min.x, box.min.y, box.min.z].map((n) => n.toFixed(2)),
    max: [box.max.x, box.max.y, box.max.z].map((n) => n.toFixed(2)),
  });
  console.info("  floorY (heuristic):", fit?.floorY?.toFixed?.(3), "center probe:", probeY?.toFixed?.(3));
  console.info(
    "  anchors:",
    anchors.size
      ? [...anchors.values()].map((a) => a.name).join(", ")
      : "(none — Blender で slot_* Empty を置くと確実)"
  );
  console.info("  mesh sample:", meshNames.join(" | ") || "(no meshes)");
  console.info("  note: 壁/床は名前では判別していません。法線角度の推測のみ（アンカー推奨）");
}
