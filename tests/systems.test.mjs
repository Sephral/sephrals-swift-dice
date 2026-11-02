import assert from "node:assert/strict";
import test from "node:test";

import {diceToThrow} from "../scripts/rolls.mjs";
import {RULES, SYSTEM_RULES, customJudge, judgeFor, parseValues, ruleKey} from "../scripts/systems.mjs";

/** Saved roll data like Foundry writes it. */
const die = (faces, results, extra = {}) => ({class: "Die", faces, number: results.length,
  results: results.map(r => (typeof r === "number" ? {result: r, active: true} : r)), ...extra});

/** The glow of every die a judge gives a roll. */
const glows = (judge, roll) => diceToThrow([roll], {judge}).dice.map(d => d.glow);

test("unknown systems use the classic d20 rule", () => {
  const judge = judgeFor({systemId: "worldbuilding"});
  assert.deepEqual(glows(judge, {terms: [die(20, [20]), die(6, [6])]}), ["max", null]);
  assert.deepEqual(glows(judge, {terms: [die(20, [1])]}), ["min"]);
  assert.deepEqual(glows(judge, {terms: [die(20, [12])]}), [null]);
  assert.equal(ruleKey("worldbuilding"), "d20");
});

test("D&D 5e: the system's critical range, damage has no moment", () => {
  const judge = judgeFor({systemId: "dnd5e"});
  const attack = {validD20Roll: true, isCritical: true, isFumble: false,
    terms: [die(20, [19, {result: 3, active: false, discarded: true}])]};
  assert.deepEqual(glows(judge, attack), ["max", null]);
  const fumble = {validD20Roll: true, isCritical: false, isFumble: true, terms: [die(20, [1])]};
  assert.deepEqual(glows(judge, fumble), ["min"]);
  // A natural 20 the system does not count stays calm
  const plain = {validD20Roll: true, isCritical: false, isFumble: false, terms: [die(20, [20])]};
  assert.deepEqual(glows(judge, plain), [null]);
  const damage = {class: "DamageRoll", terms: [die(20, [20])]};
  assert.deepEqual(glows(judge, damage), [null]);
  // Rolls typed into the chat use the classic rule
  assert.deepEqual(glows(judge, {class: "Roll", terms: [die(20, [20])]}), ["max"]);
  assert.deepEqual(glows(judge, {class: "BasicRoll", terms: [die(20, [1])]}), ["min"]);
});

test("PF2e: degree of success wins over the natural number", () => {
  const judge = judgeFor({systemId: "pf2e"});
  const crit = {class: "CheckRoll", options: {degreeOfSuccess: 3}, terms: [die(20, [15])]};
  assert.deepEqual(glows(judge, crit), ["max"]);
  const natural20Fails = {class: "CheckRoll", options: {degreeOfSuccess: 1}, terms: [die(20, [20])]};
  assert.deepEqual(glows(judge, natural20Fails), [null]);
  const critFail = {class: "StrikeAttackRoll", options: {degreeOfSuccess: 0}, terms: [die(20, [9])]};
  assert.deepEqual(glows(judge, critFail), ["min"]);
  const noDc = {class: "CheckRoll", options: {}, terms: [die(20, [1])]};
  assert.deepEqual(glows(judge, noDc), ["min"]);
  assert.deepEqual(glows(judge, {class: "DamageRoll", terms: [die(20, [20])]}), [null]);
});

test("Savage Worlds: snake eyes and the die that made the raise", () => {
  const judge = judgeFor({systemId: "swade"});
  const pool = (trait, wild) => ({terms: [{class: "PoolTerm", rolls: [{terms: [die(8, trait)]}, {terms: [die(6, wild)]}]}]});
  assert.deepEqual(glows(judge, {...pool([1], [1]), isCritfail: true, successes: -1}), ["min", "min"]);
  assert.deepEqual(glows(judge, {...pool([8, 3], [2]), isCritfail: false, successes: 2}), ["max", "max", null]);
  assert.deepEqual(glows(judge, {...pool([5], [2]), isCritfail: false, successes: 1}), [null, null]);
  assert.deepEqual(glows(judge, {terms: [die(6, [6])]}), [null]);
});

