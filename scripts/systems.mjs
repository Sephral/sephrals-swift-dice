/**
 * When a roll is a triumph or a fumble, and which of its dice show it. Not every game counts a 20 as good: D&D 5e
 * reports its own critical range, PF2e degrees of success, Savage Worlds critical failures, Crucible margins against
 * the DC, Call of Cthulhu wants a low d100. The game system sets the rule by default, the GM can switch to a rule of
 * their own (which die, which results) or turn the moments off. Pure, no Foundry.
 *
 * A judge looks at one roll and returns the results that glow: "max" for a triumph, "min" for a fumble (the names come
 * from the classic rule, a roll under system marks its lowest result "max").
 */

import {denomination, diceTerms, resultValue} from "./rolls.mjs";

/**
 * The results of a roll that count: numbers, not dropped, not rerolled, with the number that counts (a min or max
 * modifier changes it).
 * @param {object} roll
 * @returns {{term: object, result: object, value: number, faces: number, kind: string}[]}
 */
export function countedResults(roll) {
  const out = [];
  for ( const term of diceTerms(roll) ) {
    const kind = denomination(term);
    for ( const result of term.results ?? [] ) {
      if ( !result || (typeof result.result !== "number") ) continue;
      const {value, faded} = resultValue(result);
      if ( !faded ) out.push({term, result, value, faces: term.faces, kind});
    }
  }
  return out;
}

/**
 * The class name of a roll, also for saved roll data.
 * @param {object} roll
 * @returns {string}
 */
function className(roll) {
  const name = roll?.constructor?.name;
  return ((name && (name !== "Object")) ? name : roll?.class) ?? "";
}

/**
 * Mark some results.
 * @param {Map} marks
 * @param {object[]} entries
 * @param {"max"|"min"} mark
 * @returns {Map}
 */
function markAll(marks, entries, mark) {
  for ( const e of entries ) marks.set(e.result, mark);
  return marks;
}

/** The numbers on the dice of a d100: 1 to 100, a single die that Foundry rolls as one term. */
const isDie = (e, faces) => (e.kind === "d") && (e.faces === faces);

/* -------------------------------------------- */
/*  Judges                                      */
/* -------------------------------------------- */

/**
 * The natural result of one die type decides: its highest number is a triumph and a 1 a fumble, or the other way
 * round for games that roll under a number.
 * @param {number} faces
 * @param {object} [options]
 * @param {boolean} [options.under=false]
 * @param {number[]} [options.triumph]   Numbers that count as a triumph (default: highest, or 1 when under)
 * @param {number[]} [options.fumble]    Numbers that count as a fumble
 * @returns {(roll: object) => Map}
 */
export function natural(faces, {under = false, triumph, fumble} = {}) {
  const good = triumph ?? [under ? 1 : faces];
  const bad = fumble ?? [under ? faces : 1];
  return roll => {
    const marks = new Map();
    for ( const e of countedResults(roll) ) {
      if ( !isDie(e, faces) ) continue;
      if ( good.includes(e.value) ) marks.set(e.result, "max");
      else if ( bad.includes(e.value) ) marks.set(e.result, "min");
    }
    return marks;
  };
}

/** The classic rule: a natural 20 and a natural 1 on a d20. */
const d20 = natural(20);

/**
 * D&D 5e: d20 rolls report their own critical range (a Champion crits on 19), damage has no moment. Rolls typed into
 * the chat (the system's BasicRoll) use the classic rule.
 * @param {object} roll
 * @returns {Map}
 */
function dnd5e(roll) {
  if ( typeof roll?.validD20Roll !== "boolean" ) return (className(roll) === "DamageRoll") ? new Map() : d20(roll);
  if ( !roll.validD20Roll ) return new Map();
  const kept = countedResults(roll).filter(e => isDie(e, 20)).slice(0, 1);
  if ( roll.isCritical ) return markAll(new Map(), kept, "max");
  if ( roll.isFumble ) return markAll(new Map(), kept, "min");
  return new Map();
}

