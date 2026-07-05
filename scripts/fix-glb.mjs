#!/usr/bin/env node
/** GLB 後処理: ウェイト正規化・モーフ削除・マテリアル修正 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { KHRMaterialsSpecular, KHRMaterialsIOR, KHRMaterialsClearcoat } from "@gltf-transform/extensions";
import { dedup, prune, sortPrimitiveWeights } from "@gltf-transform/functions";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2] || path.join(__dirname, "..", "assets", "muu", "speak_mou.glb");
const output = process.argv[3] || input;

if (!fs.existsSync(input)) {
  console.error(`[fix-glb] missing: ${input}`);
  process.exit(2);
}

const io = new NodeIO().registerExtensions([
  KHRMaterialsSpecular,
  KHRMaterialsIOR,
  KHRMaterialsClearcoat,
]);

const document = await io.read(input);
const root = document.getRoot();

for (const mat of root.listMaterials()) {
  const rough = mat.getRoughnessFactor();
  if (rough > 1) mat.setRoughnessFactor(1);
  if (rough < 0) mat.setRoughnessFactor(0);
}

let morphRemoved = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getAttribute("WEIGHTS_0")) {
      sortPrimitiveWeights(prim, 4);
      dedupeVertexInfluences(prim);
    }
    const targets = [...prim.listTargets()];
    for (const target of targets) {
      prim.removeTarget(target);
      morphRemoved += 1;
    }
  }
}

await document.transform(dedup(), prune());
await io.write(output, document);
console.log(`[fix-glb] wrote ${output} (removed ${morphRemoved} morph targets)`);

function dedupeVertexInfluences(prim) {
  const joints = prim.getAttribute("JOINTS_0");
  const weights = prim.getAttribute("WEIGHTS_0");
  if (!joints || !weights) return;

  const count = joints.getCount();
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];

  for (let i = 0; i < count; i += 1) {
    joints.getElement(i, j);
    weights.getElement(i, w);
    const merged = new Map();
    for (let k = 0; k < 4; k += 1) {
      if (w[k] <= 0) continue;
      merged.set(j[k], (merged.get(j[k]) || 0) + w[k]);
    }
    const entries = [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    let sum = entries.reduce((acc, [, wt]) => acc + wt, 0);
    if (sum <= 0) {
      entries.length = 0;
      entries.push([j[0], 1]);
      sum = 1;
    }
    for (let k = 0; k < 4; k += 1) {
      if (k < entries.length) {
        j[k] = entries[k][0];
        w[k] = entries[k][1] / sum;
      } else {
        j[k] = 0;
        w[k] = 0;
      }
    }
    joints.setElement(i, j);
    weights.setElement(i, w);
  }
}