test("Crucible: margin against the DC, all dice of the check", () => {
  const judge = judgeFor({systemId: "crucible"});
  assert.deepEqual(glows(judge, {isCriticalSuccess: true, terms: [die(8, [8, 7, 6])]}), ["max", "max", "max"]);
  assert.deepEqual(glows(judge, {isCriticalFailure: true, isCriticalSuccess: false, terms: [die(8, [1, 2, 1])]}),
    ["min", "min", "min"]);
  assert.deepEqual(glows(judge, {isCriticalSuccess: false, isCriticalFailure: false, terms: [die(8, [8, 8, 8])]}),
    [null, null, null]);
});

test("roll under: a low d100 or d20 is the triumph", () => {
  const coc = judgeFor({systemId: "CoC7"});
  assert.deepEqual(glows(coc, {terms: [die(100, [100])]}), ["min", "min"]);
  assert.deepEqual(glows(coc, {terms: [die(100, [50])]}), [null, null]);
  const dragonbane = judgeFor({systemId: "dragonbane"});
  assert.deepEqual(glows(dragonbane, {terms: [die(20, [1])]}), ["max"]);
  assert.deepEqual(glows(dragonbane, {terms: [die(20, [20])]}), ["min"]);
});

test("pools, pairs and sums of other systems", () => {
  const blades = judgeFor({systemId: "blades-in-the-dark"});
  assert.deepEqual(glows(blades, {terms: [die(6, [6, 6, 2])]}), ["max", "max", null]);
  assert.deepEqual(glows(blades, {terms: [die(6, [6, 3])]}), [null, null]);
  const daggerheart = judgeFor({systemId: "daggerheart"});
  assert.deepEqual(glows(daggerheart, {terms: [die(12, [7]), die(12, [7])]}), ["max", "max"]);
  assert.deepEqual(glows(daggerheart, {terms: [die(12, [7, 7])]}), [null, null]);
  const pbta = judgeFor({systemId: "pbta"});
  assert.deepEqual(glows(pbta, {terms: [die(6, [6, 6])]}), ["max", "max"]);
  assert.deepEqual(glows(pbta, {terms: [die(6, [1, 1])]}), ["min", "min"]);
  const fate = {terms: [{class: "FateDie", faces: 3, results: [1, 1, 1, 1].map(r => ({result: r, active: true}))}]};
  assert.deepEqual(glows(judgeFor({systemId: "fate-core-official"}), fate), ["max", "max", "max", "max"]);
  assert.deepEqual(glows(judgeFor({systemId: "gurps"}), {terms: [die(6, [6, 6, 5])]}), ["min", "min", "min"]);
  assert.deepEqual(glows(judgeFor({systemId: "draw-steel"}), {terms: [die(10, [10, 9])]}), ["max", "max"]);
  assert.deepEqual(glows(judgeFor({systemId: "shadowrun5e"}), {terms: [die(6, [1, 1, 5])]}), ["min", "min", null]);
  assert.deepEqual(glows(judgeFor({systemId: "cyphersystem"}), {terms: [die(20, [19])]}), ["max"]);
  assert.deepEqual(glows(judgeFor({systemId: "starwarsffg"}), {terms: [die(20, [20])]}), [null]);
});

test("the GM's own rule and turning moments off", () => {
  const judge = judgeFor({mode: "custom", custom: {die: "d10", triumph: "9-10", fumble: "1"}});
  assert.deepEqual(glows(judge, {terms: [die(10, [10, 9, 5, 1]), die(20, [20])]}), ["max", "max", null, "min", null]);
  const every = customJudge({die: "any", triumph: "max", fumble: "1"});
  assert.deepEqual(glows(every, {terms: [die(6, [6, 1]), die(8, [8])]}), ["max", "min", "max"]);
  assert.deepEqual(glows(judgeFor({mode: "none"}), {terms: [die(20, [20])]}), [null]);
  const values = parseValues("1, 3-4; max");
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(v => values(v, 6)), [true, false, true, true, false, true]);
  assert.equal(parseValues("")(1, 20), false);
});

test("every system names a rule with a starting point for the GM", () => {
  for ( const [system, key] of Object.entries(SYSTEM_RULES) ) assert.ok(RULES[key], system);
  for ( const rule of Object.values(RULES) ) {
    assert.equal(typeof rule.judge, "function");
    assert.ok(["d20", "d100", "d12", "d10", "d8", "d6", "d4", "any"].includes(rule.custom.die));
  }
});

test("a judge that throws keeps the dice", () => {
  const roll = {get isCriticalSuccess() { throw new Error("broken"); }, terms: [die(8, [8])]};
  assert.deepEqual(glows(judgeFor({systemId: "crucible"}), roll), [null]);
});
