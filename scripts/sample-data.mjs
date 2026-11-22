/**
 * Made-up data of the sample windows (api.samples): characters for "My dice", the game systems of the big moments
 * rules and the dice of a triumph and a fumble. Pure, works without Foundry.
 */

import {classNames} from "./classes.mjs";
import {CREATURE_LOOKS, readyLook} from "./colors.mjs";
import {RULES, SYSTEM_RULES} from "./systems.mjs";
import {sampleCast} from "./samples.mjs";

/** The flag of a stored look, as in config.mjs (kept here so this file needs no Foundry). */
const LOOK_FLAG = "look";

/**
 * What the characters of "My dice" are in a sample: the cast member, the class or creature kind they show, and the
 * look of their own (null: they throw the user's dice).
 */
const CHARACTERS = [
  {id: "ari", cls: "Fighter", look: "fighter"},
  {id: "mira", cls: "Wizard", look: null},
  {id: "tovin", cls: "Cleric", look: null},
  {id: "bandit1", cls: "", look: null}
];

/**
 * A character that reads like a Foundry actor to the window: name, picture, owner, class, its own look. Nothing here is
 * stored anywhere: the look sits in the given map.
 * @param {string} id          A member of sampleCast
 * @param {Map<string, object>} memory   id to the look the sample window holds in memory
 * @param {{cls?: string, creature?: string}} [kind]
 * @returns {object}
 */
export function sampleActor(id, memory, {cls = "", creature = ""} = {}) {
  const member = sampleCast().find(m => m.id === id);
  return {
    id: `ssd-sample-${id}`,
    name: member?.name ?? id,
    img: member?.img ?? "",
    isOwner: true,
    hasPlayerOwner: member?.side === "party",
    type: "character",
    items: [],
    system: {details: {class: cls, ...(creature ? {type: {value: creature}} : {})}},
    getFlag: (scope, key) => (key === LOOK_FLAG ? memory.get(`ssd-sample-${id}`) : undefined),
    update: async () => null
  };
}

/**
 * The characters of the window, with the look of their own where one is given.
 * @param {Map<string, object>} memory
 * @returns {object[]}
 */
export function sampleActors(memory) {
  for ( const entry of CHARACTERS ) {
    const key = `ssd-sample-${entry.id}`;
    if ( entry.look && !memory.has(key) ) memory.set(key, {...readyLook(entry.look, {}), byClass: false});
  }
  return CHARACTERS.map(entry => sampleActor(entry.id, memory, {cls: entry.cls}));
}

/** One line per creature kind of the dice that follow the creature: the keys of CREATURE_LOOKS. */
export function creatureKinds() {
  return Object.keys(CREATURE_LOOKS);
}

/** A creature of a kind, named after a member of the cast, for the status line of "My dice". */
export function creatureActor(kind, memory = new Map()) {
  return sampleActor("troll", memory, {creature: kind});
}

/** The class names a sample actor shows (for the tests). */
export function sampleClassNames(actor) {
  return classNames(actor);
}

/** The game systems of the rules, named as their players call them. "d20" is every system without a rule of its own. */
const SYSTEM_TITLES = {
  dnd5e: "D&D 5e", pf2e: "Pathfinder 2e", swade: "Savage Worlds", crucible: "Crucible", duality: "Daggerheart",
  under100: "Call of Cthulhu", under20: "Dragonbane", d10: "Cyberpunk RED", sixes: "Blades in the Dark", successes: "Alien",
  fate: "Fate", boxcars: "Powered by the Apocalypse", cypher: "Cypher System", gurps: "GURPS", power: "Draw Steel",
  glitch: "Shadowrun", none: "Star Wars FFG"
};

/**
 * The rules of the big moments with a game system that uses each (the first one), as the settings window names it.
 * @returns {{key: string, systemId: string, title: string}[]}
 */
export function ruleSystems() {
  return Object.keys(RULES).map(key => {
    const systemId = (key === "d20") ? "" : (Object.entries(SYSTEM_RULES).find(([, rule]) => rule === key)?.[0] ?? "");
    return {key, systemId, title: SYSTEM_TITLES[key] ?? ""};
  });
}

/**
 * Dice of a triumph, a fumble or both, as the table throws them: a d20 that glows, and a few quiet dice beside it.
 * @param {"triumph"|"fumble"|"both"} kind
 * @returns {object[]}   Dice for throwDice (their look is added by the caller)
 */
export function momentDice(kind) {
  const die = (type, faces, value, glow = null) => ({type, faces, value, faded: false, glow, coin: false});
  if ( kind === "triumph" ) return [die("d20", 20, 20, "max"), die("d8", 8, 5), die("d6", 6, 3)];
  if ( kind === "fumble" ) return [die("d20", 20, 1, "min"), die("d8", 8, 2), die("d6", 6, 4)];
  return [die("d20", 20, 20, "max"), die("d20", 20, 1, "min"), die("d6", 6, 4)];
}

/**
 * The number of faces the test throw of a rule uses.
 * @param {string} die   A key of CUSTOM_DICE ("any" and anything unknown: d20)
 * @returns {number}
 */
export function ruleFaces(die) {
  const faces = Number(String(die ?? "").slice(1));
  return Number.isFinite(faces) && (faces > 1) ? faces : 20;
}

export const __test__ = {CHARACTERS, SYSTEM_TITLES};
