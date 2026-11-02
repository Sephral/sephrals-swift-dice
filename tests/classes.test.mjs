import assert from "node:assert/strict";
import test from "node:test";

import {CLASS_WORDS, CREATURE_WORDS, classNames, matchWords, plain, themeOf} from "../scripts/classes.mjs";
import {CLASS_LOOKS, CREATURE_LOOKS} from "../scripts/colors.mjs";

test("D&D 5e: the class with the most levels decides", () => {
  const actor = {classes: {
    fighter: {identifier: "fighter", name: "Fighter", system: {levels: 2}},
    druid: {identifier: "druid", name: "Druid", system: {levels: 5}}
  }, items: []};
  assert.deepEqual(themeOf(actor), {key: "druid", by: "class"});
  assert.deepEqual(classNames(actor).slice(0, 2), ["druid", "Druid"]);
});

test("PF2e classes, class items, texts and German names", () => {
  assert.equal(themeOf({class: {slug: "champion", name: "Champion"}, items: []}).key, "paladin");
  assert.equal(themeOf({class: {slug: "thaumaturge"}, items: []}).key, "warlock");
  assert.equal(themeOf({items: [{type: "class", name: "Hexenmeister", system: {level: 3}}]}).key, "warlock");
  assert.equal(themeOf({items: [{type: "class", name: "Hexe"}]}).key, "witch");
  assert.equal(themeOf({items: [{type: "class", name: "Waldläufer"}]}).key, "ranger");
  assert.equal(themeOf({items: [{type: "class", name: "Magieschmied"}]}).key, "artificer");
  assert.equal(themeOf({items: [{type: "class", name: "Kämpfer"}]}).key, "fighter");
  assert.equal(themeOf({items: [], system: {details: {class: "Cleric"}}}).key, "cleric");
  assert.equal(themeOf({items: [], system: {class: {name: "Mönch"}}}).key, "monk");
  assert.equal(themeOf({items: [], system: {details: {archetype: {name: "Battle Wizard"}}}}).key, "wizard");
});

test("Savage Worlds: the arcane background names the magic", () => {
  const edge = name => ({items: [{type: "edge", name}]});
  assert.equal(themeOf(edge("Arcane Background (Miracles)")).key, "cleric");
  assert.equal(themeOf(edge("Arcane Background (Magic)")).key, "wizard");
  assert.equal(themeOf(edge("Arcane Background (Weird Science)")).key, "artificer");
  assert.equal(themeOf(edge("Arkaner Hintergrund (Psionik)")).key, "psion");
  assert.equal(themeOf(edge("Brawny")), null);
});

test("creatures without a class get the look of their kind", () => {
  assert.deepEqual(themeOf({items: [], system: {details: {type: {value: "undead"}}}}), {key: "undead", by: "creature"});
  assert.equal(themeOf({items: [], system: {traits: {value: ["dragon", "fire"]}}}).key, "dragon");
  assert.equal(themeOf({items: [], system: {details: {taxonomy: {name: "Untote"}}}}).key, "undead");
  assert.equal(themeOf({items: [], system: {details: {type: {value: "humanoid"}}}}), null);
  // A class wins over the creature type
  const priest = {items: [{type: "class", name: "Priest"}], system: {details: {type: {value: "undead"}}}};
  assert.equal(themeOf(priest).key, "cleric");
  assert.equal(themeOf(null), null);
});

test("the specific words come first", () => {
  assert.equal(matchWords(["Hexenmeister"], CLASS_WORDS), "warlock");
  assert.equal(matchWords(["Totenbeschwörer"], CLASS_WORDS), "necromancer");
  assert.equal(matchWords(["Death Knight"], CLASS_WORDS), "necromancer");
  assert.equal(matchWords(["Barbarian"], CLASS_WORDS), "barbarian");
  assert.equal(plain("Mönch Äöü ß é"), "moench aeoeue ss e");
});

test("every class and creature has a look", () => {
  for ( const [key] of CLASS_WORDS ) assert.ok(CLASS_LOOKS[key], key);
  for ( const [key] of CREATURE_WORDS ) assert.ok(CREATURE_LOOKS[key], key);
});
