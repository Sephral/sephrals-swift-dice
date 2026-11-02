/**
 * Colors and looks of the dice: by default the color each user picked in Foundry with numbers in black or white,
 * whichever reads better. Users can pick their own color, numbers, a second color with a pattern, the material, the
 * font, a color for their d20, a glow, a trail and something inside see-through dice. Pure, no Foundry.
 */

/** The color when a user has none. */
export const FALLBACK_COLOR = "#7a5c3e";

/** The materials, patterns and fonts a user can pick. */
export const FINISHES = ["glossy", "matte", "metal", "chrome", "glass", "crystal", "frosted", "ice", "jade", "pearl",
  "holo", "wood", "stone", "carbon", "parchment", "lava", "galaxy", "neon"];
export const PATTERNS = ["none", "blend", "speckled", "marble", "stripes", "dots", "checker", "scales", "swirl", "starry"];

/** Materials one can look into; only they show what is inside. */
export const SEE_THROUGH = ["glass", "crystal", "frosted", "ice", "jade"];

/** What can float inside a see-through die. */
export const CORES = ["none", "orb", "flame", "swirl", "fireflies", "eye", "star", "heart", "dragoneye", "moon", "sun",
  "snowflake", "skull", "bolt", "ghost", "leaf", "note", "gear", "yinyang", "shield", "mask", "feather", "paw", "ankh",
  "book", "fist", "flask", "brain", "axe", "sword", "bow", "hat", "crow", "spider", "dove"];
export const FONTS = {
  classic: "\"Signika\", sans-serif",
  serif: "\"Amiri\", \"Times New Roman\", serif",
  carved: "\"Modesto Condensed\", \"Signika\", serif",
  future: "\"Bruno Ace\", \"Signika\", sans-serif",
  typewriter: "\"Courier New\", Courier, monospace",
  roman: "\"Times New Roman\", Times, serif"
};

/** How dice glow, and the trails they can leave. */
export const GLOWS = ["none", "soft", "strong", "flicker", "rainbow"];
export const TRAIL_KINDS = ["none", "sparks", "embers", "stars", "smoke", "hearts", "bubbles", "petals", "snow", "confetti",
  "leaves", "coins", "notes", "glitter", "ghosts", "feathers", "blood", "runes", "bats", "wind", "gears"];

/** What a die does around itself while it flies and rests, and when it lands. */
export const AURAS = ["none", "pulse", "heartbeat", "ripples", "motes", "rays", "flames", "storm", "frost", "shadow", "halo",
  "rings", "twinkle", "sparkflies", "bubbles", "hearts", "snowfall", "runecircle", "vortex", "butterflies", "rage",
  "vines", "chi", "gears", "tentacles", "mark", "wings", "melody", "shield"];
export const LANDINGS = ["none", "dust", "shockwave", "sparkle", "splash", "runes", "crater", "flowers", "confetti",
  "lightning", "frost", "fire", "smoke", "coins", "hearts", "ink", "consecrate", "clash", "arrows", "quake", "bones",
  "steam", "notes"];

/** How the dice reach the table (see motion.mjs). */
export const THROWS = ["classic", "hand", "cup", "drop", "cannon", "slam", "vortex", "portal", "teleport", "meteor", "bow",
  "gust", "beam"];

/** What happens on a triumph, and on a fumble (what counts as one depends on the game, see systems.mjs). */
export const TRIUMPHS = ["burst", "fireworks", "confetti", "rays", "crown", "vignette", "ovation", "bloom", "smite", "roar",
  "none"];
export const FUMBLES = ["sink", "crack", "skull", "raincloud", "smoke", "vignette", "wilt", "fizzle", "none"];

/**
 * The effects whose color a user can pick. Without one they shine in the color of the light, and effects with a
 * color of their own (leaves, coins, embers) keep it.
 */
export const EFFECT_COLORS = {trail: "trailColor", aura: "auraColor", landing: "landingColor", core: "coreColor",
  throw: "throwColor"};

