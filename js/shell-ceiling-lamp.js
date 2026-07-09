import * as THREE from "three";
import { getRoomBounds } from "./shell-floor.js";

const LAMP_NODE_NAMES = ["kt", "lamp", "pendant_lamp", "ceiling_lamp", "light_kt"];
const RED_MAT_THRESHOLD = { r: 0.75, gMax: 0.65, bMax: 0.35 };

function meshBaseColor(mesh) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) {
    if (m?.color) return m.color;
  }
  return null;
}

function isRedLampMaterial(mesh) {
  const c = meshBaseColor(mesh);
  if (!c) return false;
  return c.r >= RED_MAT_THRESHOLD.r && c.g <= RED_MAT_THRESHOLD.gMax && c.b <= RED_MAT_THRESHOLD.bMax;
}

/** GLB 内の赤ペンダント（this ver2.glb → ノード kt / Cylinder）を探す */
export function findPendantLampNode(roomRoot, manifest) {
  if (!roomRoot) return null;

  const preferred = manifest?.ceilingLampNode;
  if (preferred) {
    const hit = roomRoot.getObjectByName(preferred);
    if (hit) return hit;
  }

  for (const name of LAMP_NODE_NAMES) {
    const hit = roomRoot.getObjectByName(name);
    if (hit) return hit;
  }

  const box = getRoomBounds(roomRoot);
  const roomH = box.max.y - box.min.y;
  const cx = (box.min.x + box.max.x) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;
  let best = null;
  let bestScore = -Infinity;

  roomRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    const name = (obj.name || "").toLowerCase();
    if (/craft:|bulb|filament/i.test(name)) return;

    obj.updateWorldMatrix(true, false);
    const b = new THREE.Box3().setFromObject(obj);
    const center = b.getCenter(new THREE.Vector3());
    const size = b.getSize(new THREE.Vector3());

    let score = 0;
    if (name === "cylinder" || name.includes("lamp") || name === "kt") score += 8;
    if (isRedLampMaterial(obj)) score += 12;
    if (center.y > box.min.y + roomH * 0.55) score += 4;
    const distXZ = Math.hypot(center.x - cx, center.z - cz);
    score += Math.max(0, 6 - distXZ * 2);
    if (size.y > size.x * 1.2 && size.y < roomH * 0.45) score += 3;

    if (score > bestScore) {
      bestScore = score;
      best = obj;
    }
  });

  if (best && bestScore >= 10) return best;
  return null;
}

function bulbLocalOffset(lampNode) {
  lampNode.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(lampNode);
  const size = box.getSize(new THREE.Vector3());
  const worldBulb = box.getCenter(new THREE.Vector3());
  // シェード内やや下（開口付近）— ムー真上から光が落ちる高さ
  worldBulb.y = box.min.y + size.y * 0.38;

  const local = lampNode.worldToLocal(worldBulb.clone());
  const radius = Math.min(size.x, size.z) * 0.22;
  const clampedR = Math.max(0.012, Math.min(radius, size.y * 0.28));
  return { local, radiusWorld: clampedR, size };
}

function worldUnitScale(node) {
  const s = new THREE.Vector3();
  node.getWorldScale(s);
  return (s.x + s.y + s.z) / 3;
}

/**
 * 赤ランプ（kt）の内側に電球＋ライトを取り付け
 * @returns {{ setActive(on: boolean), dispose(), lampNode }}
 */
export function attachPendantLampBulb(roomRoot, scene, manifest) {
  const lampNode = findPendantLampNode(roomRoot, manifest);
  if (!lampNode) {
    console.warn("[shell-lamp] pendant lamp not found — expected node kt");
    return { setActive() {}, dispose() {}, lampNode: null };
  }

  const { local, radiusWorld } = bulbLocalOffset(lampNode);
  const unit = worldUnitScale(lampNode);
  const bulbRadius = Math.max(0.018, Math.min(radiusWorld, unit * 0.42));

  const rig = new THREE.Group();
  rig.name = "shell:pendant-bulb";

  const filament = new THREE.Mesh(
    new THREE.SphereGeometry(bulbRadius, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfff4d0,
      emissive: 0xffa840,
      emissiveIntensity: 0,
      roughness: 0.35,
      metalness: 0.05,
    })
  );
  filament.name = "bulb-filament";
  rig.add(filament);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(bulbRadius * 1.35, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffe8b0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  halo.name = "bulb-halo";
  rig.add(halo);

  const light = new THREE.PointLight(0xffc878, 0, bulbRadius * 28, 1.6);
  light.name = "bulb-light";
  rig.add(light);

  rig.position.copy(local);
  lampNode.add(rig);

  console.info(
    "[shell-lamp] attached to",
    lampNode.name,
    "local",
    local.toArray().map((n) => n.toFixed(3)),
    "bulbR",
    bulbRadius.toFixed(3)
  );

  let active = false;

  function setActive(on) {
    active = Boolean(on);
    light.intensity = active ? 1.35 : 0;
    filament.material.emissiveIntensity = active ? 1.1 : 0;
    halo.material.opacity = active ? 0.22 : 0;
    if (active) {
      scene.environmentIntensity = 1;
    }
  }

  function dispose() {
    lampNode.remove(rig);
    filament.geometry.dispose();
    filament.material.dispose();
    halo.geometry.dispose();
    halo.material.dispose();
  }

  return { setActive, dispose, lampNode, rig, light, filament };
}
