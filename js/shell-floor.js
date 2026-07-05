import * as THREE from "three";

function collectMeshes(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj);
  });
  return meshes;
}

/** 部屋メッシュへ下向きレイで床面（上向き法線）の Y を取得 */
export function raycastFloorY(roomRoot, x, z, manifest) {
  if (typeof manifest?.floorY === "number") return manifest.floorY;

  const meshes = collectMeshes(roomRoot);
  if (!meshes.length) return null;

  roomRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(roomRoot);
  const midY = (box.min.y + box.max.y) * 0.5;
  const origin = new THREE.Vector3(x, box.max.y + 2, z);
  const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects(meshes, false);

  let floorTop = box.min.y;
  const n = new THREE.Vector3();
  for (const hit of hits) {
    if (!hit.face || hit.point.y >= midY) continue;
    n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (n.y > 0.35 && hit.point.y > floorTop) floorTop = hit.point.y;
  }

  const raise = manifest?.floorRaise ?? 0.02;
  return floorTop + raise;
}

export function estimateRoomFloorY(roomRoot, manifest) {
  const samples = [
    [0, 0],
    [0.35, 0],
    [-0.35, 0],
    [0, 0.35],
    [0, -0.35],
  ];
  let best = null;
  for (const [x, z] of samples) {
    const y = raycastFloorY(roomRoot, x, z, manifest);
    if (y != null && (best == null || y > best)) best = y;
  }
  const result = best ?? new THREE.Box3().setFromObject(roomRoot).min.y;
  console.info("[shell-floor] floorY:", result.toFixed(3));
  return result;
}