/**
 * Pathfinder 2e: a check against a DC knows its degree of success, a critical success or failure is the moment even
 * without a natural 20. Without a DC the natural 20 and 1 count. Damage has no moment.
 * @param {object} roll
 * @returns {Map}
 */
function pf2e(roll) {
  const check = ["CheckRoll", "StrikeAttackRoll"].includes(className(roll));
  if ( !check ) return className(roll).includes("Damage") ? new Map() : d20(roll);
  const degree = roll.degreeOfSuccess ?? roll.options?.degreeOfSuccess ?? null;
  if ( degree === null ) return d20(roll);
  const kept = countedResults(roll).filter(e => isDie(e, 20)).slice(0, 1);
  if ( degree === 3 ) return markAll(new Map(), kept, "max");
  if ( degree === 0 ) return markAll(new Map(), kept, "min");
  return new Map();
}

/**
 * Savage Worlds: a trait roll fails critically when the wild die and most trait dice show a 1, and a raise (4 over
 * the target number) is the triumph of the die that counted. Damage and other rolls have no moment.
 * @param {object} roll
 * @returns {Map}
 */
function swade(roll) {
  const marks = new Map();
  if ( typeof roll?.isCritfail !== "boolean" ) return marks;
  const counted = countedResults(roll);
  if ( roll.isCritfail ) return markAll(marks, counted.filter(e => e.value === 1), "min");
  if ( (roll.successes ?? 0) >= 2 ) {
    // The trait die or the wild die, whichever rolled higher (aces included)
    const totals = new Map();
    for ( const e of counted ) totals.set(e.term, (totals.get(e.term) ?? 0) + e.value);
    const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return markAll(marks, counted.filter(e => e.term === best), "max");
  }
  return marks;
}

/**
 * Crucible: a check is critical when it beats the DC by more than 6, or misses it by 6 or more. All dice of the
 * check glow.
 * @param {object} roll
 * @returns {Map}
 */
function crucible(roll) {
  const marks = new Map();
  if ( roll?.isCriticalSuccess === true ) return markAll(marks, countedResults(roll), "max");
  if ( roll?.isCriticalFailure === true ) return markAll(marks, countedResults(roll), "min");
  return marks;
}

/**
 * Daggerheart: the hope and fear dice (two d12 of their own) showing the same number are a critical success.
 * @param {object} roll
 * @returns {Map}
 */
function duality(roll) {
  const twelves = countedResults(roll).filter(e => e.faces === 12);
  const terms = new Set(twelves.map(e => e.term));
  if ( (twelves.length === 2) && (terms.size === 2) && (twelves[0].value === twelves[1].value) ) {
    return markAll(new Map(), twelves, "max");
  }
  return new Map();
}

/**
 * Dice pools that count sixes (Blades in the Dark, Year Zero): two or more sixes are a critical, every six glows.
 * @param {object} roll
 * @returns {Map}
 */
function sixes(roll) {
  const six = countedResults(roll).filter(e => isDie(e, 6) && (e.value === 6));
  return (six.length >= 2) ? markAll(new Map(), six, "max") : new Map();
}

/**
 * Year Zero dice pools: every six is a success and glows.
 * @param {object} roll
 * @returns {Map}
 */
function successes(roll) {
  return markAll(new Map(), countedResults(roll).filter(e => isDie(e, 6) && (e.value === 6)), "max");
}

/**
 * Fate: four plus signs are the triumph, four minus signs the fumble.
 * @param {object} roll
 * @returns {Map}
 */
function fate(roll) {
  const dice = countedResults(roll).filter(e => e.kind === "f");
  if ( dice.length < 4 ) return new Map();
  if ( dice.every(e => e.value === 1) ) return markAll(new Map(), dice, "max");
  if ( dice.every(e => e.value === -1) ) return markAll(new Map(), dice, "min");
  return new Map();
}

/**
 * Two six sided dice (Powered by the Apocalypse): a double six is the triumph, a double one the fumble.
 * @param {object} roll
 * @returns {Map}
 */