/** Ready-made looks for the window "My dice". */
export const PRESETS = {
  ivory: {color: "#efe6d2", second: "#b89b6a", pattern: "marble", finish: "glossy"},
  obsidian: {color: "#1b1a21", second: "#5b4a86", pattern: "marble", finish: "glossy", glow: "soft", glowColor: "#a98bff",
    trail: "stars", aura: "motes"},
  gold: {color: "#c9a227", second: "#f6df8b", pattern: "none", finish: "metal", glow: "soft", glowColor: "#ffd66b",
    trail: "sparks", landing: "sparkle"},
  blood: {color: "#8e1b1b", second: "#2a0606", pattern: "blend", finish: "glossy", glow: "soft", glowColor: "#ff5a3c",
    trail: "embers", aura: "heartbeat", landing: "splash"},
  emerald: {color: "#1f7a4d", second: "#8fe0b0", pattern: "marble", finish: "glossy"},
  sapphire: {color: "#1f4fa8", second: "#bcd3ff", pattern: "speckled", finish: "glossy", glow: "soft", glowColor: "#9cd4ff",
    aura: "storm", landing: "shockwave"},
  amethyst: {color: "#6b3fa0", second: "#e2ccff", pattern: "blend", finish: "glossy", glow: "strong", glowColor: "#d7b8ff",
    trail: "stars", aura: "rays"},
  bone: {color: "#d9d0bf", second: "#7d6e57", pattern: "speckled", finish: "matte", trail: "smoke", aura: "shadow",
    landing: "dust"},
  frost: {color: "#bfe3f2", second: "#ffffff", pattern: "blend", finish: "glossy", glow: "soft", glowColor: "#9fe8ff",
    trail: "stars", aura: "frost", landing: "shockwave"},
  steel: {color: "#8a9099", second: "#e6ebf2", pattern: "none", finish: "metal"},
  witchlight: {color: "#3fae6a", second: "#c9ffd9", pattern: "none", finish: "glass", glow: "soft", glowColor: "#9dffb9",
    trail: "sparks", core: "orb", aura: "motes"},
  phoenix: {color: "#d2491c", second: "#ffd36b", pattern: "none", finish: "crystal", glow: "soft", glowColor: "#ffb340",
    trail: "embers", core: "flame", aura: "flames", landing: "sparkle"},
  seer: {color: "#5a3c9e", second: "#e9dcff", pattern: "none", finish: "crystal", glow: "soft", glowColor: "#c7a6ff",
    trail: "stars", core: "eye", aura: "pulse", landing: "runes"},
  nebula: {color: "#4b3fb0", second: "#e05ab8", pattern: "none", finish: "galaxy", glow: "soft", glowColor: "#b6a6ff",
    trail: "stars", aura: "rays", landing: "runes"},
  magma: {color: "#3a2018", second: "#ff7a1a", pattern: "none", finish: "lava", glow: "soft", glowColor: "#ff7a1a",
    trail: "embers", aura: "flames", landing: "dust"},
  oak: {color: "#9a6a3c", second: "#5a3a1e", pattern: "none", finish: "wood", trail: "leaves", landing: "dust",
    throw: "hand"},
  dragon: {color: "#2f7a3c", second: "#c9a227", pattern: "scales", finish: "jade", glow: "soft", glowColor: "#ffb340",
    trail: "embers", core: "dragoneye", aura: "flames", landing: "fire", throw: "meteor", triumph: "fireworks"},
  angel: {color: "#f4efe6", second: "#e8c96a", pattern: "none", finish: "pearl", glow: "soft", glowColor: "#ffe9a8",
    trail: "glitter", aura: "halo", landing: "sparkle", throw: "drop", triumph: "rays"},
  necro: {color: "#3d4a3f", second: "#9dffb0", pattern: "none", finish: "frosted", glow: "soft", glowColor: "#7dffa0",
    trail: "ghosts", core: "skull", aura: "shadow", landing: "smoke", throw: "portal", fumble: "skull"},
  party: {color: "#c64ad8", second: "#3ad1e8", pattern: "dots", finish: "holo", glow: "rainbow", glowColor: "#ff8af0",
    trail: "confetti", aura: "twinkle", landing: "confetti", throw: "cannon", triumph: "confetti"},
  winter: {color: "#cfeefc", second: "#ffffff", pattern: "none", finish: "ice", glow: "soft", glowColor: "#bdf2ff",
    trail: "snow", core: "snowflake", aura: "snowfall", landing: "frost", throw: "drop"},
  pirate: {color: "#6b4a2b", second: "#c9a227", pattern: "stripes", finish: "wood", glow: "none", trail: "coins",
    landing: "coins", throw: "cannon", triumph: "crown", fumble: "raincloud"},
  lover: {color: "#e2507a", second: "#ffd1dc", pattern: "none", finish: "glass", glow: "soft", glowColor: "#ff9ab8",
    trail: "hearts", core: "heart", aura: "hearts", landing: "hearts", throw: "hand"},
  arcane: {color: "#141428", second: "#7a5cff", pattern: "none", finish: "neon", glow: "strong", glowColor: "#8f7bff",
    trail: "stars", aura: "runecircle", landing: "runes", throw: "portal", triumph: "rays"},
  thunder: {color: "#2a3550", second: "#bfe2ff", pattern: "none", finish: "crystal", glow: "flicker", glowColor: "#bfe2ff",
    trail: "sparks", core: "bolt", aura: "storm", landing: "lightning", throw: "slam", fumble: "raincloud"},
  grove: {color: "#4f7a2c", second: "#d6f0a0", pattern: "swirl", finish: "stone", glow: "soft", glowColor: "#e8ff9a",
    trail: "leaves", aura: "butterflies", landing: "flowers", throw: "vortex"},
  sun: {color: "#f2a81d", second: "#fff2b0", pattern: "none", finish: "glass", glow: "strong", glowColor: "#ffd25a",
    trail: "sparks", core: "sun", aura: "rays", landing: "shockwave", throw: "teleport", triumph: "fireworks"},
  night: {color: "#1a1f3d", second: "#c9d4ff", pattern: "starry", finish: "crystal", glow: "soft", glowColor: "#c9d4ff",
    trail: "stars", core: "moon", aura: "sparkflies", landing: "sparkle", throw: "vortex"},
  ink: {color: "#f1e6cf", second: "#2a2018", pattern: "none", finish: "parchment", font: "typewriter", trail: "notes",
    landing: "ink", throw: "hand"},
  carbon: {color: "#2b2d31", second: "#e04a3a", pattern: "none", finish: "carbon", glow: "soft", glowColor: "#ff5a3c",
    trail: "sparks", aura: "rings", landing: "crater", throw: "slam"}
};

