import * as THREE from "three";

function isCraftNode(obj) {
  let node = obj;
  while (node) {
    if (node.name?.startsWith?.("craft:")) return true;
    node = node.parent;
  }
  return false;
}

export function collectRoomMeshes(roomRoot) {
  const meshes = [];
  roomRoot.traverse((obj) => {
    if (obj.isMesh && !isCraftNode(obj)) meshes.push(obj);
  });
  return meshes;
}

export function getRoomBounds(roomRoot) {
  roomRoot.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let initialized = false;
  for (const child of roomRoot.children) {
    if (child.name?.startsWith?.("craft:")) continue;
    const childBox = new THREE.Box3().setFromObject(child);
    if (!initialized) {
      box.copy(childBox);
      initialized = true;
    } else {
      box.union(childBox);
    }
  }
  if (!initialized) box.setFromObject(roomRoot);
  return box;
}

/** 下向きレイの床ヒット（水平面・最下段＝家具の上ではなく床） */
function pickFloorHitY(hits, roomRoot) {
  if (!hits.length) return null;

  roomRoot.updateMatrixWorld(true);
  const box = getRoomBounds(roomRoot);
  const floorBandTop = box.min.y + (box.max.y - box.min.y) * 0.22;
  const n = new THREE.Vector3();

  let floorY = null;
  for (let i = hits.length - 1; i >= 0; i -= 1) {
    const hit = hits[i];
    if (!hit.face) continue;
    n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (n.y < 0.35) continue;
    if (hit.point.y > floorBandTop) continue;
    floorY = hit.point.y;
    break;
  }

  if (floorY == null) {
    for (let i = hits.length - 1; i >= 0; i -= 1) {
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

  const meshes = collectRoomMeshes(roomRoot);
  if (!meshes.length) return null;

  const box = getRoomBounds(roomRoot);
  const origin = new THREE.Vector3(x, box.max.y + 2, z);
  const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects(meshes, false);
  const floorY = pickFloorHitY(hits, roomRoot);
  if (floorY == null) return box.min.y;

  const raise = manifest?.floorRaise ?? 0.02;
  return floorY + raise;
}

/** 室内から壁面へレイを飛ばし、貼り付け位置を取得 */
export function raycastWallAttach(roomRoot, origin, direction) {
  const meshes = collectRoomMeshes(roomRoot);
  if (!meshes.length) return null;

  const dir = direction.clone().normalize();
  const ray = new THREE.Raycaster(origin, dir);
  ray.far = 50;
  const hits = ray.intersectObjects(meshes, false);
  const n = new THREE.Vector3();
  const box = getRoomBounds(roomRoot);
  const cx = (box.min.x + box.max.x) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;
  const center = new THREE.Vector3(cx, origin.y, cz);

  for (const hit of hits) {
    if (!hit.face) continue;
    n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (Math.abs(n.y) > 0.42) continue;

    const flat = n.clone();
    flat.y = 0;
    if (flat.lengthSq() < 0.04) continue;
    flat.normalize();

    const toCenter = center.clone().sub(hit.point);
    toCenter.y = 0;
    if (toCenter.lengthSq() < 0.0001) continue;
    toCenter.normalize();

    if (flat.dot(toCenter) < 0.1) continue;

    return { point: hit.point.clone(), normal: flat };
  }

  return null;
}

export function estimateRoomFloorY(roomRoot, manifest) {
  const box = getRoomBounds(roomRoot);
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
