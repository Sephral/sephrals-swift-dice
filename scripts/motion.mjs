/**
 * How the dice fly, bounce and roll. Everything comes from a seed, so every browser computes the same throw for the
 * same chat message. Positions are fractions of the dice area (0 to 1), so a larger screen shows the same throw
 * larger. Pure math, no page.
 */

import {apply, axisAngle, cross, dot, multiply, normalize} from "./geometry.mjs";

/* -------------------------------------------- */
/*  Seeded randomness                           */
/* -------------------------------------------- */

/**
 * A 32 bit hash of a text (FNV-1a).
 * @param {string} text
 * @returns {number}
 */
export function hashText(text) {
  let h = 0x811c9dc5;
  for ( let i = 0; i < text.length; i++ ) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Random numbers from 0 to 1 from a seed (mulberry32): the same seed gives the same numbers everywhere.
 * @param {string|number} seed
 * @returns {() => number}
 */
export function seededRandom(seed) {
  let a = (typeof seed === "number") ? (seed >>> 0) : hashText(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random direction.
 * @param {() => number} rand
 * @returns {number[]}
 */
function randomAxis(rand) {
  const z = (rand() * 2) - 1;
  const a = rand() * 2 * Math.PI;
  const r = Math.sqrt(1 - (z * z));
  return [r * Math.cos(a), r * Math.sin(a), z];
}

/**
 * A number between two bounds.
 * @param {() => number} rand
 * @param {number[]} range   [low, spread]
 * @returns {number}
 */
const between = (rand, [low, spread]) => low + (rand() * spread);

/* -------------------------------------------- */
/*  Where the dice land                         */
/* -------------------------------------------- */

/**
 * Resting places for some dice inside the area, apart from each other. A loose grid with jitter, filled in a random
 * order, so a single die does not always land in the same spot.
 * @param {number} count
 * @param {() => number} rand
 * @param {number} [aspect=1.6]   Width of the area divided by its height
 * @returns {{x: number, y: number}[]}
 */
export function restingPlaces(count, rand, aspect = 1.6) {
  if ( count <= 0 ) return [];
  let cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  let rows = Math.ceil(count / cols);
  while ( (cols * rows) < count ) cols++;
  // Leave room for a few more cells than needed, so the dice do not stand in rows
  if ( count > 1 ) {
    if ( (cols / rows) < aspect ) cols++;
    else rows++;
  }
  const cells = [];
  for ( let r = 0; r < rows; r++ ) for ( let c = 0; c < cols; c++ ) cells.push([c, r]);
  for ( let i = cells.length - 1; i > 0; i-- ) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const margin = 0.14;
  const w = (1 - (2 * margin)) / cols;
  const h = (1 - (2 * margin)) / rows;
  return cells.slice(0, count).map(([c, r]) => ({
    x: margin + (w * (c + 0.5 + ((rand() - 0.5) * 0.45))),
    y: margin + (h * (r + 0.5 + ((rand() - 0.5) * 0.45)))
  }));
}

/* -------------------------------------------- */
/*  Throw styles                                */
/* -------------------------------------------- */

/**
 * How the height of a die changes after it leaves the hand: it falls for `fall` of the way (or, with `arc`, rises
 * and sinks), then hops between the contacts in `bounces` with the heights in `hops`.
 */
const PROFILES = {
  throw: {fall: 0.2, bounces: [0.2, 0.42, 0.58, 0.68], hops: [0.42, 0.16, 0.05]},
  drop: {fall: 0.36, bounces: [0.36, 0.56, 0.7, 0.78], hops: [0.3, 0.1, 0.03]},
  shot: {fall: 0.12, bounces: [0.12, 0.3, 0.44, 0.52], hops: [0.14, 0.05, 0.015]},
  slam: {fall: 0.16, bounces: [0.16, 0.27, 0.33], hops: [0.07, 0.015]},
  pop: {fall: 0, bounces: [0, 0.3, 0.44], hops: [0.32, 0.07]},
  arc: {arc: 0.7, bounces: [0.7, 0.82, 0.9], hops: [0.1, 0.03]},
  dive: {fall: 0.32, linear: true, bounces: [0.32, 0.5, 0.62, 0.7], hops: [0.25, 0.08, 0.02]},
  float: {fall: 0.62, soft: true, bounces: [0.62, 0.72], hops: [0.04]}
};

/** The throw styles a user can pick, by how their dice reach the table. */
export const THROW_STYLES = ["classic", "hand", "cup", "drop", "cannon", "slam", "vortex", "portal", "teleport", "meteor",
  "bow", "gust", "beam"];

/**
 * What each throw style does. `launch` names where the dice start, `release` how much of the throw they stay in the
 * hand or cup, `scale` how they appear, the ranges are [low, spread]. `travel` is how fast they slow down.
 */
const STYLES = {
  classic: {profile: "throw", travel: 2.4, launch: "side", height: [0.9, 0.35], roll: [5.5, 2.5], tumble: [2.2, 1.6],
    stagger: 0.08},
  hand: {profile: "throw", travel: 2.2, launch: "edge", release: 0.3, hold: {scale: 0.55, shake: 0.025},
    height: [0.75, 0.3], roll: [5, 2], tumble: [1.8, 1.2], stagger: 0.03},
  cup: {profile: "shot", travel: 2, launch: "edge", release: 0.34, hold: {scale: 0, shake: 0.02},
    scale: "spill", height: [0.3, 0.2], roll: [7, 3], tumble: [1.5, 1], stagger: 0.05},
  drop: {profile: "drop", travel: 1.6, launch: "above", height: [4.5, 1.2], roll: [1, 1], tumble: [2.4, 1.4],
    stagger: 0.12},
  cannon: {profile: "shot", travel: 3.6, launch: "muzzle", height: [0.45, 0.2], roll: [6, 2], tumble: [2.2, 1.2],
    stagger: 0.18, sequence: true},
  slam: {profile: "slam", travel: 1.4, launch: "above", height: [5, 1], roll: [1, 0.8], tumble: [1.4, 0.8],
    stagger: 0.02},
  vortex: {profile: "arc", travel: 1.8, launch: "center", path: "spiral", turns: [1.1, 0.6], height: [0.9, 0.2],
    roll: [3, 2], tumble: [1.8, 1.2], stagger: 0.05},
  portal: {profile: "throw", travel: 2.2, launch: "portal", scale: "portal", height: [1.1, 0.2], roll: [5, 2],
    tumble: [2, 1.2], stagger: 0.1},
  teleport: {profile: "pop", travel: 1, launch: "spot", scale: "pop", height: [0.45, 0.15], roll: [0, 0],
    tumble: [0.8, 0.5], spinTable: [2.2, 1.4], stagger: 0.14},
  meteor: {profile: "dive", travel: 1.25, launch: "sky", height: [4.5, 1], roll: [4, 2], tumble: [2.6, 1.4],
    stagger: 0.07},
  // Shot one after another from a bow: flat and fast, few hops
  bow: {profile: "shot", travel: 4, launch: "muzzle", height: [0.55, 0.15], roll: [5, 2], tumble: [1.2, 0.8],
    stagger: 0.14, sequence: true},
  // Carried on a gust of wind: a wave sideways that calms down, high and slow
  gust: {profile: "arc", travel: 1.6, launch: "side", path: "gust", height: [1.4, 0.4], roll: [3, 2], tumble: [2.4, 1.2],
    stagger: 0.09},
  // Sinking down a beam of light: straight down, slowing before it touches the table
  beam: {profile: "float", travel: 1, launch: "above", height: [3.2, 0.6], roll: [0.6, 0.6], tumble: [1.6, 0.8],
    stagger: 0.12}
};

/**
 * Where a throw starts, as a fraction of the area: the side of the chat (right) or the bottom in the middle of the
 * screen.
 * @param {string} launch
 * @param {"right"|"bottom"} from
 * @param {() => number} rand
 * @returns {{x: number, y: number}}
 */
function launchPoint(launch, from, rand) {
  const right = from !== "bottom";
  switch ( launch ) {
    case "edge": return right ? {x: 1.0, y: 0.45 + (rand() * 0.2)} : {x: 0.4 + (rand() * 0.2), y: 1.0};
    case "muzzle": return right ? {x: 1.08, y: 0.7 + (rand() * 0.1)} : {x: 0.45 + (rand() * 0.1), y: 1.1};
    case "portal": return right ? {x: 0.95, y: 0.25 + (rand() * 0.15)} : {x: 0.5 + ((rand() - 0.5) * 0.3), y: 0.92};
    case "center": return {x: 0.5, y: 0.5};
    case "sky": return {x: -0.25 + (rand() * 0.1), y: -0.5 + (rand() * 0.1)};
    default: return right ? {x: 1.22, y: 0.4 + (rand() * 0.45)} : {x: 0.5 + ((rand() - 0.5) * 0.5), y: 1.25};
  }
}

/**
 * The plan of one throw: per die where it comes from, where it rests, how it rolls and tumbles, and when it starts.
 * The dice come in from the side named by `from` (the chat sits on the right), in the user's throw style.
 * @param {number} count
 * @param {object} options
 * @param {() => number} options.rand
 * @param {number} [options.aspect=1.6]
 * @param {"right"|"bottom"} [options.from="right"]
 * @param {string} [options.style="classic"]   A key of STYLES
 * @returns {object[]}
 */
export function planThrow(count, {rand, aspect = 1.6, from = "right", style = "classic"}) {
  const def = STYLES[style] ?? STYLES.classic;
  const places = restingPlaces(count, rand, aspect);
  const base = launchPoint(def.launch, from, rand);
  return places.map((end, i) => {
    let start;
    if ( (def.launch === "above") || (def.launch === "spot") ) {
      const spread = (def.launch === "spot") ? 0 : 0.05;
      start = {x: end.x + ((rand() - 0.5) * spread), y: end.y + ((rand() - 0.5) * spread)};
    }
    else {
      const spread = ["center", "muzzle", "portal"].includes(def.launch) ? 0.03 : 0.12;
      start = {x: base.x + ((rand() - 0.5) * spread), y: base.y + ((rand() - 0.5) * spread * 1.6)};
    }
    const travel = [end.x - start.x, end.y - start.y, 0];
    const distance = Math.hypot(travel[0], travel[1]);
    // Rolling: the axis lies on the table, across the direction of travel; a die that barely moves rolls anyhow
    const rollAxis = (distance > 1e-3) ? normalize(cross([0, 0, 1], normalize(travel)))
      : normalize([Math.cos(rand() * 6.283), Math.sin(rand() * 6.283), 0]);
    const plan = {
      style: (def === STYLES[style]) ? style : "classic",
      profile: def.profile,
      travel: def.travel,
      path: def.path ?? "line",
      scale: def.scale ?? "grow",
      release: def.release ?? 0,
      launch: {...base},
      start,
      end,
      rollAxis,
      rollAngle: between(rand, def.roll) * Math.max(distance, 0.15),
      tumbleAxis: randomAxis(rand),
      tumbleAngle: between(rand, def.tumble) * Math.PI,
      spin: (rand() - 0.5) * 0.6,
      height: between(rand, def.height),
      delay: def.sequence ? (i / Math.max(1, count)) * def.stagger : rand() * def.stagger
    };
    if ( def.hold ) {
      // Held at the height the throw starts from, so the die does not jump when it leaves the hand
      plan.hold = {x: base.x + ((rand() - 0.5) * 0.06), y: base.y + ((rand() - 0.5) * 0.08), z: plan.height,
        scale: def.hold.scale, shake: def.hold.shake, phase: rand() * 6.283};
    }
    if ( def.turns ) plan.turns = between(rand, def.turns);
    if ( def.spinTable ) plan.spinTable = between(rand, def.spinTable) * Math.PI;
    return plan;
  });
}

/**
 * Height above the table after the release (0 to 1 of the rest of the throw), in units of the starting height.
 * @param {number} u
 * @param {string} [profile="throw"]   A key of PROFILES
 * @returns {number}
 */
export function heightAt(u, profile = "throw") {
  const p = PROFILES[profile] ?? PROFILES.throw;
  if ( p.arc ) {
    // Rises out of the vortex and sinks back to the table
    if ( u <= p.arc ) return Math.sin(Math.PI * u / p.arc);
  }
  else if ( p.fall && (u <= p.fall) ) {
    const f = u / p.fall;
    if ( p.soft ) return (1 - f) ** 2;
    return p.linear ? 1 - f : 1 - (f * f);
  }
  for ( let i = 0; i < p.hops.length; i++ ) {
    const a = p.bounces[i];
    const b = p.bounces[i + 1];
    if ( (u >= a) && (u <= b) ) return (4 * p.hops[i] * (u - a) * (b - u)) / ((b - a) ** 2);
  }
  return 0;
}

/**
 * How far along its way a die is (0 to 1): fast at first, slowing down while it rolls out.
 * @param {number} u
 * @param {number} [power=2.4]
 * @returns {number}
 */
export function travelAt(u, power = 2.4) {
  return 1 - ((1 - u) ** power);
}

/**
 * How large a die is at a moment after the release (it grows in, spills from a cup, comes out of a portal or pops
 * into being).
 * @param {string} kind
 * @param {number} u
 * @returns {number}
 */
function scaleAt(kind, u) {
  switch ( kind ) {
    case "portal": return Math.min(1, 0.05 + (u / 0.22) * 0.95);
    case "spill": return Math.min(1, 0.45 + (u / 0.1) * 0.55);
    case "pop":
      if ( u < 0.02 ) return 0;
      if ( u < 0.12 ) return ((u - 0.02) / 0.1) * 1.25;
      if ( u < 0.22 ) return 1.25 - (((u - 0.12) / 0.1) * 0.25);
      return 1;
    default: return Math.min(1, 0.15 + (u / 0.07));
  }
}

/**
 * Where a die is at a moment of its throw, without its turn, and how large it is.
 * @param {object} plan
 * @param {number} t   0 to 1
 * @returns {{x: number, y: number, z: number, scale: number}}
 */
export function positionAt(plan, t) {
  const release = plan.release ?? 0;
  if ( plan.hold && (t < release) ) {
    // In the hand or the cup: shaken, waiting for the throw
    const k = t / release;
    const shake = Math.sin((k * 9 * Math.PI) + plan.hold.phase) * plan.hold.shake * Math.min(1, k * 3);
    return {x: plan.hold.x + shake, y: plan.hold.y + (shake * 0.6), z: plan.hold.z, scale: plan.hold.scale};
  }
  const u = (release > 0) ? (t - release) / (1 - release) : t;
  const s = travelAt(u, plan.travel ?? 2.4);
  const from = plan.hold ? {x: plan.hold.x, y: plan.hold.y} : plan.start;
  let x;
  let y;
  if ( plan.path === "spiral" ) {
    const dx = plan.end.x - from.x;
    const dy = plan.end.y - from.y;
    const radius = Math.hypot(dx, dy) * s;
    const angle = Math.atan2(dy, dx) + ((plan.turns ?? 1) * 2 * Math.PI * (1 - s));
    x = from.x + (Math.cos(angle) * radius);
    y = from.y + (Math.sin(angle) * radius);
  } else if ( plan.path === "gust" ) {
    // Across the way, a wave that dies down as the die arrives
    const dx = plan.end.x - from.x;
    const dy = plan.end.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const wave = Math.sin(s * Math.PI * 2.2) * 0.16 * (1 - s);
    x = from.x + (dx * s) - ((dy / length) * wave);
    y = from.y + (dy * s) + ((dx / length) * wave);
  } else {
    x = from.x + ((plan.end.x - from.x) * s);
    y = from.y + ((plan.end.y - from.y) * s);
  }
  const z = plan.height * heightAt(u, plan.profile);
  let scale = scaleAt(plan.scale, u);
  if ( plan.hold && (plan.scale === "grow") ) scale = Math.min(1, plan.hold.scale + ((1 - plan.hold.scale) * (u / 0.15)));
  return {x, y, z, scale};
}

/**
 * Position, size and turn of a die at a moment of its throw. At t = 1 it rests exactly at its place with its final
 * turn and full size.
 * @param {object} plan          One entry of planThrow
 * @param {number[][]} resting   The final turn
 * @param {number} t             0 to 1
 * @returns {{x: number, y: number, z: number, scale: number, turn: number[][]}}
 */
export function poseAt(plan, resting, t) {
  const release = plan.release ?? 0;
  const u = (plan.hold && (t < release)) ? 0 : ((release > 0) ? (t - release) / (1 - release) : t);
  const s = travelAt(u, plan.travel ?? 2.4);
  const pos = positionAt(plan, t);
  // The turns still to come: rolling shrinks with the way left, tumbling dies down in the air
  const roll = axisAngle(plan.rollAxis, -plan.rollAngle * (1 - s));
  const tumble = axisAngle(plan.tumbleAxis, -plan.tumbleAngle * ((1 - Math.min(1, u / 0.75)) ** 3));
  let turn = multiply(roll, multiply(tumble, resting));
  // A teleported die spins on the table as it appears
  if ( plan.spinTable ) turn = multiply(axisAngle([0, 0, 1], -plan.spinTable * ((1 - Math.min(1, u / 0.5)) ** 2)), turn);
  // Held dice wobble a little in the hand
  if ( plan.hold && (t < release) ) {
    turn = multiply(axisAngle(plan.tumbleAxis, Math.sin((t / release) * 7 * Math.PI) * 0.35), turn);
  }
  return {...pos, turn};
}

/**
 * The moments a die hits the table (0 to 1 of its own throw), loudest first, for the sound of the dice.
 * @param {object} plan
 * @returns {{t: number, strength: number}[]}
 */
export function contactTimes(plan) {
  const p = PROFILES[plan.profile] ?? PROFILES.throw;
  const release = plan.release ?? 0;
  const strengths = [1, 0.55, 0.3, 0.18];
  return p.bounces.map((b, i) => ({t: release + (b * (1 - release)), strength: strengths[i] ?? 0.12}))
    .filter(c => (c.t > 0) && (c.t < 1));
}

/**
 * The number of animation steps for a throw of some milliseconds: enough that the die never turns more than a
 * quarter turn between two of them.
 * @param {number} ms
 * @returns {number}
 */
export function stepsFor(ms) {
  return Math.max(48, Math.round(ms / 22));
}

/* -------------------------------------------- */
/*  Particles                                   */
/* -------------------------------------------- */

/** How the particles of each trail behave: life in ms, drift in die sizes, rise toward the viewer, growth. */
export const TRAILS = {
  sparks: {life: 480, drift: 0.55, rise: -0.6, grow: 0.4},
  embers: {life: 820, drift: 0.35, rise: 0.9, grow: 0.7},
  stars: {life: 700, drift: 0.3, rise: 0.2, grow: 1.2},
  smoke: {life: 950, drift: 0.25, rise: 0.5, grow: 2.4},
  hearts: {life: 900, drift: 0.3, rise: 0.8, grow: 0.5},
  bubbles: {life: 1000, drift: 0.2, rise: 1.1, grow: 0.9},
  petals: {life: 1150, drift: 0.65, rise: -0.4, grow: 0.15},
  snow: {life: 1250, drift: 0.35, rise: -0.5, grow: 0.1},
  confetti: {life: 950, drift: 0.75, rise: 0.35, grow: 0},
  leaves: {life: 1150, drift: 0.6, rise: -0.25, grow: 0.2},
  coins: {life: 750, drift: 0.45, rise: 0.4, grow: 0},
  notes: {life: 1050, drift: 0.3, rise: 1.0, grow: 0.35},
  glitter: {life: 520, drift: 0.25, rise: 0.1, grow: 0.7},
  ghosts: {life: 1150, drift: 0.3, rise: 1.1, grow: 0.8},
  feathers: {life: 1300, drift: 0.55, rise: -0.35, grow: 0.1},
  blood: {life: 650, drift: 0.3, rise: -1.1, grow: 0.2},
  runes: {life: 1000, drift: 0.25, rise: 0.9, grow: 0.5},
  bats: {life: 900, drift: 0.9, rise: 0.9, grow: 0.3},
  wind: {life: 600, drift: 0.7, rise: 0.2, grow: 1.1},
  gears: {life: 800, drift: 0.45, rise: -0.3, grow: 0}
};

/**
 * The particles a die leaves behind on its way: when each one starts (0 to 1 of the throw, while the die moves) and
 * where it drifts. Fewer per die when many dice fly.
 * @param {object} plan     One entry of planThrow
 * @param {string} kind     A key of TRAILS
 * @param {number} count
 * @param {() => number} rand
 * @returns {{t: number, from: {x: number, y: number, z: number}, dx: number, dy: number, dz: number, size: number,
 *   spin: number, life: number, grow: number, hue: number}[]}
 */
export function trailParticles(plan, kind, count, rand) {
  const def = TRAILS[kind];
  if ( !def || (count <= 0) ) return [];
  // Spread over the part of the throw where the die really flies, after it left the hand
  const first = (plan.release ?? 0) + (0.03 * (1 - (plan.release ?? 0)));
  const span = Math.max(0.05, 0.8 - first);
  const out = [];
  for ( let i = 0; i < count; i++ ) {
    const t = Math.min(0.8, first + ((i + rand()) * (span / count)));
    const angle = rand() * 2 * Math.PI;
    const drift = def.drift * (0.5 + rand());
    out.push({
      t,
      from: positionAt(plan, t),
      dx: Math.cos(angle) * drift,
      dy: Math.sin(angle) * drift,
      dz: def.rise * (0.6 + (rand() * 0.8)),
      size: 0.7 + (rand() * 0.6),
      spin: (rand() - 0.5) * 2 * Math.PI,
      life: def.life * (0.75 + (rand() * 0.5)),
      grow: def.grow,
      hue: Math.floor(rand() * 360)
    });
  }
  return out;
}

/** The landing effects made of particles: how many, how far (die sizes), how high they jump, life in ms. */
export const LANDING_PARTS = {
  dust: {count: 9, reach: [0.45, 0.9], rise: [0.05, 0.25], life: [650, 950]},
  sparkle: {count: 7, reach: [0.55, 0.95], rise: [0.3, 0.8], life: [450, 700]},
  splash: {count: 11, reach: [0.6, 1.3], rise: [0.35, 0.9], life: [500, 750]},
  flowers: {count: 10, reach: [0.5, 1.1], rise: [0.2, 0.6], life: [800, 1100]},
  confetti: {count: 14, reach: [0.4, 1.4], rise: [0.6, 1.4], life: [800, 1200]},
  coins: {count: 7, reach: [0.5, 1.0], rise: [0.5, 1.1], life: [600, 900]},
  hearts: {count: 6, reach: [0.4, 0.8], rise: [0.6, 1.2], life: [800, 1100]},
  fire: {count: 12, reach: [0.45, 0.9], rise: [0.3, 0.8], life: [500, 800]},
  frost: {count: 8, reach: [0.5, 1.0], rise: [0.03, 0.12], life: [900, 1300]},
  smoke: {count: 6, reach: [0.3, 0.6], rise: [0.4, 0.9], life: [900, 1300]},
  bones: {count: 7, reach: [0.45, 0.95], rise: [0.3, 0.7], life: [800, 1100]},
  steam: {count: 7, reach: [0.3, 0.55], rise: [0.9, 1.5], life: [900, 1300]},
  notes: {count: 7, reach: [0.4, 0.9], rise: [0.7, 1.3], life: [950, 1250]},
  clash: {count: 9, reach: [0.4, 0.9], rise: [0.05, 0.2], life: [320, 520]}
};

/**
 * The particles of a landing effect, all starting at the resting die.
 * @param {string} kind     A key of LANDING_PARTS
 * @param {() => number} rand
 * @param {number} [share=1]   Part of the particles, for large throws (at least three stay)
 * @returns {{dx: number, dy: number, dz: number, size: number, delay: number, life: number, spin: number,
 *   hue: number}[]}
 */
export function landingParticles(kind, rand, share = 1) {
  const def = LANDING_PARTS[kind];
  if ( !def ) return [];
  const span = ([a, b]) => a + (rand() * (b - a));
  const count = Math.max(3, Math.round(def.count * share));
  return Array.from({length: count}, (v, i) => {
    const angle = ((i + (rand() * 0.8)) / count) * 2 * Math.PI;
    const reach = span(def.reach);
    return {dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach, dz: span(def.rise), size: 0.7 + (rand() * 0.7),
      delay: rand() * 60, life: span(def.life), spin: (rand() - 0.5) * Math.PI, hue: Math.floor(rand() * 360)};
  });
}

/**
 * The burst on a highest or lowest result: particles flying out from the die, the highest up and out, the lowest
 * sinking down.
 * @param {"max"|"min"} glow
 * @param {number} count
 * @param {() => number} rand
 * @returns {{dx: number, dy: number, dz: number, size: number, delay: number, life: number}[]}
 */
export function burstParticles(glow, count, rand) {
  const out = [];
  for ( let i = 0; i < count; i++ ) {
    const angle = ((i + (rand() * 0.6)) / count) * 2 * Math.PI;
    const reach = (glow === "max") ? 0.9 + (rand() * 0.9) : 0.5 + (rand() * 0.5);
    out.push({
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach,
      dz: (glow === "max") ? 0.6 + (rand() * 1.2) : -0.3 - (rand() * 0.3),
      size: 0.6 + (rand() * 0.8),
      delay: rand() * 90,
      life: (glow === "max") ? 650 + (rand() * 350) : 900 + (rand() * 400)
    });
  }
  return out;
}

/**
 * Fireworks over a die: a few rockets that rise and burst into sparks.
 * @param {() => number} rand
 * @param {number} [rockets=3]
 * @returns {{dx: number, dy: number, delay: number, hue: number, sparks: {angle: number, reach: number}[]}[]}
 */
export function fireworkPlan(rand, rockets = 3) {
  return Array.from({length: rockets}, (v, i) => ({
    dx: (rand() - 0.5) * 1.6,
    dy: -1.1 - (rand() * 0.9),
    delay: (i * 220) + (rand() * 120),
    hue: Math.floor(rand() * 360),
    sparks: Array.from({length: 14}, (w, j) => ({angle: ((j + (rand() * 0.5)) / 14) * 2 * Math.PI,
      reach: 0.6 + (rand() * 0.5)}))
  }));
}

/**
 * Confetti falling over the area: where each piece starts (0 to 1 of the width), when, and how it flutters.
 * @param {() => number} rand
 * @param {number} [count=34]
 * @returns {{x: number, delay: number, drift: number, spin: number, life: number, hue: number}[]}
 */
export function confettiRain(rand, count = 34) {
  return Array.from({length: count}, () => ({x: rand(), delay: rand() * 500, drift: (rand() - 0.5) * 0.25,
    spin: (rand() - 0.5) * 6 * Math.PI, life: 1300 + (rand() * 700), hue: Math.floor(rand() * 360)}));
}

/* -------------------------------------------- */
/*  Light and sampling                          */
/* -------------------------------------------- */

/**
 * Brightness of a face for a turn: light comes from the upper left, in front of the table.
 * @param {number[][]} turn
 * @param {number[]} normal   Face normal in the die
 * @returns {number}   Darkness 0 (lit) to 1
 */
export function shadeOf(turn, normal) {
  const n = apply(turn, normal);
  const lit = Math.max(0, dot(n, LIGHT));
  return Math.min(0.7, Math.max(0, 0.62 - (lit * 0.62)));
}

/** Direction toward the light. */
export const LIGHT = normalize([-0.35, -0.55, 0.76]);

/**
 * Sample a throw for the animation: evenly spaced moments from 0 to 1.
 * @param {object} plan
 * @param {number[][]} resting
 * @param {number} [steps=60]
 * @returns {{t: number, x: number, y: number, z: number, scale: number, turn: number[][]}[]}
 */
export function samplePath(plan, resting, steps = 60) {
  const out = [];
  for ( let i = 0; i <= steps; i++ ) {
    const t = i / steps;
    out.push({t, ...poseAt(plan, resting, t)});
  }
  return out;
}

export const __test__ = {PROFILES, STYLES, randomAxis};
