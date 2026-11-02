import assert from "node:assert/strict";
import test from "node:test";

import {AURAS, CLASS_LOOKS, CORES, CREATURE_LOOKS, EFFECT_COLORS, FALLBACK_COLOR, FINISHES, FONTS, FUMBLES, GLOWS,
  LANDINGS, PATTERNS, PRESETS, SEE_THROUGH, THROWS, TRAIL_KINDS, TRIUMPHS, diceLook, effectVars, hslHex, lookForDie,
  luminance, normalizeHex, numberColor, randomLook, readyLook, readyLookOf, tone} from "../scripts/colors.mjs";

test("colors are read in every form Foundry uses", () => {
  assert.equal(normalizeHex("#ABC"), "#aabbcc");
  assert.equal(normalizeHex("#1a2B3c"), "#1a2b3c");
  assert.equal(normalizeHex({css: "#ff0000"}), "#ff0000");
  assert.equal(normalizeHex(0x00ff00), "#00ff00");
  assert.equal(normalizeHex("red"), null);
  assert.equal(normalizeHex(null), null);
});

test("numbers are dark on light dice and light on dark dice", () => {
  assert.equal(numberColor("#ffffff"), "#16120e");
  assert.equal(numberColor("#f5d33b"), "#16120e");
  assert.equal(numberColor("#1b2a6b"), "#fbf7f0");
  assert.equal(numberColor("#000000"), "#fbf7f0");
  assert.ok(luminance("#ffffff") > luminance("#808080"));
});

test("tones go toward white and black", () => {
  assert.equal(tone("#808080", 1), "#ffffff");
  assert.equal(tone("#808080", -1), "#000000");
  assert.equal(tone("#808080", 0), "#808080");
});

test("dice take the player color by default", () => {
  const look = diceLook({userColor: {css: "#3366cc"}});
  assert.equal(look.body, "#3366cc");
  assert.equal(look.finish, "glossy");
  assert.equal(diceLook({userColor: undefined}).body, FALLBACK_COLOR);
});

test("an own color counts only when the GM allows it", () => {
  const choice = {mode: "own", color: "#aa2222", finish: "matte"};
  assert.equal(diceLook({userColor: "#3366cc", choice}).body, "#aa2222");
  assert.equal(diceLook({userColor: "#3366cc", choice, allowOwn: false}).body, "#3366cc");
  assert.equal(diceLook({userColor: "#3366cc", choice: {mode: "player", color: "#aa2222"}}).body, "#3366cc");
  assert.equal(diceLook({userColor: "#3366cc", choice}).finish, "matte");
});

