import * as THREE from "three";

function collectMeshes(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj);
  });
  return meshes;
}

/** 下向きレイの床ヒット（水平面・最下段＝家具の上ではなく床） */
function pickFloorHitY(hits, roomRoot) {
  if (!hits.length) return null;

  roomRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(roomRoot);
  const floorBandTop = box.min.y + (box.max.y - box.min.y) * 0.22;
  const n = new THREE.Vector3();

  let floorY = null;
  // 遠い方（下の方）から — モニター天板より床を優先
  for (let i = hits.length - 1; i >= 0; i--) {
    const hit = hits[i];
    if (!hit.face) continue;
    n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (n.y < 0.35) continue;
    if (hit.point.y > floorBandTop) continue;
    floorY = hit.point.y;
    break;
  }

  if (floorY == null) {
    for (let i = hits.length - 1; i >= 0; i--) {
      const hit = hits[i];
      if (!hit.face) continue;
      n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
      if (n.y < 0.35) continue;
      floorY = hit.point.y;
      break;
    }
  }

  return floorY;
}

/** 部屋メッシュへ下向きレイで床面 Y を取得 */
export function raycastFloorY(roomRoot, x, z, manifest) {
  if (typeof manifest?.floorY === "number") return manifest.floorY;

  const meshes = collectMeshes(roomRoot);
  if (!meshes.length) return null;

  roomRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(roomRoot);
  const origin = new THREE.Vector3(x, box.max.y + 2, z);
  const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects(meshes, false);
  const floorY = pickFloorHitY(hits, roomRoot);
  if (floorY == null) return box.min.y;

  const raise = manifest?.floorRaise ?? 0.02;
  return floorY + raise;
}

export function estimateRoomFloorY(roomRoot, manifest) {
  roomRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(roomRoot);
  const cx = (box.min.x + box.max.x) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;
  const spanX = box.max.x - box.min.x;
  const spanZ = box.max.z - box.min.z;

  const samples = [
    [cx, cz],
    [cx + spanX * 0.12, cz],
    [cx - spanX * 0.12, cz],
    [cx, cz + spanZ * 0.12],
    [cx, cz - spanZ * 0.12],
  ];

  let best = null;
  for (const [x, z] of samples) {
    const y = raycastFloorY(roomRoot, x, z, manifest);
    if (y != null && (best == null || y < best)) best = y;
  }
  const result = best ?? box.min.y;
  console.info("[shell-floor] floorY:", result.toFixed(3));
  return result;
}
