/**
 * The sound of the dice, made in the browser (Web Audio), no sound files: a click each time a die hits the table,
 * by material (plastic, wood, stone, metal rings, glass chimes), and the sounds of some throw styles (the rattle in a
 * hand or cup, the boom of the cannon, the thud of a slam, the whoosh of a portal). Off by default, each device
 * switches it on for itself.
 */

import {contactTimes} from "./motion.mjs";

/** The audio context, made on first use. */
let audio = null;

/** Noise to shape clicks from, made once. */
let noise = null;

/** At most this many sounds per throw. */
const MAX_SOUNDS = 28;

/**
 * The audio context, woken up if the browser put it to sleep.
 * @returns {AudioContext|null}
 */
function context() {
  try {
    audio ??= new AudioContext();
    if ( audio.state === "suspended" ) audio.resume();
    if ( !noise ) {
      noise = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
      const data = noise.getChannelData(0);
      for ( let i = 0; i < data.length; i++ ) data[i] = (Math.random() * 2) - 1;
    }
    return audio;
  } catch {
    return null;
  }
}

/** How each material sounds when it hits the table: the band of the click, and a ring after it. */
const MATERIALS = {
  plastic: {freq: 1900, q: 1.2, ring: null},
  wood: {freq: 750, q: 1.5, ring: null},
  stone: {freq: 520, q: 1.1, ring: null},
  metal: {freq: 2600, q: 2, ring: {freq: 2450, decay: 0.32}},
  glass: {freq: 3200, q: 3, ring: {freq: 3400, decay: 0.18}}
};

/**
 * The sound family of a material.
 * @param {string} finish
 * @returns {object}
 */
function materialSound(finish) {
  if ( ["metal", "chrome"].includes(finish) ) return MATERIALS.metal;
  if ( ["glass", "crystal", "ice", "frosted", "jade"].includes(finish) ) return MATERIALS.glass;
  if ( ["wood", "parchment"].includes(finish) ) return MATERIALS.wood;
  if ( ["stone", "lava"].includes(finish) ) return MATERIALS.stone;
  return MATERIALS.plastic;
}

/**
 * A short filtered noise, with an optional ring.
 * @param {AudioContext} ctx
 * @param {number} when       Audio time
 * @param {object} options
 */
function click(ctx, when, {freq, q, ring, gain, length = 0.05, type = "bandpass"}) {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(gain, when + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, when + length);
  source.connect(filter).connect(env).connect(ctx.destination);
  source.start(when, Math.random() * 0.4, length + 0.02);
  if ( ring ) {
    const osc = ctx.createOscillator();
    osc.frequency.value = ring.freq * (0.97 + (Math.random() * 0.06));
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(gain * 0.35, when);
    ringGain.gain.exponentialRampToValueAtTime(0.0001, when + ring.decay);
    osc.connect(ringGain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + ring.decay + 0.02);
  }
}

/**
 * A rising or falling whoosh of noise.
 * @param {AudioContext} ctx
 * @param {number} when
 * @param {number} gain
 * @param {number} from     Start frequency
 * @param {number} to       End frequency
 * @param {number} length   Seconds
 */
function whoosh(ctx, when, gain, from, to, length) {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(from, when);
  filter.frequency.exponentialRampToValueAtTime(to, when + length);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(gain, when + (length * 0.4));
  env.gain.linearRampToValueAtTime(0, when + length);
  source.connect(filter).connect(env).connect(ctx.destination);
  source.start(when, 0, length);
}

/**
 * Plan the sounds of a throw.
 * @param {object[]} plans          From planThrow
 * @param {string} finish           Material of the dice
 * @param {object} options
 * @param {number} options.startAt   performance.now() time the throw starts
 * @param {number} options.duration  Milliseconds of the throw
 * @param {number} [options.volume=0.5]
 * @returns {number}   How many sounds were planned
 */
export function playThrowSounds(plans, finish, {startAt, duration, volume = 0.5}) {
  const ctx = context();
  if ( !ctx || !plans.length || (volume <= 0) ) return 0;
  const now = performance.now();
  const audioAt = ms => ctx.currentTime + Math.max(0, (ms - now) / 1000);
  const material = materialSound(finish);
  const style = plans[0].style;
  let count = 0;
  const first = plans[0];
  const begin = startAt + (duration * first.delay);
  // The sounds of the throw style
  if ( (style === "hand") || (style === "cup") ) {
    const release = first.release * duration;
    for ( let i = 0; i < 7; i++ ) {
      click(ctx, audioAt(begin + (release * (0.25 + (i * 0.1)))), {...material, gain: volume * 0.25, ring: null});
      count++;
    }
  }
  if ( style === "cannon" ) {
    for ( const plan of plans.slice(0, 6) ) {
      click(ctx, audioAt(startAt + (duration * plan.delay)), {freq: 140, q: 0.7, gain: volume * 0.9, length: 0.35,
        type: "lowpass"});
      count++;
    }
  }
  if ( (style === "portal") || (style === "teleport") || (style === "vortex") ) {
    whoosh(ctx, audioAt(begin), volume * 0.35, 300, 2400, 0.5);
    count++;
  }
  if ( style === "meteor" ) {
    whoosh(ctx, audioAt(begin), volume * 0.35, 2600, 200, duration * 0.32 / 1000);
    count++;
  }
  // A click each time a die hits the table, softer with each hop
  for ( const plan of plans ) {
    for ( const contact of contactTimes(plan) ) {
      if ( count >= MAX_SOUNDS ) return count;
      const when = startAt + (duration * plan.delay) + (contact.t * duration * (1 - plan.delay));
      const slam = (style === "slam") && (contact.strength === 1);
      click(ctx, audioAt(when), slam
        ? {freq: 90, q: 0.8, gain: volume, length: 0.3, type: "lowpass", ring: null}
        : {...material, gain: volume * contact.strength * 0.8});
      count++;
    }
  }
  return count;
}

/**
 * The volume of interface sounds in Foundry, 0 to 1.
 * @returns {number}
 */
export function interfaceVolume() {
  try {
    const value = game.settings.get("core", "globalInterfaceVolume");
    return Number.isFinite(value) ? value : 0.5;
  } catch {
    return 0.5;
  }
}

export const __test__ = {materialSound, MATERIALS};
