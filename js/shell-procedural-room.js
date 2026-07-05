/** 殻の部屋 — GLB 失敗時 / モバイル向け軽量プロシージャル */

import * as THREE from "three";

function makeMat(color, { emissive = 0x000000, roughness = 0.82, metalness = 0.04 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    roughness,
    metalness,
  });
}

/**
 * @returns {{ group: THREE.Group, fit: { size: THREE.Vector3, dist: number, lookAt: THREE.Vector3, floorY: number }, dispose: () => void }}
 */
export function createProceduralShellRoom(manifest = {}) {
  const group = new THREE.Group();
  group.name = "procedural-shell-room";

  const floorMat = makeMat(manifest?.procedural?.floorColor ?? 0x1a1210);
  const wallMat = makeMat(manifest?.procedural?.wallColor ?? 0x120e0c);
  const trimMat = makeMat(manifest?.procedural?.trimColor ?? 0x3a1818, { emissive: 0x1a0505 });
  const accentMat = makeMat(0x2a1010, { emissive: 0x220808 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.8), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const wallH = 2.6;
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(5.2, wallH), wallMat);
  backWall.position.set(0, wallH / 2, -2.2);
  group.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(4.8, wallH), wallMat);
  leftWall.position.set(-2.5, wallH / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(4.8, wallH), wallMat);
  rightWall.position.set(2.5, wallH / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  group.add(rightWall);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.35), trimMat);
  shelf.position.set(-1.1, 1.35, -2.05);
  group.add(shelf);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.72, 0.62), accentMat);
  desk.position.set(1.05, 0.36, -0.35);
  group.add(desk);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.38, 2.05), trimMat);
  bed.position.set(-0.85, 0.19, 0.95);
  group.add(bed);

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.38), makeMat(0x2a2020));
  pillow.position.set(-0.85, 0.44, 1.72);
  group.add(pillow);

  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 32),
    makeMat(0x180808, { emissive: 0x0a0202, roughness: 0.95 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.15, 0.008, 0.15);
  group.add(rug);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, wallH * 0.92, 0.04), makeMat(0xe50914, { emissive: 0x660008 }));
  strip.position.set(-2.48, wallH / 2, 0);
  group.add(strip);

  const lamp = new THREE.PointLight(0xffe8d0, manifest?.procedural?.lampIntensity ?? 0.55, 8, 2);
  lamp.position.set(1.05, 1.55, -0.2);
  group.add(lamp);

  const lookAt = new THREE.Vector3(0, 0.88, 0.2);
  const dist = (manifest?.cameraDistance ?? 1.35) * 2.65;

  return {
    group,
    fit: {
      size: new THREE.Vector3(5, 2.6, 5),
      dist,
      lookAt,
      floorY: 0,
    },
    dispose() {
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose?.());
        }
        if (obj.isLight) obj.dispose?.();
      });
    },
  };
}
