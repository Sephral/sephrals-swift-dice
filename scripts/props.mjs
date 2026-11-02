/**
 * What comes with a throw style: the hand that shakes and throws the dice, the cup that tips them out, the flash and
 * smoke of the cannon, the vortex and the portal they come out of, the flashes of a teleport, the burning streaks
 * of meteors, the table shaking under a slam, the bow, the wind and the beam of light. Web Animations on transform
 * and opacity, timed to the throw. They shine in the user's color for the throw, or the color of the light.
 */

import {paintEffect} from "./colors.mjs";
import {positionAt} from "./motion.mjs";

/**
 * Format a number for CSS.
 * @param {number} n
 * @returns {string}
 */
const px = n => `${Math.round(n * 100) / 100}px`;

/**
 * Play the props of a throw.
 * @param {HTMLElement} area
 * @param {object[]} plans      From planThrow, all in the same style
 * @param {object} look         The thrower's look (glow color for portal and teleport)
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.unit
 * @param {number} options.duration   Milliseconds of the throw
 * @param {number} options.delay      Milliseconds until it starts
 * @param {"right"|"bottom"} options.from
 * @returns {Animation[]}
 */
export function playProps(area, plans, look, {width, height, unit, duration, delay, from}) {
  const style = plans[0]?.style;
  const play = PROPS[style];
  if ( !play ) return [];
  const ctx = {area, plans, look, width, height, unit, duration, delay, from, size: unit * 2, lift: unit * 2.4,
    rest: unit * 0.95,
    // Milliseconds from now to a moment (0 to 1) of a die's own throw
    at: (plan, t) => delay + (duration * plan.delay) + (t * duration * (1 - plan.delay)),
    make(cls) {
      const el = document.createElement("div");
      el.className = cls;
      paintEffect(el, look, "throw");
      el.style.setProperty("--ssd-body", look.body);
      el.style.setProperty("--ssd-light", look.light);
      el.style.setProperty("--ssd-dark", look.dark);
      area.append(el);
      return el;
    }
  };
  return play(ctx);
}

