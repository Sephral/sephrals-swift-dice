import assert from "node:assert/strict";
import test from "node:test";

import {dieModel, indicesShowing} from "../scripts/geometry.mjs";
import {diceTerms, diceToThrow, dieTypeFor, faceLabel, messageRolls, modelFor, showsResult} from "../scripts/rolls.mjs";
import {judgeFor} from "../scripts/systems.mjs";

/** Saved roll data like Foundry writes it. */
const die = (faces, results, extra = {}) => ({class: "Die", faces, number: results.length,
  results: results.map(r => (typeof r === "number" ? {result: r, active: true} : r)), ...extra});

test("dice of a plain roll, in order", () => {
  const roll = {terms: [die(20, [17]), {class: "OperatorTerm", operator: "+"}, die(6, [3, 5])]};
  const {dice, extra} = diceToThrow([roll]);
  assert.equal(extra, 0);
  assert.deepEqual(dice.map(d => [d.type, d.value]), [["d20", 17], ["d6", 3], ["d6", 5]]);
});

test("advantage shows the dropped die faded and only the kept one glows", () => {
  const roll = {terms: [die(20, [{result: 20, active: true}, {result: 4, active: false, discarded: true}])]};
  const {dice} = diceToThrow([roll], {judge: judgeFor({mode: "system", systemId: "worldbuilding"})});
  assert.equal(dice[0].glow, "max");
  assert.equal(dice[1].faded, true);
  assert.equal(dice[1].glow, null);
});

test("a d100 is a tens die and a ones die", () => {
  const cases = {47: ["40", "7"], 100: ["00", "0"], 1: ["00", "1"], 10: ["10", "0"], 90: ["90", "0"]};
  for ( const [value, labels] of Object.entries(cases) ) {
    const {dice} = diceToThrow([{terms: [die(100, [Number(value)])]}]);
    assert.equal(dice.length, 2);
    assert.equal(faceLabel("d10", dice[0].value, {labels: "tens"}), labels[0], `tens of ${value}`);
    assert.equal(faceLabel("d10", dice[1].value, {labels: "ones"}), labels[1], `ones of ${value}`);
  }
});

test("pools, parentheses and groupings of systems are searched", () => {
  const roll = {terms: [
    {class: "PoolTerm", rolls: [{terms: [die(8, [8])]}, {terms: [die(6, [2])]}]},
    {class: "ParentheticalTerm", roll: {terms: [die(4, [1])]}},
    {class: "Grouping", term: {class: "ArithmeticExpression", operands: [die(10, [7]), {class: "NumericTerm"}]}}
  ]};
  assert.deepEqual(diceToThrow([roll]).dice.map(d => d.type), ["d8", "d6", "d4", "d10"]);
  assert.equal(diceTerms(roll).length, 4);
});

test("Fate dice, coins and odd dice", () => {
  const roll = {terms: [
    {class: "FateDie", faces: 3, results: [{result: 1, active: true}, {result: 0, active: true}, {result: -1, active: true}]},
    {class: "Coin", faces: 2, results: [{result: 1, active: true}]},
    die(3, [2]),
    die(7, [5])
  ]};
  const {dice} = diceToThrow([roll]);
  assert.deepEqual(dice.map(d => d.type), ["fate", "fate", "fate", "coin", "d3", "token"]);
  assert.equal(dice[3].coin, true);
  assert.equal(dieTypeFor("d", 2), "coin");
  assert.equal(modelFor("fate"), "d6");
  assert.equal(modelFor("token"), "coin");
});

test("every result of every die type has a face that shows it", () => {
  const types = {d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d3: 3};
  for ( const [type, faces] of Object.entries(types) ) {
    const model = dieModel(modelFor(type));
    for ( let value = 1; value <= faces; value++ ) {
      assert.ok(indicesShowing(model, showsResult({type, value})).length >= 1, `${type} ${value}`);
    }
  }
  const d6 = dieModel("d6");
  for ( const value of [-1, 0, 1] ) assert.equal(indicesShowing(d6, showsResult({type: "fate", value})).length, 2);
});

test("large throws are counted, not drawn", () => {
  const roll = {terms: [die(6, [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6])]};
  const {dice, extra} = diceToThrow([roll], {maxDice: 5});
  assert.equal(dice.length, 5);
  assert.equal(extra, 7);
});

test("without a judge nothing glows, a d100 pair glows together", () => {
  assert.equal(diceToThrow([{terms: [die(20, [20])]}]).dice[0].glow, null);
  const judge = judgeFor({mode: "system", systemId: "CoC7"});
  const {dice} = diceToThrow([{terms: [die(100, [1])]}], {judge});
  assert.deepEqual(dice.map(d => d.glow), ["max", "max"]);
});

test("Ready Set Roll keeps its rolls in a flag, which wins", () => {
  const plain = {terms: [die(20, [3])]};
  const restored = [];
  const message = {rolls: [], flags: {rsr5e: {rolls: [plain]}}};
  const rolls = messageRolls(message, data => {
    restored.push(data);
    return {...data, restored: true};
  });
  assert.equal(rolls[0].restored, true);
  assert.equal(restored.length, 1);
  assert.deepEqual(messageRolls({rolls: [plain]}), [plain]);
  assert.deepEqual(messageRolls({}), []);
});

test("results without a number are left out, Midi-QOL's hidden marks are not", () => {
  // Midi-QOL marks every result hidden (Dice So Nice's "already shown"), also when Dice So Nice is off
  const roll = {terms: [die(6, [{result: 4, active: true, hidden: true}, {active: true}, 2])]};
  assert.deepEqual(diceToThrow([roll]).dice.map(d => d.value), [4, 2]);
});

test("min and max modifiers show the number that counts, a real reroll fades", () => {
  // Foundry's 1d20min10 (Reliable Talent): the rolled 3 stays in "result", the 10 that counts in "count"
  const reliable = {terms: [die(20, [{result: 3, count: 10, rerolled: true, active: true}])]};
  assert.deepEqual(diceToThrow([reliable]).dice.map(d => [d.value, d.faded]), [[10, false]]);
  const capped = {terms: [die(20, [{result: 20, count: 20, active: true}, {result: 18, count: 15, rerolled: true, active: true}])]};
  assert.deepEqual(diceToThrow([capped]).dice.map(d => d.value), [20, 15]);
  // A reroll (2d6r1): the old result is inactive, the new one counts
  const rerolled = {terms: [die(6, [{result: 1, rerolled: true, active: false}, {result: 5, active: true}])]};
  assert.deepEqual(diceToThrow([rerolled]).dice.map(d => [d.value, d.faded]), [[1, true], [5, false]]);
  // Counting successes writes 0 or 1 into "count", the face stays the rolled number
  const pool = {terms: [die(10, [{result: 8, success: true, count: 1, active: true}])]};
  assert.deepEqual(diceToThrow([pool]).dice.map(d => d.value), [8]);
  const judge = judgeFor({mode: "system", systemId: "dnd5e"});
  const made = {terms: [die(20, [{result: 7, count: 20, rerolled: true, active: true}])]};
  assert.deepEqual(diceToThrow([made], {judge}).dice.map(d => d.glow), ["max"]);
});
