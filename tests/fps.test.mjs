import assert from "node:assert/strict";
import test from "node:test";

import {frameRate, tooSlow} from "../scripts/fps.mjs";

test("the frame rate is the median of the last seconds, unknown before three of them", () => {
  assert.equal(frameRate([]), null);
  assert.equal(frameRate([60, 58]), null);
  assert.equal(frameRate([60, 12, 58]), 58);
  assert.equal(frameRate([10, 60, 12, 14]), 13);
});

test("a screen counts as slow only below the minimum and only when known", () => {
  assert.equal(tooSlow(20, [12, 14, 15]), true);
  assert.equal(tooSlow(20, [12, 60, 59]), false);
  assert.equal(tooSlow(20, [5]), false);
  assert.equal(tooSlow(0, [5, 5, 5]), false);
});
