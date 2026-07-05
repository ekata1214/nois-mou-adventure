import * as THREE from "three";
import { raycastFloorY, raycastWallAttach, getRoomBounds } from "./shell-floor.js";
import { resolveCraftAnchor } from "./shell-room-anchors.js";

/** 部屋内の相対位置（u/v = 中心からの割合、±0.45 以内が室内） */
const DEFAULT_CRAFT_SLOTS = {
  warm_lamp: { kind: "floor", u: -0.24, v: 0.1 },
  grow_pot: { kind: "floor", u: 0.2, v: 0.18 },
  memo_wall: { kind: "wall", u: 0.06, v: -0.28, wall: "back", wallHeight: 0.44 },
};

const WALL_DIRS = {
  back: new THREE.Vector3(0, 0, -1),
  front: new THREE.Vector3(0, 0, 1),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
};

function slotFor(recipeId, manifest) {
  return manifest?.craftSlots?.[recipeId] ?? DEFAULT_CRAFT_SLOTS[recipeId];
}

function roomUnit(roomRoot) {
  const box = getRoomBounds(roomRoot);
  const w = box.max.x - box.min.x;
  const d = box.max.z - box.min.z;
  return Math.min(w, d) * 0.065;
}

function interiorXZ(box, u, v) {
  const cx = (box.min.x + box.max.x) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;
  const spanX = box.max.x - box.min.x;
  const spanZ = box.max.z - box.min.z;
  return {
    x: cx + u * spanX * 0.42,
    z: cz + v * spanZ * 0.42,
  };
}

function placeOnFloor(roomRoot, manifest, fit, slot) {
  const box = getRoomBounds(roomRoot);
  const { x, z } = interiorXZ(box, slot.u ?? 0, slot.v ?? 0);
  const y = raycastFloorY(roomRoot, x, z, manifest) ?? fit?.floorY ?? box.min.y;
  return { position: new THREE.Vector3(x, y, z), rotation: new THREE.Euler(0, 0, 0) };
}

function placeOnWall(roomRoot, manifest, fit, slot) {
  const box = getRoomBounds(roomRoot);
  const floorY = fit?.floorY ?? box.min.y;
  const roomH = box.max.y - box.min.y;
  const { x, z } = interiorXZ(box, slot.u ?? 0, slot.v ?? 0);
  const y = floorY + roomH * (slot.wallHeight ?? 0.44);
  const dir = WALL_DIRS[slot.wall ?? "back"].clone();
  const origin = new THREE.Vector3(x, y, z);
  const attach = raycastWallAttach(roomRoot, origin, dir);

  if (attach) {
    const intoRoom = attach.normal.clone().negate();
    intoRoom.y = 0;
    if (intoRoom.lengthSq() > 0.0001) intoRoom.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), intoRoom);
    const inset = attach.normal.clone().multiplyScalar(roomUnit(roomRoot) * 0.08);
    return {
      position: attach.point.clone().add(inset),
      quaternion: quat,
    };
  }

  const cx = (box.min.x + box.max.x) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;
  const fallback = new THREE.Vector3(
    cx + dir.x * (box.max.x - box.min.x) * 0.38,
    y,
    cz + dir.z * (box.max.z - box.min.z) * 0.38
  );
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().negate());
  return { position: fallback, quaternion: quat };
}

export function createCraftProp(recipeId, roomRoot) {
  const s = roomUnit(roomRoot);
  const group = new THREE.Group();
  group.name = `craft:${recipeId}`;

  if (recipeId === "warm_lamp") {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(s * 0.55, s * 0.75, s * 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 0.85 })
    );
    base.position.y = s * 0.18;
    group.add(base);

    const shade = new THREE.Mesh(
      new THREE.SphereGeometry(s * 0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xffd89a,
        emissive: 0xffa040,
        emissiveIntensity: 0.85,
        roughness: 0.35,
        transparent: true,
        opacity: 0.92,
      })
    );
    shade.position.y = s * 0.95;
    group.add(shade);

    const glow = new THREE.PointLight(0xffc870, 0.55, s * 12);
    glow.position.y = s * 1.1;
    group.add(glow);
  } else if (recipeId === "memo_wall") {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(s * 4.2, s * 2.8, s * 0.12),
      new THREE.MeshStandardMaterial({ color: 0x3a4a52, roughness: 0.9 })
    );
    group.add(board);

    for (let i = 0; i < 4; i += 1) {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(s * (0.85 + (i % 2) * 0.25), s * 0.65),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? 0xe8f4ff : 0xfff0d8,
          roughness: 0.75,
          side: THREE.DoubleSide,
        })
      );
      note.position.set(s * (-1 + (i % 2) * 1.6), s * (0.5 - Math.floor(i / 2) * 1), s * 0.08);
      note.rotation.z = (i - 1.5) * 0.08;
      group.add(note);
    }
  } else if (recipeId === "grow_pot") {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(s * 0.95, s * 0.72, s * 1.15, 14),
      new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.88 })
    );
    pot.position.y = s * 0.58;
    group.add(pot);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(s * 0.85, s * 0.85, s * 0.15, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a1f14, roughness: 1 })
    );
    soil.position.y = s * 1.08;
    group.add(soil);

    const sprout = new THREE.Mesh(
      new THREE.ConeGeometry(s * 0.32, s * 0.95, 8),
      new THREE.MeshStandardMaterial({ color: 0x5ecf6a, roughness: 0.7 })
    );
    sprout.position.y = s * 1.55;
    group.add(sprout);
  }

  return group;
}

export function placeCraftProp(prop, recipeId, roomRoot, manifest, fit, anchors) {
  const slot = slotFor(recipeId, manifest);
  if (!slot) return;

  const anchor = resolveCraftAnchor(recipeId, anchors, manifest);
  if (anchor) {
    prop.position.copy(anchor.position);
    prop.quaternion.copy(anchor.quaternion);
    prop.rotation.y += slot.yaw ?? 0;
    return;
  }

  let placed;
  if (slot.kind === "wall") {
    placed = placeOnWall(roomRoot, manifest, fit, slot);
    prop.position.copy(placed.position);
    if (placed.quaternion) prop.quaternion.copy(placed.quaternion);
    prop.rotation.y += slot.yaw ?? 0;
  } else {
    placed = placeOnFloor(roomRoot, manifest, fit, slot);
    prop.position.copy(placed.position);
    prop.rotation.set(0, slot.yaw ?? 0, 0);
  }
}

export function syncCraftedProps(roomRoot, craftedIds, fit, manifest, anchors) {
  if (!roomRoot) return;
  const wanted = new Set(craftedIds ?? []);

  roomRoot.children
    .filter((child) => child.name?.startsWith("craft:"))
    .forEach((child) => {
      const id = child.name.slice(6);
      if (!wanted.has(id)) roomRoot.remove(child);
    });

  for (const id of wanted) {
    const existing = roomRoot.getObjectByName(`craft:${id}`);
    if (existing) roomRoot.remove(existing);
    const prop = createCraftProp(id, roomRoot);
    roomRoot.add(prop);
    placeCraftProp(prop, id, roomRoot, manifest, fit, anchors);
  }
}