/**
 * Looks for the classes of fantasy games: every part of the look tells the class, from the throw to the moments.
 * The icon is for the window "My dice".
 */
export const CLASS_LOOKS = {
  barbarian: {icon: "fa-axe-battle", color: "#8e2a1c", second: "#2e140c", pattern: "blend", finish: "stone",
    glow: "flicker", glowColor: "#ff5a2a", trail: "blood", aura: "rage", landing: "quake", throw: "slam",
    triumph: "roar", fumble: "crack", font: "carved"},
  bard: {icon: "fa-music", color: "#7a3fa0", second: "#f2c94c", pattern: "swirl", finish: "pearl", glow: "soft",
    glowColor: "#ffd66b", trail: "notes", aura: "melody", landing: "notes", throw: "hand", triumph: "ovation",
    fumble: "raincloud", font: "serif"},
  cleric: {icon: "fa-sun", color: "#f3ead2", second: "#d9b75a", pattern: "none", finish: "frosted", core: "sun",
    glow: "soft", glowColor: "#ffe08a", trail: "glitter", aura: "halo", landing: "consecrate", throw: "beam",
    triumph: "rays", fumble: "vignette", font: "roman"},
  druid: {icon: "fa-leaf", color: "#4f7a2c", second: "#c9e59a", pattern: "none", finish: "jade", core: "leaf",
    glow: "soft", glowColor: "#c8ff8a", trail: "leaves", aura: "vines", landing: "flowers", throw: "gust",
    triumph: "bloom", fumble: "wilt"},
  fighter: {icon: "fa-shield-halved", color: "#8a9099", second: "#3d4450", pattern: "none", finish: "metal",
    glow: "none", glowColor: "#ffd27a", trail: "sparks", aura: "shield", landing: "clash", throw: "slam",
    triumph: "crown", fumble: "crack", font: "roman"},
  monk: {icon: "fa-hand-fist", color: "#e3a03a", second: "#7a3a12", pattern: "none", finish: "jade", core: "yinyang",
    glow: "soft", glowColor: "#fff1c4", trail: "wind", aura: "chi", landing: "shockwave", throw: "gust",
    triumph: "burst", fumble: "smoke"},
  paladin: {icon: "fa-hammer-war", color: "#d9b04a", second: "#fff3c4", pattern: "none", finish: "metal", glow: "strong",
    glowColor: "#ffe9a8", trail: "glitter", aura: "wings", landing: "consecrate", throw: "beam", triumph: "smite",
    fumble: "vignette", font: "roman"},
  ranger: {icon: "fa-bow-arrow", color: "#3d5a2a", second: "#8a6a3c", pattern: "speckled", finish: "wood",
    glow: "none", glowColor: "#d6f0a0", trail: "feathers", aura: "mark", landing: "arrows", throw: "bow",
    triumph: "rays", fumble: "raincloud"},
  rogue: {icon: "fa-mask", color: "#2a2e36", second: "#8a93a3", pattern: "none", finish: "frosted", core: "mask",
    glow: "none", glowColor: "#b8c2d2", trail: "smoke", aura: "shadow", landing: "smoke", throw: "teleport",
    triumph: "vignette", fumble: "smoke"},
  sorcerer: {icon: "fa-wand-sparkles", color: "#a0307a", second: "#ffd36b", pattern: "none", finish: "crystal",
    core: "swirl", glow: "rainbow", glowColor: "#ff8af0", trail: "glitter", aura: "twinkle", landing: "sparkle",
    throw: "teleport", triumph: "fireworks", fumble: "fizzle"},
  warlock: {icon: "fa-eye", color: "#1d1430", second: "#5aff8a", pattern: "none", finish: "glass", core: "eye",
    glow: "soft", glowColor: "#7dff9a", trail: "bats", aura: "tentacles", landing: "runes", throw: "portal",
    triumph: "vignette", fumble: "skull", font: "carved"},
  wizard: {icon: "fa-hat-wizard", color: "#1f2f6b", second: "#c9d4ff", pattern: "starry", finish: "galaxy",
    glow: "soft", glowColor: "#9fb6ff", trail: "runes", aura: "runecircle", landing: "runes", throw: "portal",
    triumph: "rays", fumble: "fizzle", font: "serif"},
  artificer: {icon: "fa-gears", color: "#9a6a2e", second: "#d9b06a", pattern: "none", finish: "metal", glow: "soft",
    glowColor: "#7fe0ff", trail: "gears", aura: "gears", landing: "steam", throw: "cannon", triumph: "fireworks",
    fumble: "smoke", font: "future"},
  necromancer: {icon: "fa-skull", color: "#2a2f2a", second: "#9dffb0", pattern: "none", finish: "frosted",
    core: "skull", glow: "soft", glowColor: "#7dffa0", trail: "ghosts", aura: "shadow", landing: "bones",
    throw: "portal", triumph: "vignette", fumble: "skull"},
  witch: {icon: "fa-broom", color: "#3a2a4a", second: "#9be05a", pattern: "none", finish: "glass", core: "moon",
    glow: "soft", glowColor: "#b6ff5a", trail: "stars", aura: "bubbles", landing: "splash", throw: "cup",
    triumph: "confetti", fumble: "fizzle"},
  alchemist: {icon: "fa-flask", color: "#2a7a6a", second: "#ffd36b", pattern: "none", finish: "glass", core: "flask",
    glow: "soft", glowColor: "#7dffd9", trail: "bubbles", aura: "sparkflies", landing: "steam", throw: "cup",
    triumph: "fireworks", fumble: "smoke"},
  psion: {icon: "fa-brain", color: "#5a3c9e", second: "#e9dcff", pattern: "none", finish: "crystal", core: "brain",
    glow: "strong", glowColor: "#d7b8ff", trail: "wind", aura: "ripples", landing: "shockwave", throw: "teleport",
    triumph: "rays", fumble: "vignette"}
};

