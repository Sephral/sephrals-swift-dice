/**
 * The place where the dice fall: an area beside the chat (or in the middle of the screen) above everything, which
 * never catches the mouse. Each throw gets its own area, built when it starts and removed when its dice are gone, so
 * nothing stays behind after a resize or a sidebar change.
 */

import {planThrow, seededRandom} from "./motion.mjs";
import {playMoment} from "./moments.mjs";
import {playProps} from "./props.mjs";
import {buildAura, buildCore, buildDie, buildInner, placeDie, playDie, playLanding, playTrail} from "./render.mjs";
import {interfaceVolume, playThrowSounds} from "./sound.mjs";

/** Throws on the table, oldest first. */
const throws = [];

/** Up to this many dice the light moves over their faces while they tumble; larger throws keep it still. */
const LIVE_LIGHT_DICE = 4;

/**
 * Every die of a throw carries its effects. Up to this many dice each gets the full number of particles; larger
 * throws share them out, so ten dice cost about as much as four (measured: ten d20 with every effect on a processor
 * slowed down four times).
 */
const FULL_EFFECTS_DICE = 4;

/** Particles of all trails of a throw together. */
const TRAIL_BUDGET = 50;

/** At most this many throws at once; an older one leaves early. */
const MAX_THROWS = 3;

/**
 * The layer of the dice, made on first use.
 * @returns {HTMLElement}
 */
function layer() {
  let root = document.getElementById("ssd-table");
  if ( !root ) {
    root = document.createElement("div");
    root.id = "ssd-table";
    root.setAttribute("aria-hidden", "true");
    document.body.append(root);
  }
  return root;
}

/**
 * Size and place of the area for a number of dice.
 * @param {number} count
 * @param {number} size          Size of a die in pixels
 * @param {"tray"|"center"} placement
 * @returns {{left: number, top: number, width: number, height: number, from: "right"|"bottom"}}
 */
export function areaRect(count, size, placement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = freeRight(vw);
  let width = size * ((2.2 * Math.sqrt(Math.max(1, count) * 1.6)) + 3);
  width = Math.min(width, right * 0.6, 760);
  let height = Math.min(width / 1.6, vh * 0.6);
  if ( placement === "center" ) {
    return {left: (right - width) / 2, top: (vh - height) / 2, width, height, from: "bottom"};
  }
  const left = right - width - 18;
  // Stay above the macro bar when the area reaches over it
  const hotbar = visibleRect(document.getElementById("hotbar"));
  let bottom = vh - 24;
  if ( hotbar && (hotbar.right > left) && (hotbar.left < right) ) bottom = Math.min(bottom, hotbar.top - 12);
  height = Math.min(height, bottom * 0.7);
  return {left, top: bottom - height, width, height, from: "right"};
}

/**
 * The left edge of the chat on the right: the sidebar when it shows the chat, otherwise the column where Foundry
 * pops up new chat messages.
 * @param {number} vw
 * @returns {number}
 */
function freeRight(vw) {
  const sidebar = visibleRect(document.getElementById("sidebar"));
  const notes = visibleRect(document.getElementById("chat-notifications"));
  const tab = ui.sidebar?.tabGroups?.primary ?? ui.sidebar?.activeTab;
  const chatOpen = !!ui.sidebar?.expanded && (tab === "chat");
  let right = (sidebar && (sidebar.left > vw * 0.4)) ? sidebar.left : vw;
  if ( !chatOpen && notes && (notes.left > vw * 0.4) ) right = Math.min(right, notes.left);
  return right;
}

/**
 * Move the area of a new throw next to the throws still on the table, so quick rolls in a row (attack, then damage)
 * do not land on each other: beside the chat they stack upward, then to the left; in the middle they go left,
 * right, up and down.
 * @param {object} rect   From areaRect
 * @param {"tray"|"center"} placement
 * @returns {object}
 */
export function freeSpot(rect, placement) {
  const taken = throws.filter(e => !e.leaving).map(e => e.rect);
  if ( !taken.length ) return rect;
  const gap = 8;
  const dx = rect.width + gap;
  const dy = rect.height + gap;
  const steps = (placement === "center")
    ? [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1]]
    : [[0, 0], [0, -1], [0, -2], [-1, 0], [-1, -1], [-1, -2]];
  const overlaps = (a, b) => (a.left < b.left + b.width) && (b.left < a.left + a.width)
    && (a.top < b.top + b.height) && (b.top < a.top + a.height);
  for ( const [sx, sy] of steps ) {
    const spot = {...rect, left: rect.left + (sx * dx), top: rect.top + (sy * dy)};
    const inside = (spot.left >= 0) && (spot.top >= 0) && (spot.left + spot.width <= window.innerWidth)
      && (spot.top + spot.height <= window.innerHeight);
    if ( inside && !taken.some(other => overlaps(spot, other)) ) return spot;
  }
  return rect;
}

