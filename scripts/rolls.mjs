/**
 * Which dice a chat message rolled: from Foundry's rolls (or Ready Set Roll's copy of them), every die result becomes
 * one die on the table. Works on Roll objects and on their saved data, so the tests need no Foundry.
 */

/** Keys of a term that hold more terms or rolls (pools, parentheses, groupings of systems like PF2e). */
const NESTED = ["terms", "rolls", "roll", "term", "operands", "dice"];

/**
 * What kind of die a term is: "d" for normal dice, "f" for Fate dice, "c" for coins, null for anything else.
 * @param {object} term
 * @returns {string|null}
 */
export function denomination(term) {
  if ( !term || (typeof term !== "object") ) return null;
  const cls = term.constructor?.DENOMINATION ?? null;
  if ( cls ) return String(cls).toLowerCase();
  if ( term.class === "FateDie" ) return "f";
  if ( term.class === "Coin" ) return "c";
  if ( (term.class === "Die") || (Array.isArray(term.results) && (typeof term.faces === "number")) ) return "d";
  return null;
}

/**
 * All dice terms of a roll, nested ones included, each once.
 * @param {object} roll   A Roll or its data
 * @returns {object[]}
 */
export function diceTerms(roll) {
  const found = [];
  const seen = new Set();
  const visit = node => {
    if ( !node || (typeof node !== "object") || seen.has(node) ) return;
    seen.add(node);
    if ( Array.isArray(node) ) {
      node.forEach(visit);
      return;
    }
    if ( Array.isArray(node.results) && (typeof node.faces === "number") && denomination(node) ) {
      found.push(node);
      return;
    }
    for ( const key of NESTED ) {
      const value = node[key];
      if ( value && (typeof value === "object") ) visit(value);
    }
  };
  visit(roll?.terms ?? roll);
  return found;
}

/**
 * The rolls of a chat message. Ready Set Roll keeps the rolls of its cards in its own flag and leaves the message's
 * rolls empty; its flag wins when it is there.
 * @param {object} message
 * @param {(data: object) => object} [restore]   Turns saved roll data into a Roll
 * @returns {object[]}
 */
export function messageRolls(message, restore = data => data) {
  const stored = message?.flags?.rsr5e?.rolls;
  if ( Array.isArray(stored) && stored.length ) return stored.map(data => restore(data)).filter(Boolean);
  return Array.from(message?.rolls ?? []).filter(Boolean);
}

/**
 * The number a result shows and whether it still counts. Foundry's min and max modifiers (also D&D 5e's Reliable
 * Talent, "1d20min10") keep the rolled number and put the number that counts into "count", marked "rerolled" while
 * the result stays active. A real reroll makes the old result inactive. Counting successes also writes "count", but
 * as 0 or 1, without "rerolled": the face stays the rolled number.
 * @param {object} result
 * @returns {{value: number, faded: boolean}}
 */
export function resultValue(result) {
  const replaced = !!result.rerolled && (result.active !== false) && (typeof result.count === "number");
  return {
    value: replaced ? result.count : result.result,
    faded: (result.active === false) || !!result.discarded || (!!result.rerolled && !replaced)
  };
}

/**
 * The type of die to draw for a term.
 * @param {string} kind    From denomination
 * @param {number} faces
 * @returns {string}   d4, d6, d8, d10, d12, d20, d100, d3, fate, coin or token
 */
export function dieTypeFor(kind, faces) {
  if ( kind === "f" ) return "fate";
  if ( kind === "c" ) return "coin";
  if ( [4, 6, 8, 10, 12, 20, 100].includes(faces) ) return `d${faces}`;
  if ( faces === 3 ) return "d3";
  if ( faces === 2 ) return "coin";
  return "token";
}

/**
 * The dice to put on the table for some rolls.
 * Every result is one die (a d100 is two dice: tens and ones). Rerolled or dropped results show as faded dice.
 * @param {object[]} rolls
 * @param {object} [options]
 * @param {number} [options.maxDice=10]        More dice are counted, not drawn
 * @param {(roll: object) => Map} [options.judge]   The results of a roll that glow: "max" for a triumph, "min" for a
 *   fumble (see systems.mjs); none glow without it
 * @returns {{dice: object[], extra: number}}
 */
export function diceToThrow(rolls, {maxDice = 10, judge = null} = {}) {
  const dice = [];
  let extra = 0;
  let index = 0;
  const pushDie = die => {
    if ( dice.length < maxDice ) dice.push({...die, index: index++});
    else extra++;
  };
  for ( const roll of rolls ) {
    const marks = judge?.(roll) ?? new Map();
    for ( const term of diceTerms(roll) ) {
      const kind = denomination(term);
      const faces = term.faces;
      const type = dieTypeFor(kind, faces);
      for ( const result of term.results ?? [] ) {
        // "hidden" is Dice So Nice's mark for dice it already showed. Midi-QOL sets it on every result, also without
        // Dice So Nice, and this module only runs without it, so nobody has shown these dice yet
        if ( !result || (typeof result.result !== "number") ) continue;
        const {value, faded} = resultValue(result);
        const glow = faded ? null : (marks.get(result) ?? null);
        if ( type === "d100" ) {
          const tens = Math.floor((value % 100) / 10);
          const ones = value % 10;
          if ( dice.length + 2 > maxDice ) {
            extra++;
            continue;
          }
          pushDie({type: "d10", labels: "tens", value: tens === 0 ? 10 : tens, faces, faded, glow, pair: "tens"});
          pushDie({type: "d10", labels: "ones", value: ones === 0 ? 10 : ones, faces, faded, glow, pair: "ones"});
          continue;
        }
        pushDie({type, faces, value, faded, glow, coin: kind === "c"});
      }
    }
  }
  return {dice, extra};
}

/**
 * The text on a face of a die.
 * @param {string} type     Die type
 * @param {number} number   The number of the face (1 to the number of faces of the solid)
 * @param {object} [options]
 * @param {"tens"|"ones"} [options.labels]   The two dice of a d100
 * @returns {string}
 */
export function faceLabel(type, number, {labels} = {}) {
  if ( labels === "tens" ) return String((number % 10) * 10).padStart(2, "0");
  if ( labels === "ones" ) return String(number % 10);
  if ( type === "d3" ) return String(((number - 1) % 3) + 1);
  if ( type === "fate" ) return FATE_LABELS[number] ?? "";
  return String(number);
}

/** Fate dice on a d6: plus on 1 and 2, minus on 5 and 6, blank on 3 and 4 (opposite faces add up to 7). */
const FATE_LABELS = {1: "+", 2: "+", 3: "", 4: "", 5: "−", 6: "−"};

/**
 * Which face numbers show a result.
 * @param {object} die   From diceToThrow
 * @returns {(number: number) => boolean}
 */
export function showsResult(die) {
  if ( die.type === "fate" ) {
    const label = {1: "+", 0: "", [-1]: "−"}[die.value] ?? "";
    return n => FATE_LABELS[n] === label;
  }
  if ( die.type === "d3" ) return n => (((n - 1) % 3) + 1) === die.value;
  return n => n === die.value;
}

/**
 * The solid a die type is drawn as.
 * @param {string} type
 * @returns {string}   A key of DIE_TYPES in geometry.mjs
 */
export function modelFor(type) {
  if ( (type === "d3") || (type === "fate") ) return "d6";
  if ( (type === "token") || (type === "coin") ) return "coin";
  if ( type === "d100" ) return "d10";
  return type;
}

export const __test__ = {FATE_LABELS, NESTED};