test("pattern, surface and font fall back to the defaults", () => {
  const look = diceLook({userColor: "#3366cc", choice: {pattern: "plaid", finish: "velvetine", font: "comic"}});
  assert.equal(look.pattern, "none");
  assert.equal(look.finish, "glossy");
  assert.equal(look.font, "classic");
  assert.ok(look.fontFamily.includes("Signika"));
  assert.match(look.second, /^#[0-9a-f]{6}$/);
});

test("with colors locked the style still belongs to the player", () => {
  const choice = {mode: "own", color: "#aa2222", text: "#ffee00", d20: "#00ff00", pattern: "marble", second: "#ffffff",
    finish: "metal", font: "serif"};
  const locked = diceLook({userColor: "#3366cc", choice, allowOwn: false});
  assert.equal(locked.body, "#3366cc");
  assert.equal(locked.text, numberColor("#3366cc"));
  assert.equal(locked.d20, null);
  assert.deepEqual([locked.pattern, locked.second, locked.finish, locked.font], ["marble", "#ffffff", "metal", "serif"]);
  const free = diceLook({userColor: "#3366cc", choice});
  assert.equal(free.text, "#ffee00");
  assert.equal(lookForDie(free, "d20").body, "#00ff00");
  assert.equal(lookForDie(free, "d20").pattern, "marble");
  assert.equal(lookForDie(free, "d6").body, "#aa2222");
});

test("every ready-made look is complete", () => {
  for ( const [key, p] of Object.entries(PRESETS) ) {
    assert.ok(normalizeHex(p.color) && normalizeHex(p.second), key);
    assert.ok(PATTERNS.includes(p.pattern) && FINISHES.includes(p.finish), key);
  }
  assert.ok(Object.keys(FONTS).length >= 3);
});

test("glow and trail are the user's, with a bright tone of the die as light by default", () => {
  const plain = diceLook({userColor: "#3366cc"});
  assert.equal(plain.glow, "none");
  assert.equal(plain.trail, "none");
  assert.equal(plain.glowColor, tone("#3366cc", 0.45));
  const lit = diceLook({userColor: "#3366cc", choice: {glow: "strong", glowColor: "#ff00ff", trail: "stars"}, allowOwn: false});
  assert.deepEqual([lit.glow, lit.glowColor, lit.trail], ["strong", "#ff00ff", "stars"]);
  assert.equal(diceLook({userColor: "#3366cc", choice: {glow: "blinding", trail: "fireworks"}}).glow, "none");
  for ( const p of Object.values(PRESETS) ) {
    if ( p.glow ) assert.ok(GLOWS.includes(p.glow) && ((p.glow === "none") || normalizeHex(p.glowColor)));
    if ( p.trail ) assert.ok(TRAIL_KINDS.includes(p.trail));
  }
});

test("something inside shows only in glass and crystal, which paint their numbers white", () => {
  const glass = diceLook({userColor: "#3366cc", choice: {finish: "glass", core: "orb"}});
  assert.equal(glass.core, "orb");
  assert.equal(glass.seeThrough, true);
  assert.equal(glass.text, "#fbf8ff");
  assert.match(glass.glassBody, /^rgb\(\d+ \d+ \d+ \/ 0\.2\)$/);
  const opaque = diceLook({userColor: "#3366cc", choice: {finish: "stone", core: "orb"}});
  assert.equal(opaque.core, "none");
  assert.equal(opaque.seeThrough, false);
  assert.equal(diceLook({userColor: "#3366cc", choice: {finish: "crystal", core: "dragon"}}).core, "none");
  assert.equal(diceLook({userColor: "#3366cc", choice: {finish: "lava"}}).glowColor, "#ff7a1a");
  assert.equal(diceLook({userColor: "#3366cc", choice: {finish: "lava"}}).text, "#ff7a1a");
  assert.equal(diceLook({userColor: "#eeeeee", choice: {finish: "galaxy"}}).text, "#fbf8ff");
  assert.equal(diceLook({userColor: "#3366cc", choice: {finish: "glass", text: "#ffd700"}}).text, "#ffd700");
});

test("a surprise is always a valid look, the same for the same numbers", () => {
  for ( let seed = 1; seed < 200; seed++ ) {
    let a = seed;
    const rand = () => {
      a = (a * 16807) % 2147483647;
      return (a - 1) / 2147483646;
    };
    const choice = randomLook(rand, {allowOwn: seed % 2 === 0, current: {mode: "player", font: "classic"}});
    assert.ok(FINISHES.includes(choice.finish) && CORES.includes(choice.core), JSON.stringify(choice));
    if ( choice.core !== "none" ) assert.ok(SEE_THROUGH.includes(choice.finish), "something inside needs glass");
    assert.ok(GLOWS.includes(choice.glow) && TRAIL_KINDS.includes(choice.trail) && (choice.font in FONTS));
    assert.ok(normalizeHex(choice.second) && normalizeHex(choice.glowColor));
    if ( seed % 2 === 0 ) assert.ok(choice.mode === "own" && normalizeHex(choice.color));
    else assert.equal(choice.mode, "player");
    const look = diceLook({userColor: "#3366cc", choice});
    assert.equal(look.core, choice.core);
  }
});

test("hues become colors", () => {
  assert.equal(hslHex(0, 1, 0.5), "#ff0000");
  assert.equal(hslHex(120, 1, 0.5), "#00ff00");
  assert.equal(hslHex(240, 1, 0.5), "#0000ff");
  assert.equal(hslHex(0, 0, 1), "#ffffff");
});

test("aura and landing are the user's, and every ready look names valid ones", () => {
  const look = diceLook({userColor: "#3366cc", choice: {aura: "motes", landing: "runes"}, allowOwn: false});
  assert.deepEqual([look.aura, look.landing], ["motes", "runes"]);
  const plain = diceLook({userColor: "#3366cc", choice: {aura: "tornado", landing: "meteorite"}});
  assert.deepEqual([plain.aura, plain.landing], ["none", "none"]);
  for ( const p of Object.values(PRESETS) ) {
    if ( p.aura ) assert.ok(AURAS.includes(p.aura), p.aura);
    if ( p.landing ) assert.ok(LANDINGS.includes(p.landing), p.landing);
  }
  let a = 7;
  const rand = () => {
    a = (a * 16807) % 2147483647;
    return (a - 1) / 2147483646;
  };
  const seen = new Set();
  for ( let i = 0; i < 300; i++ ) {
    const choice = randomLook(rand);
    assert.ok(AURAS.includes(choice.aura) && LANDINGS.includes(choice.landing));
    seen.add(choice.aura);
  }
  assert.equal(seen.size, AURAS.length, "a surprise can bring every aura");
});

test("every class look is complete and names valid effects", () => {
  for ( const [key, p] of Object.entries(CLASS_LOOKS) ) {
    assert.ok(p.icon?.startsWith("fa-"), key);
    assert.ok(normalizeHex(p.color) && normalizeHex(p.second) && normalizeHex(p.glowColor), key);
    assert.ok(PATTERNS.includes(p.pattern) && FINISHES.includes(p.finish) && GLOWS.includes(p.glow), key);
    assert.ok(TRAIL_KINDS.includes(p.trail) && AURAS.includes(p.aura) && LANDINGS.includes(p.landing), key);
    assert.ok(THROWS.includes(p.throw) && TRIUMPHS.includes(p.triumph) && FUMBLES.includes(p.fumble), key);
    if ( p.core ) assert.ok(CORES.includes(p.core) && SEE_THROUGH.includes(p.finish), `${key} shows its core`);
    if ( p.font ) assert.ok(p.font in FONTS, key);
  }
  for ( const [creature, look] of Object.entries(CREATURE_LOOKS) ) {
    assert.ok(CLASS_LOOKS[look] || PRESETS[look], creature);
  }
});

test("a ready look replaces colors and effects, keeps the font unless it has one", () => {
  const current = {mode: "player", font: "typewriter", trail: "coins", trailColor: "#ff0000", byClass: true};
  const druid = readyLook("druid", current);
  assert.deepEqual([druid.mode, druid.color, druid.trail, druid.trailColor, druid.font, druid.byClass],
    ["own", CLASS_LOOKS.druid.color, "leaves", null, "typewriter", true]);
  assert.equal(readyLook("barbarian", current).font, "carved");
  assert.equal(readyLook("ivory", current).aura, "none", "what a preset leaves out goes back to the plain value");
  assert.equal(readyLook("undead", current).core, "skull");
  assert.equal(readyLook("nothing", current), null);
  assert.equal(diceLook({userColor: "#3366cc", choice: druid}).core, "leaf");
});

test("ready looks and class looks never share a key, a creature only with the look it takes", () => {
  const classes = Object.keys(CLASS_LOOKS);
  assert.deepEqual(Object.keys(PRESETS).filter(k => classes.includes(k)), []);
  assert.deepEqual(Object.keys(CREATURE_LOOKS).filter(k => (classes.includes(k) || (k in PRESETS)) && (CREATURE_LOOKS[k] !== k)), []);
});

test("a class look is known until the user changes it", () => {
  const druid = {...readyLook("druid", {font: "typewriter"}), byClass: false};
  assert.equal(readyLookOf(druid), "druid");
  assert.equal(readyLookOf({...druid, byClass: true}), "druid", "following the class changes no look");
  assert.equal(readyLookOf({...druid, trail: "coins"}), null);
  assert.equal(readyLookOf({...druid, trailColor: "#ff0000"}), null);
  assert.equal(readyLookOf(readyLook("barbarian", {font: "typewriter"})), "barbarian");
  assert.equal(readyLookOf({...readyLook("barbarian"), font: "classic"}), null, "a look with a font needs that font");
  assert.equal(readyLookOf(readyLook("nebula")), null, "presets are no class looks");
  assert.equal(readyLookOf(readyLook("nebula"), Object.keys(PRESETS)), "nebula");
  assert.equal(readyLookOf(null), null);
  assert.equal(readyLookOf({}), null);
});

test("effects take a color of their own, or the light's", () => {
  const look = diceLook({userColor: "#3366cc", choice: {glowColor: "#00ff00", trailColor: "#ff0000", auraColor: "nope"},
    allowOwn: false});
  assert.deepEqual(look.colors, {trail: "#ff0000", aura: null, landing: null, core: null, throw: null});
  const trail = effectVars(look, "trail");
  assert.equal(trail["--ssd-glowc"], "#ff0000");
  assert.equal(trail["--ssd-tint"], "#ff0000");
  const aura = effectVars(look, "aura");
  assert.equal(aura["--ssd-glowc"], "#00ff00");
  assert.equal(aura["--ssd-tint"], undefined, "effects with a color of their own keep it");
  assert.equal(Object.keys(EFFECT_COLORS).length, 5);
});

test("a surprise sometimes colors effects and never keeps following the class", () => {
  let a = 11;
  const rand = () => {
    a = (a * 16807) % 2147483647;
    return (a - 1) / 2147483646;
  };
  let colored = 0;
  for ( let i = 0; i < 100; i++ ) {
    const choice = randomLook(rand, {current: {byClass: true}});
    assert.equal(choice.byClass, false);
    assert.ok(THROWS.includes(choice.throw) && TRIUMPHS.includes(choice.triumph) && FUMBLES.includes(choice.fumble));
    if ( choice.trailColor ) colored++;
  }
  assert.ok((colored > 10) && (colored < 60), String(colored));
});
