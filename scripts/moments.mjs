/**
 * The big moments of a die: what happens on a triumph (a burst of gold, fireworks, confetti, a ray of light from
 * above, a crown, golden edges of the screen, applause with roses, a ring of flowers, a smiting hammer, a roar) or a
 * fumble (a red burst sinking, cracks in the table, a skull, a rain cloud, black smoke, red edges of the screen,
 * wilting leaves, a spell that fizzles). What counts as a triumph or a fumble depends on the game (systems.mjs).
 * Each user picks theirs in "My dice".
 */

import {confettiRain, fireworkPlan} from "./motion.mjs";
import {playBurst} from "./render.mjs";

/**
 * Format a number for CSS.
 * @param {number} n
 * @returns {string}
 */
const px = n => `${Math.round(n * 100) / 100}px`;

/**
 * Play the moment of a die that landed on a triumph or a fumble.
 * @param {HTMLElement} area
 * @param {HTMLElement} layer     The full screen dice layer, for the edges of the screen
 * @param {object} plan
 * @param {object} die            From diceToThrow, with glow "max" (triumph) or "min" (fumble) and its look
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.unit
 * @param {number} options.at     Milliseconds until the die lands
 * @param {() => number} options.rand
 * @returns {Animation[]}
 */
export function playMoment(area, layer, plan, die, {width, height, unit, at, rand}) {
  const kind = (die.glow === "max") ? (die.look?.triumph ?? "burst") : (die.look?.fumble ?? "sink");
  if ( kind === "none" ) return [];
  if ( (kind === "burst") || (kind === "sink") ) {
    return playBurst(area, plan, die.glow, {width, height, unit, at, count: (die.glow === "max") ? 22 : 14, rand});
  }
  const ctx = {area, layer, die, rand, unit, at, size: unit * 2, rest: unit * 0.95,
    x: plan.end.x * width, y: plan.end.y * height, width, height,
    make(cls, parent = area) {
      const el = document.createElement("i");
      el.className = cls;
      el.style.setProperty("--ssd-size", px(unit * 2));
      el.style.setProperty("--ssd-glowc", die.look?.glowColor ?? "#ffd66b");
      parent.append(el);
      return el;
    }
  };
  if ( kind === "vignette" ) return vignette(ctx, die.glow);
  return MOMENTS[kind]?.(ctx) ?? [];
}

/**
 * The edges of the screen light up gold or red for a moment.
 * @param {object} ctx
 * @param {"max"|"min"} glow
 * @returns {Animation[]}
 */
function vignette({layer, make, at}, glow) {
  const v = make(`ssd-vignette ssd-vignette-${glow}`, layer);
  const animation = v.animate([{opacity: 0}, {opacity: 1, offset: 0.2}, {opacity: 0.7, offset: 0.5}, {opacity: 0}],
    {duration: 1500, delay: at, easing: "ease-out"});
  animation.finished.then(() => v.remove()).catch(() => v.remove());
  return [animation];
}