/**
 * The box of an element on the screen, or null when it is not shown.
 * @param {HTMLElement|null} el
 * @returns {DOMRect|null}
 */
function visibleRect(el) {
  const rect = el?.getBoundingClientRect();
  return (rect && (rect.width > 0) && (rect.height > 0)) ? rect : null;
}

/**
 * Throw dice onto the table.
 * @param {object[]} dice   From diceToThrow, each with its look
 * @param {object} options
 * @param {string} options.seed           Same seed, same throw in every browser
 * @param {number} options.startAt        performance.now() time the throw starts
 * @param {number} options.duration       Milliseconds of the throw
 * @param {number} options.size           Die size in pixels
 * @param {"tray"|"center"} options.placement
 * @param {number} options.linger         Seconds the dice stay after landing
 * @param {number} [options.extra=0]      Dice rolled but not drawn
 * @param {boolean} [options.reducedMotion=false]
 * @param {{glow: boolean, trails: boolean, bursts: boolean}} [options.effects]   Which light and particle effects play
 * @param {string} [options.style="classic"]   How the dice reach the table (the thrower's throw style)
 * @param {boolean} [options.sounds=false]      Play the sounds of the dice
 * @param {(event: string, data?: object) => void} [options.onEvent]
 * @returns {object|null}   The throw, or null when it came too late
 */
