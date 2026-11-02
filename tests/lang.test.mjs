import assert from "node:assert/strict";
import {readFile, readdir} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {AURAS, CLASS_LOOKS, CORES, CREATURE_LOOKS, FINISHES, FUMBLES, GLOWS, LANDINGS, PATTERNS, PRESETS, THROWS,
  TRAIL_KINDS, TRIUMPHS} from "../scripts/colors.mjs";
import {RULES} from "../scripts/systems.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * All keys of a nested translation object, dotted.
 * @param {object} object
 * @param {string} [prefix]
 * @returns {string[]}
 */
function keysOf(object, prefix="") {
  return Object.entries(object).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return (value && (typeof value === "object")) ? keysOf(value, full) : [full];
  });
}

/**
 * All files of a folder, recursively.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function files(dir) {
  const list = await readdir(dir, {withFileTypes: true});
  return (await Promise.all(list.map(e => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)])))).flat();
}

const en = JSON.parse(await readFile(path.join(root, "lang/en.json"), "utf8"));
const de = JSON.parse(await readFile(path.join(root, "lang/de.json"), "utf8"));
const enKeys = new Set(keysOf(en));
const get = (obj, key) => key.split(".").reduce((o, k) => o?.[k], obj);

test("English and German have the same keys", () => {
  assert.deepEqual([...keysOf(de)].sort(), [...enKeys].sort());
});

test("no key is both a text and a group", () => {
  for ( const key of enKeys ) assert.ok(![...enKeys].some(other => other.startsWith(`${key}.`)), key);
});

test("placeholders match between English and German", () => {
  const holes = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for ( const key of enKeys ) assert.deepEqual(holes(get(de, key)), holes(get(en, key)), key);
});

test("every key used by scripts and templates exists", async () => {
  const sources = [...await files(path.join(root, "scripts")), ...await files(path.join(root, "templates"))];
  const used = new Set();
  for ( const file of sources ) {
    if ( file.endsWith("usage.mjs") || file.endsWith("debug-file.mjs") ) continue;
    const text = await readFile(file, "utf8");
    for ( const match of text.matchAll(/["'`](SSD\.[A-Za-z0-9_.]+)["'`]/g) ) used.add(match[1]);
  }
  for ( const key of Object.keys(en.SSD.SETTINGS) ) {
    used.add(`SSD.SETTINGS.${key}.name`);
    used.add(`SSD.SETTINGS.${key}.hint`);
  }
  for ( const key of used ) if ( key.endsWith(".") ) used.delete(key);
  // A group name is fine too: the Region behavior names its localization prefix
  const missing = [...used].filter(key => !enKeys.has(key) && ![...enKeys].some(k => k.startsWith(`${key}.`)));
  assert.deepEqual(missing, []);
});

test("public texts use no semicolons", () => {
  for ( const key of enKeys ) {
    assert.ok(!String(get(en, key)).includes(";"), key);
    assert.ok(!String(get(de, key)).includes(";"), key);
  }
});

test("every choice of My dice, every class, creature and rule has a text", () => {
  const lists = {patterns: PATTERNS, finishes: FINISHES, glows: GLOWS, trails: TRAIL_KINDS, cores: CORES, auras: AURAS,
    landings: LANDINGS, throws: THROWS, triumphs: TRIUMPHS, fumbles: FUMBLES, presets: Object.keys(PRESETS)};
  const missing = [];
  for ( const [group, keys] of Object.entries(lists) ) {
    for ( const key of keys ) if ( !enKeys.has(`SSD.MyDice.${group}.${key}`) ) missing.push(`${group}.${key}`);
  }
  for ( const key of Object.keys(CLASS_LOOKS) ) if ( !enKeys.has(`SSD.Classes.${key}`) ) missing.push(`Classes.${key}`);
  for ( const key of Object.keys(CREATURE_LOOKS) ) if ( !enKeys.has(`SSD.Creatures.${key}`) ) missing.push(`Creatures.${key}`);
  for ( const key of Object.keys(RULES) ) if ( !enKeys.has(`SSD.Rules.${key}`) ) missing.push(`Rules.${key}`);
  assert.deepEqual(missing, []);
});
