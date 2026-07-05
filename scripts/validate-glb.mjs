#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBytes } from "gltf-validator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2] || path.join(__dirname, "..", "assets", "muu", "speak_mou.glb");
const maxErrors = Number(process.argv[3] || 20);

if (!fs.existsSync(input)) {
  console.error(`[validate-glb] missing: ${input}`);
  process.exit(2);
}

const data = fs.readFileSync(input);
const uri = path.basename(input);
const report = await validateBytes(new Uint8Array(data), { uri });

const errors = report.issues.filter((i) => i.severity === 0);
const warnings = report.issues.filter((i) => i.severity === 1);

console.log(`[validate-glb] ${uri}`);
console.log(`  animations: ${report.info?.animations?.length ?? 0}`);
if (report.info?.animations?.length) {
  for (const anim of report.info.animations) {
    console.log(`    - ${anim.name}`);
  }
}
console.log(`  errors: ${errors.length}`);
console.log(`  warnings: ${warnings.length}`);

for (const issue of errors.slice(0, maxErrors)) {
  console.log(`  ERR ${issue.code}: ${issue.message}`);
}

if (errors.length > 0) {
  process.exit(1);
}