/**
 * The angle (degrees) from a point toward the middle of the area.
 * @param {{x: number, y: number}} p
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function towardMiddle(p, width, height) {
  return Math.atan2((0.5 - p.y) * height, (0.5 - p.x) * width) * 180 / Math.PI;
}

const PROPS = {
  /** A fist shakes the dice, opens and throws them, then leaves. */
  hand({plans, width, height, unit, duration, delay, lift, make}) {
    const plan = plans[0];
    const at = {x: plan.hold.x * width, y: plan.hold.y * height, z: plan.hold.z * lift};
    const angle = towardMiddle(plan.hold, width, height);
    const away = {x: -Math.cos(angle * Math.PI / 180) * unit * 3, y: -Math.sin(angle * Math.PI / 180) * unit * 3};
    const hand = make("ssd-prop-hand");
    hand.style.setProperty("--ssd-size", px(unit * 2));
    const fist = document.createElement("i");
    fist.className = "fa-solid fa-hand-back-fist ssd-fist";
    const open = document.createElement("i");
    open.className = "fa-solid fa-hand ssd-open";
    hand.append(fist, open);
    const release = plan.release * duration;
    const total = release + (duration * 0.32);
    const o = ms => Math.min(1, Math.max(0, ms / total));
    // Below the dice it holds: Firefox sorts flat things in 3D by their middle, the hand must not come in front
    const pose = (dx, dy, turn, s = 1) => `translate3d(${px(at.x + dx)}, ${px(at.y + dy)}, ${px(at.z - (unit * 0.4))}) `
      + `rotate(${Math.round(angle + 90 + turn)}deg) scale(${s})`;
    const shake = [];
    for ( let i = 1; i <= 5; i++ ) {
      shake.push({transform: pose(0, (i % 2 ? -1 : 1) * unit * 0.25, (i % 2 ? -9 : 9)), offset: o(release * (0.25 + (i * 0.12)))});
    }
    const thrust = {x: Math.cos(angle * Math.PI / 180) * unit * 1.2, y: Math.sin(angle * Math.PI / 180) * unit * 1.2};
    return [
      hand.animate([
        {transform: pose(away.x, away.y, -20, 0.8), opacity: 0},
        {transform: pose(0, 0, 0), opacity: 1, offset: o(release * 0.22)},
        ...shake,
        {transform: pose(-thrust.x * 0.4, -thrust.y * 0.4, -14), offset: o(release * 0.92)},
        {transform: pose(thrust.x, thrust.y, 18), offset: o(release + 60)},
        {transform: pose(thrust.x * 0.6, thrust.y * 0.6, 8), opacity: 1, offset: o(release + 180)},
        {transform: pose(away.x, away.y, -10, 0.8), opacity: 0}
      ], {duration: total, delay, fill: "both", easing: "ease-in-out"}),
      fist.animate([{opacity: 1}, {opacity: 1, offset: o(release)}, {opacity: 0, offset: o(release + 40)}, {opacity: 0}],
        {duration: total, delay, fill: "both"}),
      open.animate([{opacity: 0}, {opacity: 0, offset: o(release)}, {opacity: 1, offset: o(release + 40)}, {opacity: 1}],
        {duration: total, delay, fill: "both"})
    ];
  },

  /** A leather cup is shaken and tipped over, the dice spill out. */
  cup({plans, width, height, unit, duration, delay, lift, make}) {
    const plan = plans[0];
    const at = {x: plan.hold.x * width, y: plan.hold.y * height, z: (plan.hold.z * lift) + (unit * 0.4)};
    const angle = towardMiddle(plan.hold, width, height);
    const cup = make("ssd-prop-cup");
    cup.style.setProperty("--ssd-size", px(unit * 2));
    cup.append(document.createElement("b"));
    const release = plan.release * duration;
    const total = release + (duration * 0.4);
    const o = ms => Math.min(1, Math.max(0, ms / total));
    // Upright the opening points up the screen (-90 degrees); tipped it points to the middle of the area
    const tip = angle + 90;
    const back = {x: -Math.cos(angle * Math.PI / 180) * unit * 3.5, y: -Math.sin(angle * Math.PI / 180) * unit * 3.5};
    const pose = (dx, dy, turn) => `translate3d(${px(at.x + dx)}, ${px(at.y + dy)}, ${px(at.z)}) rotate(${Math.round(turn)}deg)`;
    const frames = [{transform: pose(back.x, back.y, 0), opacity: 0}, {transform: pose(0, 0, 0), opacity: 1, offset: o(release * 0.2)}];
    for ( let i = 1; i <= 6; i++ ) frames.push({transform: pose(0, (i % 2 ? -1 : 1) * unit * 0.15, (i % 2 ? -14 : 14)), offset: o(release * (0.2 + (i * 0.1)))});
    frames.push({transform: pose(0, 0, tip * 0.35), offset: o(release * 0.9)});
    frames.push({transform: pose(0, 0, tip), offset: o(release + 40)});
    frames.push({transform: pose(0, 0, tip), opacity: 1, offset: o(release + 260)});
    frames.push({transform: pose(back.x * 0.6, back.y * 0.6, tip * 0.6), opacity: 0});
    return [cup.animate(frames, {duration: total, delay, fill: "both", easing: "ease-in-out"})];
  },

  /** Each die leaves the muzzle with a flash and a puff of smoke. */
  cannon({plans, width, height, unit, lift, at, make}) {
    const out = [];
    const muzzle = plans[0].launch;
    const angle = towardMiddle(muzzle, width, height);
    const mz = `translate3d(${px(muzzle.x * width)}, ${px(muzzle.y * height)}, ${px(plans[0].height * lift)})`;
    const barrel = make("ssd-prop-barrel");
    barrel.style.setProperty("--ssd-size", px(unit * 2));
    const last = Math.max(...plans.map(p => at(p, 0)));
    out.push(barrel.animate([
      {transform: `${mz} rotate(${Math.round(angle)}deg) translateX(${px(unit * 0.6)}) scale(0.6)`, opacity: 0},
      {transform: `${mz} rotate(${Math.round(angle)}deg) translateX(${px(-unit * 0.6)}) scale(1)`, opacity: 1, offset: 0.2},
      {transform: `${mz} rotate(${Math.round(angle)}deg) translateX(${px(-unit * 0.6)}) scale(1)`, opacity: 1, offset: 0.85},
      {transform: `${mz} rotate(${Math.round(angle)}deg) translateX(${px(unit * 1.5)}) scale(0.8)`, opacity: 0}
    ], {duration: last + 700 - Math.min(...plans.map(p => at(p, 0))) + 300, delay: Math.min(...plans.map(p => at(p, 0))) - 300,
      fill: "both"}));
    for ( const plan of plans ) {
      const fire = at(plan, 0);
      const flash = make("ssd-prop-flash");
      flash.style.setProperty("--ssd-size", px(unit * 2));
      const smoke = make("ssd-prop-smoke");
      smoke.style.setProperty("--ssd-size", px(unit * 2));
      out.push(flash.animate([{transform: `${mz} scale(0.2)`, opacity: 1}, {transform: `${mz} scale(1.5)`, opacity: 0}],
        {duration: 160, delay: fire, easing: "ease-out"}));
      out.push(smoke.animate([
        {transform: `${mz} scale(0.4)`, opacity: 0.8},
        {transform: `${mz} translate(${px(-unit * 0.8)}, ${px(-unit * 1.2)}) scale(2.2)`, opacity: 0}
      ], {duration: 900, delay: fire, easing: "ease-out"}));
    }
    return out;
  },

  /** The dice hit the table so hard that it shakes, with a ring of dust under each. */
  slam({area, plans, unit, at, make, width, height}) {
    const out = [];
    const first = Math.min(...plans.map(p => at(p, 0.16)));
    const k = unit * 0.14;
    out.push(area.animate([
      {transform: "translate(0, 0)"}, {transform: `translate(${px(k)}, ${px(-k)})`}, {transform: `translate(${px(-k)}, ${px(k * 0.7)})`},
      {transform: `translate(${px(k * 0.6)}, ${px(k * 0.4)})`}, {transform: `translate(${px(-k * 0.3)}, ${px(-k * 0.2)})`},
      {transform: "translate(0, 0)"}
    ], {duration: 260, delay: first, easing: "linear"}));
    for ( const plan of plans ) {
      const ring = make("ssd-prop-impact");
      ring.style.setProperty("--ssd-size", px(unit * 2));
      const p = `translate3d(${px(plan.end.x * width)}, ${px(plan.end.y * height)}, 1px)`;
      out.push(ring.animate([{transform: `${p} scale(0.3)`, opacity: 0.9}, {transform: `${p} scale(2.2)`, opacity: 0}],
        {duration: 520, delay: at(plan, 0.16), easing: "ease-out"}));
    }
    return out;
  },

  /** A whirl on the table throws the dice up and around. */
  vortex({plans, width, height, unit, duration, delay, make}) {
    const v = make("ssd-prop-vortex");
    const size = Math.min(width, height) * 0.9;
    v.style.setProperty("--ssd-v", px(size));
    const c = `translate3d(${px(plans[0].launch.x * width)}, ${px(plans[0].launch.y * height)}, 1px)`;
    return [v.animate([
      {transform: `${c} rotate(0deg) scale(0.3)`, opacity: 0},
      {transform: `${c} rotate(200deg) scale(1)`, opacity: 0.9, offset: 0.15},
      {transform: `${c} rotate(700deg) scale(1)`, opacity: 0.7, offset: 0.6},
      {transform: `${c} rotate(900deg) scale(0.6)`, opacity: 0}
    ], {duration: duration * 0.85, delay, fill: "both", easing: "linear"})];
  },

  /** A portal opens in the air, the dice come out of it, it closes. */
  portal({plans, width, height, unit, duration, delay, lift, make}) {
    const portal = make("ssd-prop-portal");
    portal.style.setProperty("--ssd-size", px(unit * 2));
    portal.append(document.createElement("b"));
    const p = plans[0];
    const pos = `translate3d(${px(p.launch.x * width)}, ${px(p.launch.y * height)}, ${px(p.height * lift)})`;
    return [portal.animate([
      {transform: `${pos} scale(0, 0)`, opacity: 0},
      {transform: `${pos} scale(1.1, 0.9)`, opacity: 1, offset: 0.12},
      {transform: `${pos} scale(1, 1)`, opacity: 1, offset: 0.4},
      {transform: `${pos} scale(0, 0.2)`, opacity: 0}
    ], {duration: duration * 0.6, delay: delay - (duration * 0.06), fill: "both", easing: "ease-in-out"})];
  },

  /** Each die appears in a flash at its place. */
  teleport({plans, width, height, unit, at, make}) {
    const out = [];
    for ( const plan of plans ) {
      const flash = make("ssd-prop-blink");
      flash.style.setProperty("--ssd-size", px(unit * 2));
      const p = `translate3d(${px(plan.end.x * width)}, ${px(plan.end.y * height)}, ${px(unit)})`;
      out.push(flash.animate([
        {transform: `${p} scale(0.2) rotate(0deg)`, opacity: 0},
        {transform: `${p} scale(1.4) rotate(45deg)`, opacity: 1, offset: 0.35},
        {transform: `${p} scale(0.4) rotate(90deg)`, opacity: 0}
      ], {duration: 420, delay: at(plan, 0) - 120, easing: "ease-out"}));
    }
    return out;
  },

  /** A bow is drawn and loosed once per die, each die flies off with a thin streak of wind. */
  bow({plans, width, height, unit, lift, at, make}) {
    const out = [];
    const nock = plans[0].launch;
    const angle = towardMiddle(nock, width, height);
    const spot = `translate3d(${px(nock.x * width)}, ${px(nock.y * height)}, ${px(plans[0].height * lift)})`;
    const bow = make("ssd-prop-bow");
    bow.style.setProperty("--ssd-size", px(unit * 2));
    bow.append(Object.assign(document.createElement("b"), {className: "fa-solid fa-bow-arrow"}));
    const first = Math.min(...plans.map(p => at(p, 0)));
    const last = Math.max(...plans.map(p => at(p, 0)));
    const total = (last - first) + 900;
    const o = ms => Math.min(1, Math.max(0, ms / total));
    // Upright the icon points up and right; turned so the arrow points to the middle of the area
    const pose = (back, s) => `${spot} rotate(${Math.round(angle + 45)}deg) translate(${px(-back)}, ${px(back)}) scale(${s})`;
    const frames = [{transform: pose(0, 0.6), opacity: 0, offset: 0}, {transform: pose(0, 1), opacity: 1, offset: o(250)}];
    for ( const plan of plans ) {
      const shot = at(plan, 0) - first + 300;
      frames.push({transform: pose(unit * 0.35, 1), opacity: 1, offset: o(shot - 120)});
      frames.push({transform: pose(-unit * 0.1, 1.05), opacity: 1, offset: o(shot + 30)});
      frames.push({transform: pose(0, 1), opacity: 1, offset: o(shot + 140)});
    }
    frames.push({transform: pose(0, 0.8), opacity: 0, offset: 1});
    frames.sort((a, b) => a.offset - b.offset);
    out.push(bow.animate(frames, {duration: total, delay: first - 300, fill: "both", easing: "ease-out"}));
    for ( const plan of plans ) {
      const streak = make("ssd-prop-whoosh");
      streak.style.setProperty("--ssd-size", px(unit * 2));
      const travel = Math.atan2((plan.end.y - plan.start.y) * height, (plan.end.x - plan.start.x) * width) * 180 / Math.PI;
      const frames2 = [];
      for ( let i = 0; i <= 6; i++ ) {
        const pos = positionAt(plan, (i / 6) * 0.3);
        frames2.push({transform: `translate3d(${px(pos.x * width)}, ${px(pos.y * height)}, ${px(unit * 0.95 + (pos.z * lift))}) `
          + `rotate(${Math.round(travel)}deg)`, opacity: (i === 6) ? 0 : 0.9, offset: i / 6});
      }
      const start = at(plan, 0);
      out.push(streak.animate(frames2, {duration: at(plan, 0.3) - start, delay: start, fill: "backwards", easing: "linear"}));
    }
    return out;
  },

  /** A gust of wind sweeps over the table and carries the dice in. */
  gust({plans, width, height, unit, duration, delay, make}) {
    const out = [];
    const from = plans[0].start;
    const angle = Math.atan2((0.5 - from.y) * height, (0.5 - from.x) * width) * 180 / Math.PI;
    for ( let i = 0; i < 5; i++ ) {
      const line = make("ssd-prop-wind");
      line.style.setProperty("--ssd-size", px(unit * 2));
      const offset = (i - 2) * 0.13;
      const y0 = (0.5 + offset) * height;
      const along = d => `translate3d(${px(width * 0.5 + (Math.cos(angle * Math.PI / 180) * d))}, `
        + `${px(y0 + (Math.sin(angle * Math.PI / 180) * d))}, ${px(unit * (1.2 + (i % 2)))}) rotate(${Math.round(angle)}deg)`;
      out.push(line.animate([
        {transform: `${along(-width * 0.7)} scaleX(0.4)`, opacity: 0},
        {transform: `${along(-width * 0.1)} scaleX(1)`, opacity: 0.8, offset: 0.45},
        {transform: `${along(width * 0.6)} scaleX(0.6)`, opacity: 0}
      ], {duration: duration * 0.75, delay: delay + (i * duration * 0.05), fill: "backwards", easing: "ease-in-out"}));
    }
    return out;
  },

  /** A beam of light falls on every place a die sinks to, and fades when it rests. */
  beam({plans, width, height, unit, at, make}) {
    return plans.map(plan => {
      const beam = make("ssd-prop-beam");
      beam.style.setProperty("--ssd-size", px(unit * 2));
      const p = `translate3d(${px(plan.end.x * width)}, ${px(plan.end.y * height)}, 1px)`;
      const start = at(plan, 0);
      const end = at(plan, 0.75);
      return beam.animate([
        {transform: `${p} scaleX(0.2)`, opacity: 0},
        {transform: `${p} scaleX(1)`, opacity: 0.9, offset: 0.2},
        {transform: `${p} scaleX(1)`, opacity: 0.8, offset: 0.75},
        {transform: `${p} scaleX(0.4)`, opacity: 0}
      ], {duration: (end - start) + 500, delay: start - 120, fill: "backwards", easing: "ease-out"});
    });
  },

  /** Meteors burn a streak behind them and leave a crater. */
  meteor({plans, width, height, unit, lift, rest, at, make}) {
    const out = [];
    for ( const plan of plans ) {
      const streak = make("ssd-prop-streak");
      streak.style.setProperty("--ssd-size", px(unit * 2));
      const angle = Math.atan2((plan.end.y - plan.start.y) * height, (plan.end.x - plan.start.x) * width) * 180 / Math.PI;
      const hit = 0.32;
      const frames = [];
      for ( let i = 0; i <= 8; i++ ) {
        const t = (i / 8) * hit;
        const pos = positionAt(plan, t);
        frames.push({transform: `translate3d(${px(pos.x * width)}, ${px(pos.y * height)}, ${px(rest + (pos.z * lift))}) `
          + `rotate(${Math.round(angle)}deg)`, opacity: (i === 8) ? 0 : 1, offset: i / 8});
      }
      const start = at(plan, 0);
      out.push(streak.animate(frames, {duration: at(plan, hit) - start, delay: start, fill: "backwards", easing: "linear"}));
      const crater = make("ssd-land-crater");
      crater.style.setProperty("--ssd-size", px(unit * 2));
      const c = `translate3d(${px(plan.end.x * width)}, ${px(plan.end.y * height)}, 1px)`;
      out.push(crater.animate([
        {transform: `${c} scale(0.4)`, opacity: 0},
        {transform: `${c} scale(1)`, opacity: 0.85, offset: 0.1},
        {transform: `${c} scale(1.05)`, opacity: 0}
      ], {duration: 2200, delay: at(plan, hit), easing: "ease-out"}));
    }
    return out;
  }
};
