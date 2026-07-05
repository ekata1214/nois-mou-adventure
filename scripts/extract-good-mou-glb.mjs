#!/usr/bin/env node
/**
 * speak_mou.glb から待機ループ用 good-mou.glb を生成（アニメのみ・軽量）
 * GitHub Pages に good-mou.glb が無い場合のフォールバック
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "assets/muu/speak_mou.glb");
const outPath = path.join(root, "assets/muu/good-mou.glb");

const GOOD_PATTERNS = [/good[-_]?mou/i, /layer0(?!\.001)/i];

function pickGoodAnimation(doc) {
  const root = doc.getRoot();
  const animations = root.listAnimations();
  for (const pat of GOOD_PATTERNS) {
    const hit = animations.find((a) => pat.test(a.getName()));
    if (hit) return hit;
  }
  return (
    animations.find((a) => !/remap/i.test(a.getName()) && a.getName().includes("Layer0")) ??
    animations[0] ??
    null
  );
}

if (!fs.existsSync(srcPath)) {
  console.warn("[extract-good-mou] skip — speak_mou.glb missing");
  process.exit(0);
}

const io = new NodeIO();
const doc = await io.read(srcPath);
const anim = pickGoodAnimation(doc);
if (!anim) {
  console.warn("[extract-good-mou] skip — no animation in speak_mou.glb");
  process.exit(0);
}

for (const a of [...doc.getRoot().listAnimations()]) {
  if (a !== anim) a.dispose();
}
anim.setName("good-mou");

await io.write(outPath, doc);
const size = fs.statSync(outPath).size;
console.log(`[extract-good-mou] wrote ${outPath} (${(size / 1024 / 1024).toFixed(1)} MB) clip=${anim.getName()}`);
