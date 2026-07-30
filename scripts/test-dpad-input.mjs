import assert from "node:assert/strict";
import {
  isOnDpadCross,
  normalizePadCoords,
  resolveDpadDirs,
  resolveDpadDirsFromDir,
} from "../js/dpad-input.js";

function dirs(r) {
  return ["up", "down", "left", "right"].filter((k) => r[k]).join("+") || "none";
}

{
  const rect = { left: 100, top: 200, width: 100, height: 100 };
  const c = normalizePadCoords(150, 250, rect);
  assert.equal(c.x, 0);
  assert.equal(c.y, 0);
}

assert.equal(isOnDpadCross(0, -0.8), true);
assert.equal(isOnDpadCross(0.85, 0.85), false);

assert.equal(dirs(resolveDpadDirsFromDir("up")), "up");
assert.equal(dirs(resolveDpadDirsFromDir("left")), "left");
assert.equal(dirs(resolveDpadDirsFromDir(null)), "none");
assert.equal(resolveDpadDirsFromDir("right").x, 1);
assert.equal(resolveDpadDirsFromDir("down").y, 1);

assert.equal(dirs(resolveDpadDirs(0, -0.9)), "up");
assert.equal(dirs(resolveDpadDirs(0.9, 0)), "right");
assert.equal(dirs(resolveDpadDirs(0.15, 0)), "none");

console.log("test-dpad-input: ok");