export function throwDice(dice, {seed, startAt, duration, size, placement, linger, extra = 0, reducedMotion = false,
  effects = {glow: true, trails: true, bursts: true}, style = "classic", sounds = false, onEvent = () => {}}) {
  const now = performance.now();
  const landAt = startAt + duration;
  if ( !dice.length || (now >= landAt) ) return null;
  while ( throws.length >= MAX_THROWS ) leave(throws[0], 0);

  const rect = freeSpot(areaRect(dice.length, size, placement), placement);
  const area = document.createElement("div");
  area.className = `ssd-area ssd-${placement}`;
  Object.assign(area.style, {left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`,
    height: `${rect.height}px`});
  area.style.setProperty("--ssd-size", `${size}px`);
  area.dataset.seed = seed;
  if ( !effects.glow ) area.classList.add("ssd-calm");

  const rand = seededRandom(seed);
  // Throw styles are part of the effects: a screen without them throws the classic way, to the same places
  const throwStyle = (effects.glow && !reducedMotion) ? style : "classic";
  const plans = planThrow(dice.length, {rand, aspect: rect.width / rect.height, from: rect.from, style: throwStyle});
  const unit = size / 2;
  const delay = startAt - now;
  const entry = {seed, area, rect, animations: [], timers: [], dice: []};
  // Effects draw their own random numbers, so switching them does not change the throw
  const fxRand = seededRandom(`${seed}:fx`);
  const moving = !reducedMotion;
  const perDie = Math.max(3, Math.min(12, Math.floor(TRAIL_BUDGET / dice.length)));
  const share = Math.min(1, FULL_EFFECTS_DICE / dice.length);
  const box = {width: rect.width, height: rect.height, unit};
  const moments = new Set();

  dice.forEach((die, i) => {
    const plan = plans[i];
    const shadow = document.createElement("div");
    shadow.className = "ssd-shadow";
    const halo = document.createElement("div");
    halo.className = die.glow ? `ssd-halo ssd-glow-${die.glow}` : "ssd-halo";
    const lit = effects.glow && moving && (die.look.glow ?? "none") !== "none";
    const built = buildDie(die, die.look, {unit, covered: die.covered, rand, spin: plan.spin, glow: effects.glow});
    if ( die.faded ) built.element.classList.add("ssd-faded");
    let aura = null;
    if ( lit ) {
      aura = document.createElement("div");
      aura.className = `ssd-aura ssd-aura-${die.look.glow}`;
      aura.style.setProperty("--ssd-glowc", die.look.glowColor);
      area.append(aura);
    }
    const inner = buildInner(die.look);
    const core = buildCore(die.look, {size, animate: moving && effects.glow});
    const fx = (moving && effects.glow) ? buildAura(die.look, fxRand, size, share) : null;
    if ( fx?.table ) area.append(fx.table);
    area.append(shadow, halo);
    if ( inner ) area.append(inner);
    area.append(built.element);
    if ( core ) area.append(core);
    if ( fx?.around ) area.append(fx.around);
    halo.style.transform = `translate(${plan.end.x * rect.width}px, ${plan.end.y * rect.height}px)`;
    const animations = reducedMotion
      ? placeDie(built, shadow, plan, {...box, delay: delay + duration, core, inner})
      : playDie(built, shadow, plan, {...box, duration, delay, aura, glow: die.look.glow, core, fx, inner,
        liveLight: dice.length <= LIVE_LIGHT_DICE});
    if ( moving && effects.glow ) {
      animations.push(...playLanding(area, plan, die.look, {...box, at: delay + duration, rand: fxRand, share}));
    }
    if ( moving && effects.trails && (die.look.trail ?? "none") !== "none" ) {
      animations.push(...playTrail(area, plan, die.look, {...box, duration, delay, count: perDie, rand: fxRand}));
    }
    // The big moment of a triumph or a fumble, in the way the thrower picked: each moment once per throw, every die
    // that counts glows (a pool with three sixes does not set off three fireworks)
    const moment = die.glow ? `${die.glow}:${(die.glow === "max") ? die.look.triumph : die.look.fumble}` : null;
    if ( moving && effects.bursts && moment && !moments.has(moment) ) {
      moments.add(moment);
      animations.push(...playMoment(area, layer(), plan, die, {...box, at: delay + duration, rand: fxRand}));
    }
    entry.animations.push(...animations);
    entry.dice.push({built, shadow, halo, aura, core, inner, fx, die});
  });

  // The hand, cup, cannon, vortex, portal, flashes or streaks of the throw style
  if ( moving && (throwStyle !== "classic") ) {
    entry.animations.push(...playProps(area, plans, dice[0].look, {...box, duration, delay, from: rect.from}));
  }
  if ( sounds && moving ) {
    entry.sounds = playThrowSounds(plans, dice[0].look?.finish, {startAt, duration, volume: interfaceVolume()});
  }

  if ( extra > 0 ) {
    const more = document.createElement("div");
    more.className = "ssd-more";
    more.textContent = `+${extra}`;
    area.append(more);
    entry.more = more;
  }

  layer().append(area);
  throws.push(entry);

  // Landing: faded dice dim, triumphs and fumbles glow
  entry.timers.push(setTimeout(() => land(entry), Math.max(0, landAt - performance.now())));
  entry.timers.push(setTimeout(() => leave(entry), Math.max(0, landAt - performance.now()) + (linger * 1000)));
  entry.style = throwStyle;
  onEvent("thrown", {seed, dice: dice.length, extra, style: throwStyle, late: Math.max(0, Math.round(-delay))});
  return entry;
}

/**
 * The dice have landed.
 * @param {object} entry
 */
function land(entry) {
  entry.landed = true;
  for ( const {built, halo, die} of entry.dice ) {
    if ( die.faded ) {
      for ( const face of built.faces ) face.element.animate([{opacity: 1}, {opacity: 0.38}],
        {duration: 260, fill: "forwards", easing: "ease-out"});
    }
    if ( die.glow ) halo.classList.add("ssd-lit");
  }
  entry.more?.classList.add("ssd-lit");
}

/**
 * Take a throw off the table.
 * @param {object} entry
 * @param {number} [fade=420]   Milliseconds of the fade out
 */
function leave(entry, fade = 420) {
  const index = throws.indexOf(entry);
  if ( index >= 0 ) throws.splice(index, 1);
  for ( const timer of entry.timers ) clearTimeout(timer);
  entry.timers = [];
  if ( fade <= 0 ) {
    entry.area.remove();
    return;
  }
  for ( const {built, shadow, halo, aura, core, inner, fx} of entry.dice ) {
    inner?.animate([{}, {opacity: 0}], {duration: fade, fill: "forwards"});
    for ( const el of [fx?.table, fx?.around] ) el?.animate([{}, {opacity: 0}], {duration: fade, fill: "forwards"});
    for ( const face of built.faces ) face.element.animate([{}, {opacity: 0}], {duration: fade, fill: "forwards"});
    shadow.animate([{}, {opacity: 0}], {duration: fade, fill: "forwards"});
    aura?.animate([{}, {opacity: 0}], {duration: fade, fill: "forwards"});
    core?.animate([{}, {opacity: 0}], {duration: fade, fill: "forwards"});
    halo.classList.remove("ssd-lit");
  }
  entry.more?.remove();
  setTimeout(() => entry.area.remove(), fade + 40);
}

/**
 * Take every throw off the table at once.
 */
export function clearTable() {
  for ( const entry of [...throws] ) leave(entry, 0);
}

/**
 * How many throws are on the table.
 * @returns {number}
 */
export function throwsOnTable() {
  return throws.length;
}

/**
 * The throws on the table (for the debug file).
 * @returns {{seed: string, dice: number, landed: boolean}[]}
 */
export function tableState() {
  return throws.map(e => ({seed: e.seed, dice: e.dice.length, style: e.style, sounds: e.sounds ?? 0, landed: !!e.landed}));
}
