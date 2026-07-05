#!/usr/bin/env node
/** GLB の中身を調査（テクスチャ・マテリアル・アニメ） */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2] || path.join(__dirname, "..", "assets", "muu", "speak_mou.glb");

if (!fs.existsSync(input)) {
  console.error(`[inspect-glb] missing: ${input}`);
  process.exit(2);
}

const io = new NodeIO();
const doc = await io.read(input);
const root = doc.getRoot();

const sizeMb = (fs.statSync(input).size / (1024 * 1024)).toFixed(2);
console.log(`\n=== inspect-glb: ${path.basename(input)} (${sizeMb} MB) ===\n`);

const textures = root.listTextures();
const materials = root.listMaterials();
const meshes = root.listMeshes();
const animations = root.listAnimations();

console.log(`textures: ${textures.length}`);
for (const tex of textures) {
  const uri = tex.getURI() || "(embedded buffer)";
  console.log(`  - ${tex.getName() || "(unnamed)"} ${uri}`);
}

console.log(`\nmaterials: ${materials.length}`);
for (const mat of materials) {
  const base = mat.getBaseColorTexture();
  const baseFactor = mat.getBaseColorFactor();
  const name = mat.getName() || "(unnamed)";
  const hasTex = base ? "✓ texture" : "✗ NO texture";
  const color = baseFactor.map((v) => v.toFixed(2)).join(", ");
  console.log(`  - ${name}: ${hasTex}  color=[${color}]`);
}

console.log(`\nmeshes: ${meshes.length}`);
for (const mesh of meshes) {
  console.log(`  mesh: ${mesh.getName() || "(unnamed)"}`);
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    const matName = mat?.getName() || "(no material)";
    const hasUv = prim.getAttribute("TEXCOORD_0") ? "UV✓" : "UV✗";
    const mode = prim.getMode();
    console.log(`    prim: mat=${matName} ${hasUv} mode=${mode}`);
  }
}

console.log(`\nanimations: ${animations.length}`);
for (const anim of animations) {
  console.log(`  - ${anim.getName() || "(unnamed)"} (${anim.listChannels().length} channels)`);
}

console.log("\n=== 判定 ===");
if (textures.length === 0) {
  console.log("✗ GLB 内にテクスチャ画像なし → Blender export か HumGen マテリアルが glTF 非対応");
}
const noTexMats = materials.filter((m) => !m.getBaseColorTexture()).length;
if (noTexMats > 0) {
  console.log(`△ テクスチャ無しマテリアル: ${noTexMats}/${materials.length} → 黒い部位の原因になりやすい`);
}
if (animations.length === 0) {
  console.log("✗ アニメーションなし");
} else {
  console.log("✓ アニメーションあり");
}
console.log("");