const MOMENTS = {
  /** Rockets rise from the die and burst into colored sparks. */
  fireworks({make, rand, x, y, size, rest, at}) {
    const out = [];
    for ( const rocket of fireworkPlan(rand) ) {
      const top = {x: x + (rocket.dx * size), y: y + (rocket.dy * size), z: rest + (size * 1.6)};
      const r = make("ssd-moment-rocket");
      r.style.setProperty("--ssd-h", String(rocket.hue));
      out.push(r.animate([
        {transform: `translate3d(${px(x)}, ${px(y)}, ${px(rest)})`, opacity: 1},
        {transform: `translate3d(${px(top.x)}, ${px(top.y)}, ${px(top.z)})`, opacity: 1, offset: 0.95},
        {transform: `translate3d(${px(top.x)}, ${px(top.y)}, ${px(top.z)})`, opacity: 0}
      ], {duration: 480, delay: at + rocket.delay, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)"}));
      for ( const spark of rocket.sparks ) {
        const s = make("ssd-moment-spark");
        s.style.setProperty("--ssd-h", String(rocket.hue));
        const to = {x: top.x + (Math.cos(spark.angle) * spark.reach * size), y: top.y + (Math.sin(spark.angle) * spark.reach * size)};
        out.push(s.animate([
          {transform: `translate3d(${px(top.x)}, ${px(top.y)}, ${px(top.z)}) scale(1)`, opacity: 1},
          {transform: `translate3d(${px(to.x)}, ${px(to.y + (size * 0.3))}, ${px(top.z - (size * 0.4))}) scale(0.4)`, opacity: 0}
        ], {duration: 800, delay: at + rocket.delay + 460, easing: "cubic-bezier(0.1, 0.7, 0.4, 1)"}));
      }
    }
    return out;
  },

  /** Confetti rains over the whole area. */
  confetti({make, rand, width, height, at}) {
    return confettiRain(rand).map(p => {
      const c = make("ssd-moment-confetti");
      c.style.setProperty("--ssd-h", String(p.hue));
      const x = p.x * width;
      return c.animate([
        {transform: `translate3d(${px(x)}, ${px(-height * 0.2)}, 40px) rotate(0rad)`, opacity: 0},
        {opacity: 1, offset: 0.1},
        {transform: `translate3d(${px(x + (p.drift * width))}, ${px(height * 0.5)}, 30px) rotate(${(p.spin / 2).toFixed(2)}rad)`, offset: 0.55},
        {transform: `translate3d(${px(x - (p.drift * width * 0.5))}, ${px(height * 1.05)}, 10px) rotate(${p.spin.toFixed(2)}rad)`, opacity: 0}
      ], {duration: p.life, delay: at + p.delay, easing: "linear"});
    });
  },

  /** A ray of light falls on the die from above. */
  rays({make, x, y, at}) {
    const ray = make("ssd-moment-ray");
    return [ray.animate([
      {transform: `translate3d(${px(x)}, ${px(y)}, 2px) scaleY(0)`, opacity: 0},
      {transform: `translate3d(${px(x)}, ${px(y)}, 2px) scaleY(1)`, opacity: 1, offset: 0.2},
      {transform: `translate3d(${px(x)}, ${px(y)}, 2px) scaleY(1)`, opacity: 0.8, offset: 0.7},
      {transform: `translate3d(${px(x)}, ${px(y)}, 2px) scaleY(1)`, opacity: 0}
    ], {duration: 2000, delay: at, easing: "ease-out"})];
  },

  /** A crown appears above the die, shines and floats away. */
  crown({make, x, y, size, rest, at}) {
    const crown = make("ssd-moment-crown");
    crown.append(Object.assign(document.createElement("b"), {className: "fa-solid fa-crown"}));
    const p = (dy, s, turn) => `translate3d(${px(x)}, ${px(y - (size * dy))}, ${px(rest + (size * 1.2))}) scale(${s}) rotate(${turn}deg)`;
    return [crown.animate([
      {transform: p(0.3, 0, -20), opacity: 0},
      {transform: p(0.75, 1.25, 6), opacity: 1, offset: 0.18},
      {transform: p(0.8, 1, 0), opacity: 1, offset: 0.3},
      {transform: p(1, 1, -3), opacity: 1, offset: 0.75},
      {transform: p(1.3, 0.9, 0), opacity: 0}
    ], {duration: 2200, delay: at, easing: "ease-out"})];
  },

  /** The table cracks under the die. */
  crack({make, x, y, at}) {
    const crack = make("ssd-moment-crack");
    const p = s => `translate3d(${px(x)}, ${px(y)}, 1px) scale(${s})`;
    return [crack.animate([
      {transform: p(0.3), opacity: 0},
      {transform: p(1), opacity: 1, offset: 0.06},
      {transform: p(1), opacity: 0.9, offset: 0.75},
      {transform: p(1), opacity: 0}
    ], {duration: 2400, delay: at, easing: "ease-out"})];
  },

  /** A skull rises from the die and fades. */
  skull({make, x, y, size, rest, at}) {
    const skull = make("ssd-moment-skull");
    skull.append(Object.assign(document.createElement("b"), {className: "fa-solid fa-skull"}));
    const p = (dy, s) => `translate3d(${px(x)}, ${px(y - (size * dy))}, ${px(rest + (size * 0.9))}) scale(${s})`;
    return [skull.animate([
      {transform: p(0, 0.3), opacity: 0},
      {transform: p(0.5, 1.1), opacity: 0.95, offset: 0.25},
      {transform: p(0.9, 1), opacity: 0.8, offset: 0.7},
      {transform: p(1.4, 1.2), opacity: 0}
    ], {duration: 2000, delay: at, easing: "ease-out"})];
  },

  /** A little rain cloud gathers over the die and rains on it. */
  raincloud({make, rand, x, y, size, rest, at}) {
    const out = [];
    const cloud = make("ssd-moment-cloud");
    cloud.append(Object.assign(document.createElement("b"), {className: "fa-solid fa-cloud"}));
    const z = rest + (size * 1.4);
    const c = (s, dy = 0) => `translate3d(${px(x)}, ${px(y - (size * 0.6) + dy)}, ${px(z)}) scale(${s})`;
    out.push(cloud.animate([
      {transform: c(0.2), opacity: 0}, {transform: c(1), opacity: 1, offset: 0.12},
      {transform: c(1, -2), opacity: 1, offset: 0.8}, {transform: c(1.1, -6), opacity: 0}
    ], {duration: 2300, delay: at, easing: "ease-out"}));
    for ( let i = 0; i < 9; i++ ) {
      const drop = make("ssd-moment-drop");
      const dx = (rand() - 0.5) * size * 0.9;
      out.push(drop.animate([
        {transform: `translate3d(${px(x + dx)}, ${px(y - (size * 0.45))}, ${px(z)})`, opacity: 0},
        {opacity: 0.9, offset: 0.2},
        {transform: `translate3d(${px(x + dx - (size * 0.05))}, ${px(y + (size * 0.15))}, ${px(rest * 0.6)})`, opacity: 0}
      ], {duration: 420, delay: at + 250 + (rand() * 300), iterations: 3, easing: "ease-in"}));
    }
    return out;
  },

  /** Applause: roses and music notes rain on the die. */
  ovation({make, rand, x, y, size, rest, at}) {
    return Array.from({length: 16}, (v, i) => {
      const note = i % 3 === 0;
      const el = make(note ? "ssd-moment-note" : "ssd-moment-rose");
      if ( note ) el.textContent = ["\u266a", "\u266b", "\u2669"][(i / 3) % 3];
      const dx = (rand() - 0.5) * size * 2.4;
      const fall = size * (0.2 + (rand() * 0.5));
      const spin = Math.round((rand() - 0.5) * 540);
      return el.animate([
        {transform: `translate3d(${px(x + dx)}, ${px(y - (size * 1.6))}, ${px(rest + size)}) rotate(0deg) scale(0.6)`, opacity: 0},
        {opacity: 1, offset: 0.15},
        {transform: `translate3d(${px(x + (dx * 0.8))}, ${px(y + fall)}, ${px(rest * 0.5)}) rotate(${spin}deg) scale(1)`, opacity: 1, offset: 0.8},
        {transform: `translate3d(${px(x + (dx * 0.8))}, ${px(y + fall)}, ${px(rest * 0.4)}) rotate(${spin}deg) scale(1)`, opacity: 0}
      ], {duration: 1500 + (rand() * 500), delay: at + (rand() * 450), easing: "cubic-bezier(0.3, 0.1, 0.5, 1)"});
    });
  },

  /** A ring of flowers opens around the die. */
  bloom({make, rand, x, y, size, at}) {
    const out = [];
    const ring = make("ssd-moment-bloom");
    out.push(ring.animate([
      {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(0.2)`, opacity: 0},
      {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(1)`, opacity: 0.9, offset: 0.3},
      {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(1.15)`, opacity: 0}
    ], {duration: 1800, delay: at, easing: "ease-out"}));
    for ( let i = 0; i < 10; i++ ) {
      const flower = make("ssd-moment-flower");
      flower.style.setProperty("--ssd-h", String(Math.floor(300 + (rand() * 80)) % 360));
      const a = ((i + (rand() * 0.4)) / 10) * Math.PI * 2;
      const r = size * (0.7 + (rand() * 0.25));
      const p = (k, s, turn) => `translate3d(${px(x + (Math.cos(a) * r * k))}, ${px(y + (Math.sin(a) * r * k * 0.7))}, 2px) `
        + `rotate(${turn}deg) scale(${s})`;
      out.push(flower.animate([
        {transform: p(0.2, 0, 0), opacity: 0},
        {transform: p(1, 1.15, 90), opacity: 1, offset: 0.25},
        {transform: p(1, 1, 120), opacity: 1, offset: 0.75},
        {transform: p(1.05, 0.8, 140), opacity: 0}
      ], {duration: 2100, delay: at + (i * 40), easing: "ease-out"}));
    }
    return out;
  },

  /** A hammer of light strikes the die from above, the light rings out over the table. */
  smite({make, x, y, size, rest, at}) {
    const pillar = make("ssd-moment-ray");
    const hammer = make("ssd-moment-hammer");
    hammer.append(Object.assign(document.createElement("b"), {className: "fa-solid fa-hammer-war"}));
    const wave = make("ssd-moment-wave");
    const h = (dy, s, turn) => `translate3d(${px(x + (size * 0.25))}, ${px(y - dy)}, ${px(rest + (size * 0.9))}) rotate(${turn}deg) scale(${s})`;
    return [
      hammer.animate([
        {transform: h(size * 1.4, 0.6, -70), opacity: 0},
        {transform: h(size * 1.1, 1.1, -60), opacity: 1, offset: 0.25},
        {transform: h(size * 0.45, 1.1, 20), opacity: 1, offset: 0.4},
        {transform: h(size * 0.55, 1, 10), opacity: 1, offset: 0.75},
        {transform: h(size * 0.7, 0.9, 10), opacity: 0}
      ], {duration: 1500, delay: at, easing: "ease-in"}),
      pillar.animate([
        {transform: `translate3d(${px(x)}, ${px(y)}, 2px) scaleY(0)`, opacity: 0},
        {transform: `translate3d(${px(x)}, ${px(y)}, 2px) scaleY(1)`, opacity: 1, offset: 0.3},
        {transform: `translate3d(${px(x)}, ${px(y)}, 2px) scaleY(1)`, opacity: 0}
      ], {duration: 1600, delay: at + 520, easing: "ease-out"}),
      wave.animate([
        {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(0.3)`, opacity: 1},
        {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(3)`, opacity: 0}
      ], {duration: 900, delay: at + 600, easing: "cubic-bezier(0.1, 0.7, 0.3, 1)"})
    ];
  },

  /** A roar: red rings burst from the die and the table shakes. */
  roar({area, make, x, y, unit, at}) {
    const out = [];
    for ( let i = 0; i < 3; i++ ) {
      const ring = make("ssd-moment-roar");
      out.push(ring.animate([
        {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(0.3)`, opacity: 0.95},
        {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(3.2)`, opacity: 0}
      ], {duration: 850, delay: at + (i * 170), easing: "cubic-bezier(0.1, 0.7, 0.3, 1)"}));
    }
    const k = unit * 0.16;
    out.push(area.animate([
      {transform: "translate(0, 0)"}, {transform: `translate(${px(k)}, ${px(-k * 0.5)})`},
      {transform: `translate(${px(-k)}, ${px(k * 0.4)})`}, {transform: `translate(${px(k * 0.7)}, ${px(k * 0.6)})`},
      {transform: `translate(${px(-k * 0.5)}, ${px(-k * 0.3)})`}, {transform: "translate(0, 0)"}
    ], {duration: 520, delay: at, easing: "linear"}));
    return out;
  },

  /** Brown leaves fall from the die and wither. */
  wilt({make, rand, x, y, size, rest, at}) {
    return Array.from({length: 9}, () => {
      const leaf = make("ssd-moment-leaf");
      const dx = (rand() - 0.5) * size * 1.2;
      const sway = (rand() - 0.5) * size * 0.6;
      const spin = Math.round(120 + (rand() * 240));
      return leaf.animate([
        {transform: `translate3d(${px(x + dx)}, ${px(y - (size * 0.4))}, ${px(rest * 1.6)}) rotate(0deg)`, opacity: 0},
        {opacity: 1, offset: 0.12},
        {transform: `translate3d(${px(x + dx + sway)}, ${px(y + (size * 0.1))}, ${px(rest)}) rotate(${spin / 2}deg)`, offset: 0.5},
        {transform: `translate3d(${px(x + dx - (sway * 0.5))}, ${px(y + (size * 0.55))}, 2px) rotate(${spin}deg)`, opacity: 0}
      ], {duration: 1700 + (rand() * 500), delay: at + (rand() * 400), easing: "ease-in-out"});
    });
  },

  /** The magic fizzles: sparks rise, droop and go out, a puff of smoke stays. */
  fizzle({make, rand, x, y, size, rest, at}) {
    const out = [];
    for ( let i = 0; i < 10; i++ ) {
      const spark = make("ssd-moment-fizzle");
      const dx = (rand() - 0.5) * size * 0.9;
      const up = size * (0.4 + (rand() * 0.5));
      out.push(spark.animate([
        {transform: `translate3d(${px(x)}, ${px(y)}, ${px(rest)}) scale(1)`, opacity: 1},
        {transform: `translate3d(${px(x + (dx * 0.6))}, ${px(y - up)}, ${px(rest + up)}) scale(0.8)`, opacity: 1, offset: 0.4},
        {transform: `translate3d(${px(x + dx)}, ${px(y - (up * 0.5))}, ${px(rest + (up * 0.6))}) scale(0.3)`, opacity: 0}
      ], {duration: 700 + (rand() * 300), delay: at + (rand() * 200), easing: "ease-out"}));
    }
    const puff = make("ssd-moment-smoke");
    out.push(puff.animate([
      {transform: `translate3d(${px(x)}, ${px(y - (size * 0.2))}, ${px(rest)}) scale(0.4)`, opacity: 0},
      {opacity: 0.7, offset: 0.3},
      {transform: `translate3d(${px(x)}, ${px(y - (size * 0.8))}, ${px(rest + size)}) scale(1.8)`, opacity: 0}
    ], {duration: 1400, delay: at + 350, easing: "ease-out"}));
    return out;
  },

  /** Black smoke rises from the die. */
  smoke({make, rand, x, y, size, rest, at}) {
    return Array.from({length: 7}, (v, i) => {
      const puff = make("ssd-moment-smoke");
      const dx = (rand() - 0.5) * size * 0.8;
      return puff.animate([
        {transform: `translate3d(${px(x + dx)}, ${px(y)}, ${px(rest)}) scale(0.4)`, opacity: 0},
        {opacity: 0.85, offset: 0.2},
        {transform: `translate3d(${px(x + (dx * 1.6))}, ${px(y - (size * 1.3))}, ${px(rest + size)}) scale(2)`, opacity: 0}
      ], {duration: 1400 + (rand() * 500), delay: at + (i * 90), easing: "ease-out"});
    });
  }
};

export const __test__ = {MOMENTS};
