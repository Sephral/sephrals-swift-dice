import assert from "node:assert/strict";
import test from "node:test";

import {themeOf} from "../scripts/classes.mjs";
import {CREATURE_LOOKS, readyLook} from "../scripts/colors.mjs";
import {RULES} from "../scripts/systems.mjs";
import {creatureActor, creatureKinds, momentDice, ruleFaces, ruleSystems, sampleActors} from "../scripts/sample-data.mjs";

test("the sample characters carry a class and a look of their own where given", () => {
  const memory = new Map();
  const actors = sampleActors(memory);
  assert.equal(actors.length, 4);
  const ari = actors.find(a => a.id === "ssd-sample-ari");
  assert.deepEqual(themeOf(ari), {key: "fighter", by: "class"});
  assert.ok(ari.getFlag("sephrals-swift-dice", "look"));
  assert.equal(actors.find(a => a.id === "ssd-sample-mira").getFlag("sephrals-swift-dice", "look"), undefined);
  assert.equal(themeOf(actors.find(a => a.id === "ssd-sample-bandit1")), null);
  assert.ok(actors.every(a => a.isOwner && a.name));
});

test("the look of a sample character stays in the memory map", () => {
  const memory = new Map();
  const [first] = sampleActors(memory);
  memory.set(first.id, {pattern: "dots"});
  assert.equal(first.getFlag("sephrals-swift-dice", "look").pattern, "dots");
});

test("every creature kind makes a character that follows that kind", () => {
  for ( const kind of creatureKinds() ) assert.deepEqual(themeOf(creatureActor(kind)), {key: kind, by: "creature"});
  assert.equal(creatureKinds().length, Object.keys(CREATURE_LOOKS).length);
  assert.ok(readyLook("wizard", {}));
});

test("every rule has a system entry, named", () => {
  const systems = ruleSystems();
  assert.deepEqual(systems.map(s => s.key), Object.keys(RULES));
  assert.equal(systems.find(s => s.key === "dnd5e").systemId, "dnd5e");
  assert.equal(systems.find(s => s.key === "d20").systemId, "");
  assert.ok(systems.filter(s => s.key !== "d20").every(s => s.title));
});

test("dice of a triumph and a fumble glow, nothing else does", () => {
  const glow = kind => momentDice(kind).filter(d => d.glow).map(d => d.glow);
  assert.deepEqual(glow("triumph"), ["max"]);
  assert.deepEqual(glow("fumble"), ["min"]);
  assert.deepEqual(glow("both"), ["max", "min"]);
});

test("the faces of the test throw of a rule", () => {
  assert.equal(ruleFaces("d6"), 6);
  assert.equal(ruleFaces("d100"), 100);
  assert.equal(ruleFaces("any"), 20);
});