function boxcars(roll) {
  const dice = countedResults(roll).filter(e => isDie(e, 6));
  if ( dice.length !== 2 ) return new Map();
  if ( dice.every(e => e.value === 6) ) return markAll(new Map(), dice, "max");
  if ( dice.every(e => e.value === 1) ) return markAll(new Map(), dice, "min");
  return new Map();
}

/**
 * GURPS: three six sided dice rolled under the skill, 3 or 4 always succeed critically, 17 or 18 fail critically.
 * @param {object} roll
 * @returns {Map}
 */
function gurps(roll) {
  const dice = countedResults(roll).filter(e => isDie(e, 6));
  if ( dice.length !== 3 ) return new Map();
  const sum = dice.reduce((s, e) => s + e.value, 0);
  if ( sum <= 4 ) return markAll(new Map(), dice, "max");
  if ( sum >= 17 ) return markAll(new Map(), dice, "min");
  return new Map();
}

/**
 * Draw Steel: a natural 19 or 20 on the two d10 of a power roll is a critical.
 * @param {object} roll
 * @returns {Map}
 */
function power(roll) {
  const dice = countedResults(roll).filter(e => isDie(e, 10));
  if ( dice.length !== 2 ) return new Map();
  return ((dice[0].value + dice[1].value) >= 19) ? markAll(new Map(), dice, "max") : new Map();
}

/**
 * Shadowrun: a glitch when more than half of the dice show a 1, those ones glow red.
 * @param {object} roll
 * @returns {Map}
 */
function glitch(roll) {
  const dice = countedResults(roll).filter(e => isDie(e, 6));
  const ones = dice.filter(e => e.value === 1);
  return ((dice.length >= 2) && (ones.length > dice.length / 2)) ? markAll(new Map(), ones, "min") : new Map();
}

/** No moments (narrative dice whose faces are symbols). */
const nothing = () => new Map();

/* -------------------------------------------- */
/*  Systems                                     */
/* -------------------------------------------- */

/**
 * The rules of the game systems: the judge and the starting point of the GM's own rule (which die, which results).
 * Systems not listed use the classic d20 rule.
 */
export const RULES = {
  d20: {judge: d20, custom: {die: "d20", triumph: "20", fumble: "1"}},
  dnd5e: {judge: dnd5e, custom: {die: "d20", triumph: "20", fumble: "1"}},
  pf2e: {judge: pf2e, custom: {die: "d20", triumph: "20", fumble: "1"}},
  swade: {judge: swade, custom: {die: "any", triumph: "", fumble: ""}},
  crucible: {judge: crucible, custom: {die: "any", triumph: "", fumble: ""}},
  duality: {judge: duality, custom: {die: "d12", triumph: "", fumble: ""}},
  under100: {judge: natural(100, {under: true}), custom: {die: "d100", triumph: "1", fumble: "100"}},
  under20: {judge: natural(20, {under: true}), custom: {die: "d20", triumph: "1", fumble: "20"}},
  d10: {judge: natural(10), custom: {die: "d10", triumph: "10", fumble: "1"}},
  sixes: {judge: sixes, custom: {die: "d6", triumph: "", fumble: ""}},
  successes: {judge: successes, custom: {die: "d6", triumph: "6", fumble: ""}},
  fate: {judge: fate, custom: {die: "any", triumph: "", fumble: ""}},
  boxcars: {judge: boxcars, custom: {die: "d6", triumph: "", fumble: ""}},
  cypher: {judge: natural(20, {triumph: [19, 20], fumble: [1]}), custom: {die: "d20", triumph: "19-20", fumble: "1"}},
  gurps: {judge: gurps, custom: {die: "d6", triumph: "", fumble: ""}},
  power: {judge: power, custom: {die: "d10", triumph: "", fumble: ""}},
  glitch: {judge: glitch, custom: {die: "d6", triumph: "", fumble: ""}},
  none: {judge: nothing, custom: {die: "any", triumph: "", fumble: ""}}
};

