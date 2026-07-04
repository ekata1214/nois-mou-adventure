#!/usr/bin/env node
/** GLB マテリアルの接続詳細（baseColor が本当に diffuse か） */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error("usage: node inspect-glb-deep.mjs <file.glb>");
  process.exit(2);
}

const io = new NodeIO();
const doc = await io.read(input);
const root = doc.getRoot();

console.log(`\n=== deep inspect: ${path.basename(input)} ===\n`);

for (const mat of root.listMaterials()) {
  const name = mat.getName() || "(unnamed)";
  const base = mat.getBaseColorTexture();
  const normal = mat.getNormalTexture();
  const mr = mat.getMetallicRoughnessTexture();
  const occ = mat.getOcclusionTexture();
  const emissive = mat.getEmissiveTexture();
  const factor = mat.getBaseColorFactor().map((v) => v.toFixed(3)).join(", ");

  console.log(`Material: ${name}`);
  console.log(`  baseColorFactor: [${factor}]`);
  console.log(`  baseColorTexture: ${base?.getName() || base?.getURI() || "NONE"}`);
  console.log(`  normalTexture: ${normal?.getName() || normal?.getURI() || "NONE"}`);
  console.log(`  metallicRoughnessTexture: ${mr?.getName() || mr?.getURI() || "NONE"}`);
  console.log(`  occlusionTexture: ${occ?.getName() || occ?.getURI() || "NONE"}`);
  console.log(`  emissiveTexture: ${emissive?.getName() || emissive?.getURI() || "NONE"}`);
  console.log(`  metallicFactor: ${mat.getMetallicFactor()}  roughnessFactor: ${mat.getRoughnessFactor()}`);
  console.log("");
}

for (const tex of root.listTextures()) {
  const img = tex.getImage();
  const mime = tex.getMimeType() || "?";
  const size = img ? `${img.byteLength} bytes` : "no image data";
  console.log(`Texture: ${tex.getName() || "(unnamed)"}  mime=${mime}  ${size}`);
}
