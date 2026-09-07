import assert from "node:assert/strict";
import { normalizePadCoords, resolveDpadDirs, isOnDpadCross } from "../js/dpad-input.js";
import { scaleRpgOutcome } from "../js/difficulty.js";
import { resolveChoice, CHOICE, ENTITY_DEFS } from "../js/entities.js";

// Legacy normalization now stays in screen space. Production controls resolve
// the actual button under the finger; they no longer rotate an analog AABB.
{
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  const n = normalizePadCoords(50, 10, rect);
  assert.equal(n.x, 0);
  assert.ok(Math.abs(n.y + 0.8) < 0.01);
}

// no double-scale: resolveChoice already applies rpgHpMult
{
  const entity = {
    type: Object.keys(ENTITY_DEFS)[0],
    motif: null,
    regionId: "ki",
    alive: true,
    scale: 1,
  };
  const diff = { rpgHpMult: 1.4, mercy: false };
  const once = resolveChoice(entity, CHOICE.KILL, diff);
  const twice = scaleRpgOutcome(once, diff);
  assert.notEqual(once.hpDelta, twice.hpDelta, "scaleRpgOutcome would double — callers must not both apply");
  assert.ok(once.hpDelta > 0);
}

assert.equal(isOnDpadCross(0.9, 0.9), false);
assert.equal(resolveDpadDirs(0.15, 0).active, false);

console.log("test-bug-sweep: ok");
