/**
 * The class of a character, for dice that look like it: a druid throws leaves, a paladin wears a halo of wings. Read
 * from what the systems keep (D&D 5e classes, the PF2e class, class items, Savage Worlds arcane backgrounds) and
 * matched by name in English and German, so classes of other systems and homebrew are found too. Creatures without a
 * class are matched by their type (undead, dragon, fiend). Pure, works on actor data.
 */

/**
 * Words that name each class, the more specific first ("hexenmeister" before "hexe", "magieschmied" before "magier").
 * Matched against lowercase names with umlauts written out.
 */
export const CLASS_WORDS = [
  ["artificer", ["artificer", "magieschmied", "inventor", "erfinder", "tinker", "tueftler", "engineer", "ingenieur",
    "weird science", "verrueckte wissenschaft"]],
  ["warlock", ["warlock", "hexenmeister", "hexblade", "thaumaturge", "thaumaturg", "occultist", "okkultist", "pact"]],
  ["necromancer", ["necromancer", "nekromant", "totenbeschwoerer", "death knight", "todesritter"]],
  ["witch", ["witch", "hexe", "hag"]],
  ["alchemist", ["alchemist", "alchimist"]],
  ["psion", ["psion", "psychic", "psioniker", "telepath", "psionics", "psionik"]],
  ["barbarian", ["barbarian", "barbar", "berserk"]],
  ["bard", ["bard", "skald", "minstrel", "minnesaenger", "troubadour"]],
  ["paladin", ["paladin", "champion", "seraph", "templar", "templer", "crusader", "kreuzritter", "exemplar"]],
  ["cleric", ["cleric", "kleriker", "priest", "oracle", "orakel", "acolyte", "akolyth", "miracles", "wunder"]],
  ["druid", ["druid", "druide", "shaman", "schamane", "animist", "warden"]],
  ["monk", ["monk", "moench", "martial artist", "kampfkuenstler"]],
  ["ranger", ["ranger", "waldlaeufer", "hunter", "jaeger", "scout", "spaeher", "gunslinger", "revolverheld", "archer",
    "bogenschuetze"]],
  ["rogue", ["rogue", "schurke", "thief", "dieb", "assassin", "assassine", "swashbuckler", "investigator", "ermittler",
    "spy", "spion", "scoundrel"]],
  ["sorcerer", ["sorcerer", "zauberer", "kineticist", "kinetiker", "summoner", "beschwoerer", "wild mage", "gifted",
    "begabt"]],
  ["wizard", ["wizard", "magier", "mage", "magus", "arcanist", "arkanist", "illusionist", "enchanter", "magic", "magie"]],
  ["fighter", ["fighter", "kaempfer", "warrior", "krieger", "soldier", "soldat", "guardian", "waechter", "knight",
    "ritter", "commander", "kommandant", "mercenary", "soeldner"]]
];

/** Words that name creature types, and their look (keys of CREATURE_LOOKS). */
export const CREATURE_WORDS = [
  ["undead", ["undead", "untot", "untote"]],
  ["fiend", ["fiend", "unhold", "devil", "teufel", "demon", "daemon"]],
  ["celestial", ["celestial", "himmlisch", "angel", "engel"]],
  ["dragon", ["dragon", "drache"]],
  ["fey", ["fey", "feenwesen", "fee"]],
  ["elemental", ["elemental", "elementar"]],
  ["construct", ["construct", "konstrukt"]],
  ["plant", ["plant", "pflanze"]],
  ["aberration", ["aberration"]],
  ["ooze", ["ooze", "schleim"]],
  ["beast", ["beast", "tier", "animal"]]
];

/**
 * A name in lowercase with umlauts written out.
 * @param {*} text
 * @returns {string}
 */
export function plain(text) {
  return String(text ?? "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * The first entry of a word list found in some names.
 * @param {string[]} names
 * @param {[string, string[]][]} words
 * @returns {string|null}
 */
export function matchWords(names, words) {
  const texts = names.map(plain).filter(Boolean);
  for ( const text of texts ) {
    for ( const [key, list] of words ) {
      if ( list.some(word => text.includes(word)) ) return key;
    }
  }
  return null;
}

/**
 * A text from a value that may be a name, an object with a name or a label.
 * @param {*} value
 * @returns {string|null}
 */
function nameOf(value) {
  if ( !value ) return null;
  if ( typeof value === "string" ) return value;
  return value.identifier ?? value.slug ?? value.name ?? value.label ?? value.value ?? null;
}

/**
 * The names of a character's classes, the most important first.
 * @param {object} actor
 * @returns {string[]}
 */
export function classNames(actor) {
  if ( !actor ) return [];
  const names = [];
  const levels = item => Number(item?.system?.levels ?? item?.system?.level ?? item?.system?.level?.value ?? 0) || 0;
  // D&D 5e: classes by identifier, the one with the most levels first
  const classes = Object.values(actor.classes ?? {}).sort((a, b) => levels(b) - levels(a));
  for ( const item of classes ) names.push(item?.identifier ?? item?.system?.identifier, item?.name);
  // PF2e: the one class
  if ( actor.class && (typeof actor.class === "object") ) names.push(actor.class.slug, actor.class.name);
  // Other systems keep class items, or the class as a text of the character
  const items = Array.from(actor.items ?? []);
  const classItems = items.filter(i => i?.type === "class").sort((a, b) => levels(b) - levels(a));
  for ( const item of classItems ) names.push(item?.system?.identifier, item?.system?.slug, item?.name);
  const system = actor.system ?? {};
  for ( const value of [system.details?.class, system.class, system.details?.archetype, system.details?.profession,
    system.details?.role] ) names.push(nameOf(value));
  // Savage Worlds: the arcane background names the kind of magic
  for ( const item of items ) {
    if ( (item?.type === "edge") && /arcane background|arkaner hintergrund/i.test(item?.name ?? "") ) names.push(item.name);
  }
  return names.filter(n => (typeof n === "string") && n.trim());
}

/**
 * The types of a creature (D&D 5e creature type, PF2e traits, Crucible taxonomy).
 * @param {object} actor
 * @returns {string[]}
 */
export function creatureNames(actor) {
  const system = actor?.system ?? {};
  const type = system.details?.type;
  const names = [nameOf(type), type?.subtype, nameOf(system.details?.taxonomy), nameOf(system.details?.creatureType)];
  const traits = system.traits?.value;
  if ( Array.isArray(traits) ) names.push(...traits);
  else if ( traits instanceof Set ) names.push(...traits);
  return names.filter(n => (typeof n === "string") && n.trim());
}

/**
 * The look of a character: its class, or what kind of creature it is.
 * @param {object|null} actor
 * @returns {{key: string, by: "class"|"creature"}|null}   A key of CLASS_LOOKS or CREATURE_LOOKS
 */
export function themeOf(actor) {
  if ( !actor ) return null;
  const byClass = matchWords(classNames(actor), CLASS_WORDS);
  if ( byClass ) return {key: byClass, by: "class"};
  const byType = matchWords(creatureNames(actor), CREATURE_WORDS);
  if ( byType ) return {key: byType, by: "creature"};
  return null;
}