/**
 * Creatures without a class take the look of what they are: the undead the necromancer's, dragons the dragon's.
 * Keys of CLASS_LOOKS or PRESETS.
 */
export const CREATURE_LOOKS = {undead: "necromancer", fiend: "magma", celestial: "angel", dragon: "dragon",
  fey: "druid", elemental: "thunder", construct: "artificer", plant: "oak", beast: "oak", aberration: "warlock",
  ooze: "witchlight"};

/** The parts of a choice a ready look sets; what it leaves out goes back to the plain value. */
const LOOK_KEYS = {mode: "own", color: null, second: null, pattern: "none", finish: "glossy", text: null, d20: null,
  glow: "none", glowColor: null, trail: "none", core: "none", aura: "none", landing: "none", throw: "classic",
  triumph: "burst", fumble: "sink", trailColor: null, auraColor: null, landingColor: null, coreColor: null,
  throwColor: null};

/**
 * The choice of a ready look (a preset, a class or a creature), on top of a user's choice: the look replaces colors
 * and effects, the font stays unless the look has one.
 * @param {string} key        A key of PRESETS or CLASS_LOOKS, or a creature of CREATURE_LOOKS
 * @param {object} [current]  The choice so far
 * @returns {object|null}
 */
export function readyLook(key, current = {}) {
  const look = CLASS_LOOKS[key] ?? PRESETS[key] ?? (CREATURE_LOOKS[key]
    ? (CLASS_LOOKS[CREATURE_LOOKS[key]] ?? PRESETS[CREATURE_LOOKS[key]]) : null);
  if ( !look ) return null;
  const {icon, ...parts} = look;
  return {...current, ...LOOK_KEYS, font: look.font ?? current.font ?? "classic", ...parts};
}

