/** GLTFLoader — HumGen マテリアル向け（r170 の GLTFLoader は KHR 拡張を内蔵） */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export function createMuuGltfLoader() {
  return new GLTFLoader();
}

export function fixMuuMaterials(root) {
  let texCount = 0;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.needsUpdate = true;

      if (typeof mat.roughness === "number") {
        mat.roughness = Math.min(1, Math.max(0, mat.roughness));
      }
      if (typeof mat.metalness === "number") {
        mat.metalness = Math.min(1, Math.max(0, mat.metalness));
      }
      if (mat.clearcoatRoughness != null) {
        mat.clearcoatRoughness = Math.min(1, Math.max(0, mat.clearcoatRoughness));
      }

      const colorMaps = ["map", "emissiveMap"];
      const dataMaps = ["normalMap", "roughnessMap", "metalnessMap", "aoMap", "clearcoatNormalMap"];
      for (const key of colorMaps) {
        const tex = mat[key];
        if (tex?.isTexture) {
          tex.colorSpace = THREE.SRGBColorSpace;
          texCount += 1;
        }
      }
      for (const key of dataMaps) {
        const tex = mat[key];
        if (tex?.isTexture) {
          tex.colorSpace = THREE.LinearSRGBColorSpace;
          texCount += 1;
        }
      }

      const name = mat.name || "";
      const noTex = !mat.map && !mat.emissiveMap;

      if (/brain|meat/i.test(name) && noTex) {
        mat.color?.setRGB?.(0.85, 0.35, 0.32);
        mat.roughness = 0.55;
        mat.metalness = 0;
      } else if (/HG_Eyes_Outer/i.test(name) && noTex) {
        mat.color?.setRGB?.(1, 1, 1);
        mat.transparent = true;
        mat.opacity = 0.92;
      } else if (noTex && mat.color && mat.color.r < 0.05 && mat.color.g < 0.05 && mat.color.b < 0.05) {
        mat.color.setRGB(0.82, 0.72, 0.68);
      }

      if (mat.isMeshPhysicalMaterial) {
        mat.envMapIntensity = mat.envMapIntensity ?? 0.35;
      }
    }
  });
  console.info(`[shell-muu] materials fixed, texture maps: ${texCount}`);
}
