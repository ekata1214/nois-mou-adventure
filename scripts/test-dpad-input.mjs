import assert from "node:assert/strict";
import { isOnDpadCross, normalizePadCoords, resolveDpadDirs } from "../js/dpad-input.js";

function dirs(r) {
  return ["up", "down", "left", "right"].filter((k) => r[k]).join("+") || "none";
}

// --- normalize ---
{
  const rect = { left: 100, top: 200, width: 100, height: 100 };
  const c = normalizePadCoords(150, 250, rect);
  assert.equal(c.x, 0);
  assert.equal(c.y, 0);
  const r = normalizePadCoords(200, 250, rect);
  assert.equal(r.x, 1);
  assert.equal(r.y, 0);
}

// --- cross hit box: corners rejected, arms accepted ---
assert.equal(isOnDpadCross(0, -0.8), true, "up arm");
assert.equal(isOnDpadCross(0.8, 0), true, "right arm");
assert.equal(isOnDpadCross(0.85, 0.85), false, "corner rejected");
assert.equal(isOnDpadCross(0, 0), true, "center on cross");
assert.equal(isOnDpadCross(1.2, 0), false, "outside pad");

// --- deadzone ---
assert.equal(dirs(resolveDpadDirs(0.1, 0.1)), "none");
assert.equal(dirs(resolveDpadDirs(0.2, 0)), "none");

// --- cardinals ---
assert.equal(dirs(resolveDpadDirs(0, -0.9)), "up");
assert.equal(dirs(resolveDpadDirs(0, 0.9)), "down");
assert.equal(dirs(resolveDpadDirs(-0.9, 0)), "left");
assert.equal(dirs(resolveDpadDirs(0.9, 0)), "right");

// slight off-axis still cardinal (not diagonal)
assert.equal(dirs(resolveDpadDirs(0.25, -0.9)), "up");
assert.equal(dirs(resolveDpadDirs(0.9, 0.2)), "right");

// --- diagonal only when strong ---
assert.equal(dirs(resolveDpadDirs(0.8, -0.8)), "up+right");
assert.equal(dirs(resolveDpadDirs(-0.75, 0.75)), "down+left");

// near-diagonal but weak secondary → cardinal
{
  const r = resolveDpadDirs(0.9, -0.35);
  assert.equal(dirs(r), "right", `expected right, got ${dirs(r)}`);
}

// --- hysteresis: stay active with smaller push ---
{
  const cold = resolveDpadDirs(0.35, 0, { wasActive: false });
  assert.equal(dirs(cold), "none");
  const warm = resolveDpadDirs(0.35, 0, { wasActive: true });
  assert.equal(dirs(warm), "right");
}

console.log("test-dpad-input: ok");