/**
 * The ready look a choice still is: taken and not changed since. The font only counts when the look sets one.
 * @param {object} [choice]               A user's choice
 * @param {string[]} [keys]               The looks to check, keys of PRESETS or CLASS_LOOKS
 * @returns {string|null}
 */
export function readyLookOf(choice, keys = Object.keys(CLASS_LOOKS)) {
  if ( !choice ) return null;
  return keys.find(key => {
    const look = readyLook(key, choice);
    if ( !look ) return false;
    return Object.keys(LOOK_KEYS).concat("font").every(k => (look[k] ?? null) === (choice[k] ?? null));
  }) ?? null;
}

/**
 * A color as #rrggbb, or null when it is not one.
 * @param {*} value   "#rgb", "#rrggbb", a number or an object with css or toString (Foundry's Color)
 * @returns {string|null}
 */
export function normalizeHex(value) {
  if ( (value === null) || (value === undefined) ) return null;
  if ( typeof value === "number" && Number.isFinite(value) ) return `#${(value >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
  let text = String(value?.css ?? value).trim().toLowerCase();
  if ( /^#[0-9a-f]{3}$/.test(text) ) text = `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
  return /^#[0-9a-f]{6}$/.test(text) ? text : null;
}

/**
 * The three channels of a color, 0 to 255.
 * @param {string} hex
 * @returns {number[]}
 */
export function channels(hex) {
  const h = normalizeHex(hex) ?? FALLBACK_COLOR;
  return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
}

/**
 * Relative luminance (WCAG).
 * @param {string} hex
 * @returns {number}   0 (black) to 1 (white)
 */