/** Which rule each game system uses (by system id). */
export const SYSTEM_RULES = {
  dnd5e: "dnd5e",
  pf2e: "pf2e",
  swade: "swade",
  crucible: "crucible",
  daggerheart: "duality",
  CoC7: "under100",
  deltagreen: "under100",
  wfrp4e: "under100",
  "dark-heresy": "under100",
  impmal: "under100",
  brp: "under100",
  mythras: "under100",
  rqg: "under100",
  dragonbane: "under20",
  symbaroum: "under20",
  cairn: "under20",
  "cyberpunk-red-core": "d10",
  "blades-in-the-dark": "sixes",
  alienrpg: "successes",
  "forbidden-lands": "successes",
  vaesen: "successes",
  t2k4e: "successes",
  "blade-runner": "successes",
  "fate-core-official": "fate",
  ModularFate: "fate",
  fate: "fate",
  pbta: "boxcars",
  dungeonworld: "boxcars",
  cyphersystem: "cypher",
  gurps: "gurps",
  "draw-steel": "power",
  shadowrun5e: "glitch",
  "shadowrun6-eden": "glitch",
  starwarsffg: "none",
  genesys: "none"
};

/**
 * The rule key of a game system.
 * @param {string} systemId
 * @returns {string}   A key of RULES
 */
export function ruleKey(systemId) {
  return SYSTEM_RULES[systemId] ?? "d20";
}

/** The dice a GM can pick for a rule of their own. */
export const CUSTOM_DICE = ["d20", "d100", "d12", "d10", "d8", "d6", "d4", "any"];

/**
 * Turn a list of results like "20", "19-20", "1, 2" or "max" into a test.
 * @param {string} text
 * @returns {(value: number, faces: number) => boolean}
 */
export function parseValues(text) {
  const tests = [];
  for ( const part of String(text ?? "").toLowerCase().split(/[,;\s]+/).filter(Boolean) ) {
    if ( part === "max" ) {
      tests.push((v, faces) => v === faces);
      continue;
    }
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if ( range ) {
      const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
      tests.push(v => (v >= a) && (v <= b));
      continue;
    }
    if ( /^\d+$/.test(part) ) {
      const n = Number(part);
      tests.push(v => v === n);
    }
  }
  return (value, faces) => tests.some(test => test(value, faces));
}

/**
 * The GM's own rule: on which die, which results are a triumph and which a fumble.
 * @param {object} rule
 * @param {string} rule.die       A key of CUSTOM_DICE
 * @param {string} rule.triumph   Results, see parseValues
 * @param {string} rule.fumble
 * @returns {(roll: object) => Map}
 */
export function customJudge({die = "d20", triumph = "", fumble = ""} = {}) {
  const good = parseValues(triumph);
  const bad = parseValues(fumble);
  const faces = (die === "any") ? null : Number(String(die).slice(1));
  return roll => {
    const marks = new Map();
    for ( const e of countedResults(roll) ) {
      if ( (e.kind !== "d") || (faces && (e.faces !== faces)) ) continue;
      // Numbered faces only: coins and fate dice have no highest number
      if ( e.faces < 2 ) continue;
      const value = e.value;
      if ( good(value, e.faces) ) marks.set(e.result, "max");
      else if ( bad(value, e.faces) ) marks.set(e.result, "min");
    }
    return marks;
  };
}

/**
 * The judge of a table.
 * @param {object} options
 * @param {"system"|"custom"|"none"} options.mode
 * @param {string} [options.systemId]
 * @param {object} [options.custom]   The GM's own rule
 * @returns {(roll: object) => Map}
 */
export function judgeFor({mode = "system", systemId = "", custom = {}} = {}) {
  if ( mode === "none" ) return nothing;
  if ( mode === "custom" ) return customJudge(custom);
  const judge = RULES[ruleKey(systemId)]?.judge ?? d20;
  // A system class that throws on data it does not expect must not stop the dice
  return roll => {
    try {
      return judge(roll);
    } catch {
      return new Map();
    }
  };
}

export const __test__ = {d20, dnd5e, pf2e, swade, crucible, duality, sixes, fate, boxcars, gurps, power, glitch, className};