export function luminance(hex) {
  const [r, g, b] = channels(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

/**
 * Black or white numbers, whichever contrasts more with the die.
 * @param {string} hex
 * @returns {string}
 */
export function numberColor(hex) {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onBlack = (l + 0.05) / 0.05;
  return onBlack > onWhite ? "#16120e" : "#fbf7f0";
}

/**
 * A color mixed toward white (amount > 0) or black (amount < 0).
 * @param {string} hex
 * @param {number} amount   -1 to 1
 * @returns {string}
 */
export function tone(hex, amount) {
  const target = amount >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(amount));
  const out = channels(hex).map(c => Math.round(c + ((target - c) * k)));
  return `#${out.map(c => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The colors of a die body.
 * @param {string} body
 * @param {string|null} text   Number color, null for black or white
 * @returns {{body: string, light: string, dark: string, edge: string, text: string, halo: string}}
 */
function bodyColors(body, text, finish = "glossy", glowColor = null) {
  const numbers = text ?? materialNumbers(body, finish, glowColor);
  return {
    body,
    light: tone(body, 0.32),
    dark: tone(body, -0.28),
    edge: tone(body, -0.45),
    // See-through materials: the same tones with little cover
    glassLight: rgba(tone(body, 0.45), 0.34),
    glassBody: rgba(body, 0.2),
    glassDark: rgba(tone(body, -0.35), 0.42),
    text: numbers,
    // A faint rim around the numbers in the opposite brightness keeps them readable on patterns
    halo: luminance(numbers) > 0.4 ? "rgb(0 0 0 / 0.45)" : "rgb(255 255 255 / 0.35)"
  };
}

/**
 * The numbers a material wants when the user picked none: painted white on glass, crystal and the night sky,
 * glowing on lava, black or white on everything else.
 * @param {string} body
 * @param {string} finish
 * @param {string|null} glowColor
 * @returns {string}
 */
function materialNumbers(body, finish, glowColor) {
  if ( SEE_THROUGH.includes(finish) || ["galaxy", "carbon"].includes(finish) ) return "#fbf8ff";
  if ( (finish === "lava") || (finish === "neon") ) return glowColor ?? "#ffb347";
  if ( finish === "parchment" ) return "#2a2018";
  return numberColor(body);
}

/**
 * A color with transparency for CSS.
 * @param {string} hex
 * @param {number} alpha
 * @returns {string}
 */
export function rgba(hex, alpha) {
  const [r, g, b] = channels(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

/**
 * The look of a user's dice.
 * @param {object} options
 * @param {*} options.userColor        The color the user picked in Foundry
 * @param {object} [options.choice]    The user's choice from "My dice"
 * @param {boolean} [options.allowOwn=true]   May players pick colors of their own (material, pattern, font and
 *   effects always)
 * @returns {object}   Colors, material, pattern, font, effects, and a look for the d20 when it has its own color
 */
export function diceLook({userColor, choice = {}, allowOwn = true}) {
  choice ??= {};
  const own = allowOwn && (choice.mode === "own") ? normalizeHex(choice.color) : null;
  const body = own ?? normalizeHex(userColor) ?? FALLBACK_COLOR;
  const text = allowOwn ? normalizeHex(choice.text) : null;
  const finish = FINISHES.includes(choice.finish) ? choice.finish : "glossy";
  const pattern = PATTERNS.includes(choice.pattern) ? choice.pattern : "none";
  const font = (choice.font in FONTS) ? choice.font : "classic";
  const second = normalizeHex(choice.second) ?? tone(body, -0.5);
  const glow = GLOWS.includes(choice.glow) ? choice.glow : "none";
  const trail = TRAIL_KINDS.includes(choice.trail) ? choice.trail : "none";
  // The light of a glowing die: its own color, or a bright tone of the die (lava burns orange)
  const ownGlow = normalizeHex(choice.glowColor);
  const glowColor = ownGlow ?? ((finish === "lava") ? "#ff7a1a" : ((finish === "neon") ? tone(body, 0.75) : tone(body, 0.45)));
  // Something inside shows only through glass and crystal
  const core = (SEE_THROUGH.includes(finish) && CORES.includes(choice.core)) ? choice.core : "none";
  const aura = AURAS.includes(choice.aura) ? choice.aura : "none";
  const landing = LANDINGS.includes(choice.landing) ? choice.landing : "none";
  const throwStyle = THROWS.includes(choice.throw) ? choice.throw : "classic";
  const triumph = TRIUMPHS.includes(choice.triumph) ? choice.triumph : "burst";
  const fumble = FUMBLES.includes(choice.fumble) ? choice.fumble : "sink";
  // Effects in a color of their own; without one they follow the light (effect colors are not die colors, so a GM who
  // keeps player colors still allows them)
  const colors = Object.fromEntries(Object.entries(EFFECT_COLORS).map(([effect, key]) => [effect,
    normalizeHex(choice[key])]));
  const look = {...bodyColors(body, text, finish, glowColor), finish, pattern, second, font, fontFamily: FONTS[font],
    glow, glowColor, trail, core, aura, landing, throw: throwStyle, triumph, fumble, colors,
    seeThrough: SEE_THROUGH.includes(finish), d20: null};
  const d20 = allowOwn && choice.d20 ? normalizeHex(choice.d20) : null;
  if ( d20 ) look.d20 = {...look, ...bodyColors(d20, text, finish, glowColor), d20: null};
  return look;
}

/**
 * The CSS colors of an effect: the color it shines in (its own or the light's), and a tint for effects that have a
 * color of their own, only when the user picked one.
 * @param {object} look
 * @param {"trail"|"aura"|"landing"|"core"|"throw"} effect
 * @returns {Record<string, string>}   CSS variables
 */
export function effectVars(look, effect) {
  const own = look?.colors?.[effect] ?? null;
  const color = own ?? look?.glowColor ?? FALLBACK_COLOR;
  const vars = {"--ssd-glowc": color, "--ssd-glow-soft": rgba(color, 0.35)};
  if ( own ) Object.assign(vars, {"--ssd-tint": own, "--ssd-tint-light": tone(own, 0.5), "--ssd-tint-dark": tone(own, -0.4)});
  return vars;
}

/**
 * Put the colors of an effect on an element.
 * @param {HTMLElement} el
 * @param {object} look
 * @param {string} effect
 * @returns {HTMLElement}
 */
export function paintEffect(el, look, effect) {
  for ( const [name, value] of Object.entries(effectVars(look, effect)) ) el.style.setProperty(name, value);
  return el;
}

/**
 * A color from hue, saturation and lightness (0 to 360, 0 to 1, 0 to 1).
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string}
 */
export function hslHex(h, s, l) {
  const k = n => (n + (h / 30)) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - (a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A surprise: a random look with effects. Colors only when the GM allows own colors; something inside comes with a
 * see-through material.
 * @param {() => number} rand
 * @param {object} [options]
 * @param {boolean} [options.allowOwn=true]
 * @param {object} [options.current]   The choice so far, kept where nothing new is drawn
 * @returns {object}   A choice for diceLook
 */
export function randomLook(rand, {allowOwn = true, current = {}} = {}) {
  const pick = list => list[Math.floor(rand() * list.length)];
  const weighted = entries => {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = rand() * total;
    for ( const [value, w] of entries ) {
      r -= w;
      if ( r <= 0 ) return value;
    }
    return entries.at(-1)[0];
  };
  const hue = rand() * 360;
  let finish = pick(FINISHES);
  let core = "none";
  if ( SEE_THROUGH.includes(finish) ) core = weighted([["none", 1], ...CORES.slice(1).map(c => [c, 1.2])]);
  else if ( rand() < 0.3 ) {
    finish = pick(SEE_THROUGH);
    core = pick(CORES.slice(1));
  }
  const choice = {
    ...current,
    finish,
    core,
    pattern: ["glossy", "matte", "metal", "stone", "pearl"].includes(finish)
      ? weighted([["none", 3], ...PATTERNS.slice(1).map(p => [p, 1])]) : "none",
    second: hslHex((hue + 150 + (rand() * 60)) % 360, 0.5 + (rand() * 0.4), 0.35 + (rand() * 0.4)),
    glow: weighted([["none", 3], ["soft", 4], ["strong", 2], ["flicker", 1], ["rainbow", 1]]),
    glowColor: hslHex(rand() * 360, 0.85, 0.66),
    trail: weighted([["none", 3], ...TRAIL_KINDS.slice(1).map(k => [k, 1])]),
    aura: weighted([["none", 3], ...AURAS.slice(1).map(a => [a, 1])]),
    landing: weighted([["none", 2], ...LANDINGS.slice(1).map(l => [l, 1])]),
    throw: weighted([["classic", 2], ...THROWS.slice(1).map(s => [s, 1])]),
    triumph: pick(TRIUMPHS.slice(0, -1)),
    fumble: pick(FUMBLES.slice(0, -1)),
    font: pick(Object.keys(FONTS)),
    text: null,
    d20: null,
    byClass: false
  };
  // Now and then an effect gets a color of its own
  for ( const key of Object.values(EFFECT_COLORS) ) {
    choice[key] = (rand() < 0.3) ? hslHex(rand() * 360, 0.8, 0.6) : null;
  }
  if ( allowOwn ) {
    choice.mode = "own";
    choice.color = hslHex(hue, 0.45 + (rand() * 0.4), 0.3 + (rand() * 0.32));
  }
  return choice;
}

/**
 * The look for one die: the d20 can have its own color.
 * @param {object} look   From diceLook
 * @param {string} type   Die type
 * @returns {object}
 */
export function lookForDie(look, type) {
  return ((type === "d20") && look.d20) ? look.d20 : look;
}
