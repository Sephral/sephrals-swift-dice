/**
 * One die in the page: a 3D body of flat faces (CSS 3D transforms, no WebGL), with its numbers, a shading layer per
 * face for the light, and a shadow on the table. The animation runs as Web Animations, which the browser plays on its
 * compositor, so a busy Foundry does not make the dice stutter.
 */

import {paintEffect} from "./colors.mjs";
import {cssMatrix, dieModel, faceTurn, indicesShowing, restingTurn, scale} from "./geometry.mjs";
import {burstParticles, landingParticles, samplePath, shadeOf, stepsFor, trailParticles} from "./motion.mjs";
import {faceLabel, modelFor, showsResult} from "./rolls.mjs";

/** Faces are drawn a little larger than the solid, so no gaps show between them. */
const GROW = 1.02;

/** Size of a one digit number relative to the inner radius of its face; triangles have room for more. */
const LABEL_SCALE = {d6: 1.3, d8: 1.55, d10: 1.4, d12: 1.3, d20: 1.65, coin: 1.0};

/**
 * Format a number for CSS.
 * @param {number} n
 * @returns {string}
 */
const px = n => `${Math.round(n * 100) / 100}px`;

/**
 * The texts on a coin: the result on top, the other side below.
 * @param {object} die
 * @returns {string[]}
 */
function coinLabels(die) {
  if ( die.coin ) return (die.value === 1) ? ["H", "T"] : ["T", "H"];
  if ( die.type === "coin" ) return [String(die.value), String((die.value === 1) ? 2 : 1)];
  return [String(die.value), `d${die.faces}`];
}

/**
 * Build a die.
 * @param {object} die              From diceToThrow: type, value, labels
 * @param {object} look             From diceLook
 * @param {object} options
 * @param {number} options.unit     Pixels per unit of the solid (about half the size of the die)
 * @param {boolean} [options.covered=false]   Show question marks instead of numbers
 * @param {() => number} options.rand
 * @param {number} [options.spin=0]
 * @returns {{element: HTMLElement, faces: {element: HTMLElement, shade: HTMLElement, normal: number[]}[],
 *   resting: number[][]}}
 */
export function buildDie(die, look, {unit, covered = false, rand, spin = 0, glow = true}) {
  const modelType = modelFor(die.type);
  const model = dieModel(modelType);
  const element = document.createElement("div");
  const lit = (glow && look.glow && (look.glow !== "none")) ? look.glow : "none";
  element.className = `ssd-die ssd-${look.finish} ssd-pattern-${look.pattern ?? "none"} ssd-lit-${lit} ssd-model-${modelType}`;
  if ( look.seeThrough ) element.classList.add("ssd-see-through");
  // Pulse and heartbeat light the die from within
  if ( glow && ["pulse", "heartbeat"].includes(look.aura) ) element.classList.add(`ssd-beat-${look.aura}`);
  for ( const [key, name] of [["body", "body"], ["light", "light"], ["dark", "dark"], ["edge", "edge"], ["text", "text"],
    ["halo", "halo"], ["second", "second"], ["glassLight", "glass-light"], ["glassBody", "glass-body"],
    ["glassDark", "glass-dark"]] ) {
    if ( look[key] ) element.style.setProperty(`--ssd-${name}`, look[key]);
  }
  if ( look.glowColor ) element.style.setProperty("--ssd-glowc", look.glowColor);
  if ( look.fontFamily ) element.style.setProperty("--ssd-font", look.fontFamily);

  // Which face (or d4 corner) ends up toward the viewer
  let restIndex = 0;
  if ( modelType !== "coin" ) {
    const candidates = covered ? indicesShowing(model, () => true) : indicesShowing(model, showsResult(die));
    restIndex = candidates.length ? candidates[Math.floor(rand() * candidates.length)] : 0;
  }
  const coin = (modelType === "coin") ? coinLabels(die) : null;

  const faces = [];
  model.faces.forEach((face, index) => {
    const el = document.createElement("div");
    el.className = (face.kind === "rim") ? "ssd-face ssd-rim" : "ssd-face";
    const points = face.polygon.map(([x, y]) => [x * unit * GROW, y * unit * GROW]);
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    el.style.width = px(Math.max(...xs) - minX);
    el.style.height = px(Math.max(...ys) - minY);
    el.style.left = px(minX);
    el.style.top = px(minY);
    el.style.transformOrigin = `${px(-minX)} ${px(-minY)}`;
    el.style.clipPath = `polygon(${points.map(([x, y]) => `${px(x - minX)} ${px(y - minY)}`).join(", ")})`;
    el.style.transform = `matrix3d(${cssMatrix(faceTurn(face), scale(face.center, unit)).join(",")})`;
    if ( face.kind === "face" ) {
      const origin = [-minX, -minY];
      if ( model.type === "d4" ) {
        // Every corner of a d4 face carries the number of that corner, its top toward the corner
        face.indices.forEach((corner, k) => {
          const [cx, cy] = face.polygon[k];
          const text = covered ? "?" : String(model.vertexNumbers[corner]);
          const at = [origin[0] + (cx * unit * 0.52), origin[1] + (cy * unit * 0.52)];
          el.append(label(text, at, Math.atan2(cx, -cy), face.inradius * unit * 1.05));
        });
      } else {
        let text;
        if ( covered ) text = "?";
        else if ( coin ) text = coin[index] ?? "";
        else text = faceLabel(die.type, face.number, {labels: die.labels});
        const size = face.inradius * unit * (LABEL_SCALE[model.type] ?? 1.2) * ((text.length > 1) ? 0.78 : 1);
        const span = label(text, origin, 0, size);
        if ( ((text === "6") || (text === "9")) && (model.faces.length >= 8) && !die.labels ) span.classList.add("ssd-under");
        el.append(span);
      }
    }
    const shade = document.createElement("i");
    shade.className = "ssd-shade";
    el.append(shade);
    element.append(el);
    faces.push({element: el, shade, normal: face.normal});
  });
  return {element, faces, resting: restingTurn(model, restIndex, spin)};
}

/**
 * A number on a face.
 * @param {string} text
 * @param {number[]} at        Position in the face element
 * @param {number} angle       Turn in radians, 0 = upright
 * @param {number} size        Font size in pixels
 * @returns {HTMLElement}
 */
function label(text, at, angle, size) {
  const span = document.createElement("span");
  span.className = "ssd-label";
  span.textContent = text;
  span.style.left = px(at[0]);
  span.style.top = px(at[1]);
  span.style.fontSize = px(Math.max(7, size));
  span.style.transform = `translate(-50%, -50%) rotate(${Math.round(angle * 1000) / 1000}rad)`;
  return span;
}

/**
 * Play the throw of one die.
 * @param {object} built     From buildDie
 * @param {HTMLElement} shadow
 * @param {object} plan      One entry of planThrow
 * @param {object} options
 * @param {number} options.width    Area width in pixels
 * @param {number} options.height   Area height in pixels
 * @param {number} options.unit
 * @param {number} options.duration   Milliseconds of the whole throw
 * @param {number} options.delay      Milliseconds until the throw starts (negative: already running)
 * @returns {Animation[]}
 */
export function playDie(built, shadow, plan, {width, height, unit, duration, delay, aura = null, glow = "none",
  core = null, fx = null, inner = null, liveLight = true}) {
  const own = duration * (1 - plan.delay);
  const start = delay + (duration * plan.delay);
  const path = samplePath(plan, built.resting, stepsFor(own));
  const lift = unit * 2.4;
  const rest = unit * 0.95;
  const timing = {duration: own, delay: start, fill: "both", easing: "linear"};
  const animations = [];
  const scaled = (n, s) => Math.round(n * s * 1000) / 1000;

  // The size comes with the throw style: the die grows in, sits small in a hand, hides in a cup, comes out of a
  // portal or pops into being. One animation for the whole die instead of one per face
  animations.push(built.element.animate(path.map(p => {
    const turn = p.turn.map(row => row.map(v => v * p.scale));
    return {transform: `matrix3d(${cssMatrix(turn, [p.x * width, p.y * height, rest + (p.z * lift)]).join(",")})`};
  }), timing));
  // The light changes slowly, every second step is enough
  const lightPath = path.filter((p, i) => (i % 2 === 0) || (i === path.length - 1));
  // The light moves over the faces on small throws; large throws keep the light of the resting die, a moving light
  // there means one animation per face and costs weak computers frames
  if ( liveLight ) {
    for ( const face of built.faces ) {
      animations.push(face.shade.animate(lightPath.map(p => ({opacity: shadeOf(p.turn, face.normal), offset: p.t})), timing));
    }
  } else {
    for ( const face of built.faces ) face.shade.style.opacity = String(shadeOf(built.resting, face.normal));
  }
  const fade = {duration: Math.min(160, own * 0.12), delay: start, fill: "backwards", easing: "ease-out"};
  const center = (p, z) => `translate3d(${px(p.x * width)}, ${px(p.y * height)}, ${px(z)}) scale(${scaled(1, p.scale)})`;

  // The tinted inside of a see-through die faces the viewer like the thing inside it
  if ( inner ) {
    animations.push(inner.animate(path.map(p => ({transform: center(p, (rest * 0.55) + (p.z * lift))})), timing));
  }

  animations.push(shadow.animate(path.map(p => {
    const z = p.z * lift;
    return {
      transform: `translate(${px((p.x * width) + (z * 0.3))}, ${px((p.y * height) + (z * 0.45))}) `
        + `scale(${scaled(1 + (Math.min(p.z, 3) * 0.35), p.scale)})`,
      opacity: Math.max(0, 0.55 - (p.z * 0.3)) * Math.min(1, p.t / 0.12) * Math.min(1, p.scale)
    };
  }), timing));

  // The aura of a die follows it: what lies on the table at its foot, what floats around it at its height
  if ( fx?.table ) {
    animations.push(fx.table.animate(lightPath.map(p => ({
      transform: `translate3d(${px(p.x * width)}, ${px(p.y * height)}, 1px) scale(${scaled(1, Math.min(1, p.scale))})`,
      offset: p.t
    })), timing));
    animations.push(fx.table.animate([{opacity: 0}, {opacity: 1}], fade));
  }
  if ( fx?.around ) {
    animations.push(fx.around.animate(path.map(p => ({transform: center(p, rest + (p.z * lift))})), timing));
    animations.push(fx.around.animate([{opacity: 0}, {opacity: 1}], fade));
  }

  // What floats inside a see-through die always faces the viewer, so it moves with the die but does not turn
  if ( core ) {
    animations.push(core.animate(path.map(p => ({transform: center(p, rest + (p.z * lift))})), timing));
    animations.push(core.animate([{opacity: 0}, {opacity: 1}], fade));
  }

  // A glowing die lights the table below it: wider and fainter the higher it flies
  if ( aura ) {
    const strength = (glow === "strong") ? 0.95 : 0.6;
    animations.push(aura.animate(lightPath.map(p => ({
      transform: `translate(${px(p.x * width)}, ${px(p.y * height)}) scale(${scaled(0.9 + (Math.min(p.z, 3) * 0.7), 1)})`,
      opacity: Math.round(strength * Math.max(0.25, 1 - (p.z * 0.45)) * Math.min(1, p.t / 0.12) * Math.min(1, p.scale) * 1000) / 1000,
      offset: p.t
    })), timing));
  }
  return animations;
}

/**
 * The particles a die leaves on its way (sparks, embers, stars or smoke). Each one is a small element that waits
 * invisible until its moment, flies once and stays invisible after.
 * @param {HTMLElement} area
 * @param {object} plan
 * @param {object} look      The die's look with trail and glow color
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.unit
 * @param {number} options.duration
 * @param {number} options.delay
 * @param {number} options.count     Particles for this die
 * @param {() => number} options.rand
 * @returns {Animation[]}
 */
export function playTrail(area, plan, look, {width, height, unit, duration, delay, count, rand}) {
  const parts = trailParticles(plan, look.trail, count, rand);
  const own = duration * (1 - plan.delay);
  const start = delay + (duration * plan.delay);
  const lift = unit * 2.4;
  const rest = unit * 0.95;
  const size = unit * 2;
  return parts.map(p => {
    const el = document.createElement("i");
    el.className = `ssd-particle ssd-p-${look.trail}`;
    paintEffect(el, look, "trail");
    el.style.setProperty("--ssd-h", String(p.hue));
    glyph(el, look.trail, p.hue);
    area.append(el);
    const x0 = p.from.x * width;
    const y0 = p.from.y * height;
    const z0 = rest + (p.from.z * lift);
    const end = `translate3d(${px(x0 + (p.dx * size))}, ${px(y0 + (p.dy * size))}, ${px(Math.max(1, z0 + (p.dz * size)))}) `
      + `rotate(${Math.round(p.spin * 100) / 100}rad) scale(${Math.round(p.size * (1 + p.grow) * 100) / 100})`;
    return el.animate([
      {transform: `translate3d(${px(x0)}, ${px(y0)}, ${px(z0)}) scale(${Math.round(p.size * 100) / 100})`, opacity: 0},
      {opacity: 1, offset: 0.12},
      {transform: end, opacity: 0}
    ], {duration: p.life, delay: start + (p.t * own), easing: "cubic-bezier(0.2, 0.6, 0.4, 1)"});
  });
}

/** Particles drawn as a Font Awesome icon (Foundry brings it along), or as a letter. */
const PARTICLE_ICONS = {bats: "fa-bat", feathers: "fa-feather", gears: "fa-gear", bones: "fa-bone"};
const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
const NOTES = "♪♫♩♬";

/**
 * Give a particle its picture when it is an icon or a letter.
 * @param {HTMLElement} el
 * @param {string} kind
 * @param {number} pick   A number to pick a letter by
 */
function glyph(el, kind, pick) {
  const icon = PARTICLE_ICONS[kind];
  if ( icon ) {
    const b = document.createElement("b");
    b.className = `fa-solid ${icon}`;
    el.append(b);
  }
  else if ( kind === "runes" ) el.textContent = RUNES[pick % RUNES.length];
  else if ( kind === "notes" ) el.textContent = NOTES[pick % NOTES.length];
}

/**
 * The burst on a highest (gold, rising) or lowest result (red, sinking): a ring of light and particles flying out
 * from the resting die.
 * @param {HTMLElement} area
 * @param {object} plan
 * @param {"max"|"min"} glow
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.unit
 * @param {number} options.at        Milliseconds until the die lands
 * @param {number} options.count
 * @param {() => number} options.rand
 * @returns {Animation[]}
 */
export function playBurst(area, plan, glow, {width, height, unit, at, count, rand}) {
  const x = plan.end.x * width;
  const y = plan.end.y * height;
  const rest = unit * 0.95;
  const size = unit * 2;
  const ring = document.createElement("i");
  ring.className = `ssd-ring ssd-ring-${glow}`;
  area.append(ring);
  const animations = [ring.animate([
    {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(0.3)`, opacity: 0.95},
    {transform: `translate3d(${px(x)}, ${px(y)}, 1px) scale(2.6)`, opacity: 0}
  ], {duration: 720, delay: at, easing: "cubic-bezier(0.1, 0.7, 0.3, 1)"})];
  for ( const p of burstParticles(glow, count, rand) ) {
    const el = document.createElement("i");
    el.className = `ssd-particle ssd-p-${glow}`;
    area.append(el);
    animations.push(el.animate([
      {transform: `translate3d(${px(x)}, ${px(y)}, ${px(rest)}) scale(${Math.round(p.size * 100) / 100})`, opacity: 0},
      {opacity: 1, offset: 0.1},
      {transform: `translate3d(${px(x + (p.dx * size))}, ${px(y + (p.dy * size))}, ${px(Math.max(1, rest + (p.dz * size)))}) `
        + `scale(${Math.round(p.size * 0.4 * 100) / 100})`, opacity: 0}
    ], {duration: p.life, delay: at + p.delay, easing: "cubic-bezier(0.15, 0.7, 0.35, 1)"}));
  }
  return animations;
}

/** Elements of each aura: on the table at the foot of the die, or floating around it. */
const AURA_PARTS = {
  pulse: {table: 1}, heartbeat: {table: 1}, ripples: {table: 3}, rays: {table: 1}, runecircle: {table: 1},
  vortex: {table: 1},
  motes: {around: 5}, flames: {around: 7}, storm: {around: 4}, frost: {around: 6}, shadow: {around: 6},
  halo: {around: 1}, rings: {around: 1}, twinkle: {around: 6}, sparkflies: {around: 7}, bubbles: {around: 5},
  hearts: {around: 4}, snowfall: {around: 7}, butterflies: {around: 3, inner: true},
  // inner: a part of its own for a second movement, icon: drawn as an icon, place: a fixed place around the die,
  // keep: the same number of parts on large throws (a pair of wings stays a pair)
  rage: {table: 1, around: 6}, vines: {table: 1, around: 3, inner: true}, chi: {around: 4},
  gears: {table: 2, icon: "fa-gear"}, tentacles: {around: 5, inner: true, place: "foot"}, mark: {table: 1},
  wings: {around: 2, inner: true, place: "sides", keep: true}, melody: {around: 4}, shield: {around: 1, keep: true}
};

/**
 * The loops of auras whose parts move on their own paths. Web Animations with fixed numbers: keyframes with CSS
 * variables would run on the main thread, these run on the compositor.
 * @type {Record<string, (p: object) => object[]>}
 */
const AURA_MOVES = {
  rage: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size * 1.2)}px, ${round((y * size * 0.5) + (size * 0.25))}px, ${round(size * 0.3)}px) scale(0.6)`, opacity: 0},
    {opacity: 0.9, offset: 0.2},
    {transform: `translate3d(${round(x * size * 1.5)}px, ${round((y * size * 0.5) - (size * 0.75))}px, ${round(size * 0.6)}px) scale(1.4)`, opacity: 0}
  ],
  vines: ({angle, k, size, round}) => {
    const r = round(size * 0.7 * k);
    const at = a => `rotateX(70deg) rotateZ(${round(a)}deg) translateX(${r}px) rotateZ(${round(-a)}deg) rotateX(-70deg)`;
    return [{transform: at(angle)}, {transform: at(angle + 360)}];
  },
  chi: ({angle, k, size, round}) => {
    const r = round(size * 0.72 * k);
    const at = a => `rotateX(58deg) rotateY(-18deg) rotateZ(${round(a)}deg) translateX(${r}px) rotateZ(90deg)`;
    return [{transform: at(angle)}, {transform: at(angle + 360)}];
  },
  melody: ({angle, k, size, round}) => {
    const r = round(size * 0.8 * k);
    const at = (a, lift) => `rotateX(66deg) rotateZ(${round(a)}deg) translateX(${r}px) rotateZ(${round(-a)}deg) `
      + `rotateX(-66deg) translateY(${round(lift)}px)`;
    return [{transform: at(angle, 0)}, {transform: at(angle + 180, -size * 0.18)}, {transform: at(angle + 360, 0)}];
  },
  motes: ({angle, k, size, round}) => {
    const r = round(size * 0.78 * k);
    const at = a => `rotateX(68deg) rotateZ(${round(a)}deg) translateX(${r}px) rotateZ(${round(-a)}deg) rotateX(-68deg)`;
    return [{transform: at(angle)}, {transform: at(angle + 360)}];
  },
  flames: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size * 1.3)}px, ${round((y * size * 0.6) + (size * 0.18))}px, ${round(size * 0.45)}px) scale(0.7)`, opacity: 0},
    {opacity: 1, offset: 0.2},
    {transform: `translate3d(${round(x * size)}px, ${round((y * size * 0.6) - (size * 0.6))}px, ${round(size * 0.55)}px) scale(0.3)`, opacity: 0}
  ],
  frost: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size)}px, ${round(y * size)}px, ${round(size * -0.3)}px) scale(0.6)`, opacity: 0},
    {opacity: 0.55, offset: 0.45},
    {transform: `translate3d(${round(x * size * 1.6)}px, ${round(y * size * 1.6)}px, ${round(size * -0.2)}px) scale(1.4)`, opacity: 0}
  ],
  shadow: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size)}px, ${round(y * size * 0.6)}px, ${round(size * 0.1)}px) scale(0.5)`, opacity: 0},
    {opacity: 0.85, offset: 0.3},
    {transform: `translate3d(${round(x * size * 1.3)}px, ${round((y * size * 0.6) - (size * 0.8))}px, ${round(size * 0.5)}px) scale(1.5)`, opacity: 0}
  ],
  twinkle: ({x, y, k, size, round}) => {
    const at = s => `translate3d(${round(x * size * 1.9)}px, ${round(y * size * 1.9)}px, ${round(size * 0.35 * k)}px) scale(${s})`;
    return [{transform: at(0), opacity: 0}, {transform: at(1.1), opacity: 1, offset: 0.18}, {transform: at(0.2), opacity: 0,
      offset: 0.4}, {transform: at(0), opacity: 0}];
  },
  sparkflies: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size * 1.4)}px, ${round((y * size * 0.5) + (size * 0.2))}px, ${round(size * 0.3)}px) scale(1)`, opacity: 0},
    {opacity: 1, offset: 0.15},
    {transform: `translate3d(${round(x * size * 1.7)}px, ${round((y * size * 0.5) - (size * 0.9))}px, ${round(size * 0.6)}px) scale(0.4)`, opacity: 0}
  ],
  bubbles: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size * 1.2)}px, ${round((y * size * 0.4) + (size * 0.25))}px, ${round(size * 0.3)}px) scale(0.4)`, opacity: 0},
    {opacity: 0.9, offset: 0.2},
    {transform: `translate3d(${round((x * size * 1.2) + (size * 0.12))}px, ${round((y * size * 0.4) - (size * 0.45))}px, ${round(size * 0.45)}px) scale(0.9)`, offset: 0.6},
    {transform: `translate3d(${round((x * size * 1.2) - (size * 0.06))}px, ${round((y * size * 0.4) - (size * 0.95))}px, ${round(size * 0.6)}px) scale(1.15)`, opacity: 0}
  ],
  hearts: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size * 1.3)}px, ${round(y * size * 0.5)}px, ${round(size * 0.4)}px) scale(0.3) rotate(-10deg)`, opacity: 0},
    {opacity: 1, offset: 0.25},
    {transform: `translate3d(${round(x * size * 1.5)}px, ${round((y * size * 0.5) - (size * 0.9))}px, ${round(size * 0.6)}px) scale(1) rotate(12deg)`, opacity: 0}
  ],
  snowfall: ({x, y, size, round}) => [
    {transform: `translate3d(${round(x * size * 2)}px, ${round(-size * 0.9)}px, ${round(size * 0.5)}px) rotate(0deg)`, opacity: 0},
    {opacity: 1, offset: 0.15},
    {transform: `translate3d(${round((x * size * 2) + (size * 0.15))}px, ${round(size * 0.55)}px, ${round(size * 0.2)}px) rotate(180deg)`, opacity: 0}
  ],
  butterflies: ({angle, k, size, round}) => {
    const r = round(size * 0.85 * k);
    const at = a => `rotateX(62deg) rotateZ(${round(a)}deg) translateX(${r}px) rotateZ(${round(-a)}deg) rotateX(-62deg)`;
    return [{transform: at(angle)}, {transform: `${at(angle + 180)} translateY(${round(-size * 0.15)}px)`}, {transform: at(angle + 360)}];
  }
};

/** Auras whose parts circle the die at an even pace. */
const ORBITS = ["motes", "butterflies", "twinkle", "vines", "chi", "melody"];

/** Seconds of one loop of each aura, so each part starts somewhere else in it. */
const AURA_LOOP = {pulse: 1.6, heartbeat: 1.3, ripples: 2.4, rays: 9, motes: 3, flames: 0.9, storm: 1.7, frost: 3.2,
  shadow: 2.2, halo: 2.4, rings: 6, twinkle: 2.2, sparkflies: 1.1, bubbles: 2.6, hearts: 2, snowfall: 2.8,
  butterflies: 5, runecircle: 12, vortex: 4, rage: 0.8, vines: 7, chi: 1.6, gears: 6, tentacles: 2.6, mark: 8,
  wings: 1.2, melody: 4, shield: 2.4};

/**
 * The aura of a die: a pulsing light, ripples or rays on the table, or motes, flames, lightning, frost or shadows
 * around it. Endless CSS loops on transform and opacity; every part starts at its own point of the loop.
 * @param {object} look
 * @param {() => number} rand
 * @returns {{table: HTMLElement|null, around: HTMLElement|null}}
 */
export function buildAura(look, rand, size, share = 1) {
  const parts = AURA_PARTS[look.aura];
  if ( !parts ) return {table: null, around: null};
  // Large throws: fewer parts per die, never none
  const around = parts.around ? (parts.keep ? parts.around : Math.max(2, Math.round(parts.around * share))) : 0;
  const loop = AURA_LOOP[look.aura];
  const moving = AURA_MOVES[look.aura];
  const make = (where, count) => {
    const el = document.createElement("div");
    el.className = `ssd-fx${where} ssd-fx-${look.aura}`;
    paintEffect(el, look, "aura");
    for ( let i = 0; i < count; i++ ) {
      const part = document.createElement("i");
      const angle = ((i / count) * 360) + (rand() * 40);
      const k = 0.75 + (rand() * 0.5);
      const round = n => Math.round(n * 1000) / 1000;
      part.style.setProperty("--ssd-d", `${-Math.round(rand() * loop * 100) / 100}s`);
      part.style.setProperty("--ssd-a", `${Math.round(angle)}deg`);
      part.style.setProperty("--ssd-k", String(round(k)));
      el.append(part);
      // Butterflies flap, tentacles sway and wings beat on a part of their own, so the way and the movement do not
      // fight; gears are icons
      if ( parts.inner && (where === "a") ) part.append(document.createElement("b"));
      if ( parts.icon ) part.append(Object.assign(document.createElement("b"), {className: `fa-solid ${parts.icon}`}));
      // A point on a circle around the die, for parts that rise or drift from its edge
      const x = Math.cos(angle * Math.PI / 180) * 0.4 * k;
      const y = Math.sin(angle * Math.PI / 180) * 0.4 * k;
      // Parts with a place of their own: tentacles around the foot of the die, wings on its sides
      if ( (where === "a") && (parts.place === "foot") ) {
        const a = ((i + 0.5) / count) * Math.PI * 2;
        part.style.transform = `translate3d(${round(Math.cos(a) * size * 0.62)}px, `
          + `${round((Math.sin(a) * size * 0.3) + (size * 0.12))}px, ${round(size * ((Math.sin(a) > 0) ? 0.1 : -0.2))}px)`;
      }
      if ( (where === "a") && (parts.place === "sides") ) part.classList.add(i ? "ssd-right" : "ssd-left");
      // Moves belong to the parts around the die; an aura with both keeps its table part still
      if ( moving && !((where === "t") && parts.around) ) {
        const delay = -Math.round(rand() * loop * 1000);
        part.animate(moving({angle, k, x, y, size, round}), {duration: loop * 1000 * (0.85 + (k * 0.2)), delay,
          iterations: Infinity, easing: ORBITS.includes(look.aura) ? "linear" : "ease-out"});
      }
    }
    return el;
  };
  return {table: parts.table ? make("t", parts.table) : null, around: around ? make("a", around) : null};
}

/**
 * What happens when a die lands: a puff of dust, a shockwave, sparkles, a splash, or a circle of runes on the table.
 * @param {HTMLElement} area
 * @param {object} plan
 * @param {object} look
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.unit
 * @param {number} options.at        Milliseconds until the die lands
 * @param {() => number} options.rand
 * @param {number} [options.share=1]   Fewer particles on large throws
 * @returns {Animation[]}
 */
export function playLanding(area, plan, look, {width, height, unit, at, rand, share = 1}) {
  const kind = look.landing;
  if ( !kind || (kind === "none") ) return [];
  const x = plan.end.x * width;
  const y = plan.end.y * height;
  const rest = unit * 0.95;
  const size = unit * 2;
  const make = cls => {
    const el = document.createElement("i");
    el.className = cls;
    paintEffect(el, look, "landing");
    area.append(el);
    return el;
  };
  const at3d = (dx, dy, z) => `translate3d(${px(x + dx)}, ${px(y + dy)}, ${px(z)})`;
  const special = LANDING_PLAYS[kind]?.({area, make, at3d, at, size, rest, unit, rand, share, x, y});
  if ( special ) return special;
  if ( kind === "shockwave" ) {
    return [make("ssd-land-wave").animate([
      {transform: `${at3d(0, 0, 1)} scale(0.35)`, opacity: 0.9},
      {transform: `${at3d(0, 0, 1)} scale(2.4)`, opacity: 0}
    ], {duration: 620, delay: at, easing: "cubic-bezier(0.1, 0.7, 0.3, 1)"})];
  }
  if ( kind === "runes" ) {
    const circle = make("ssd-land-runes");
    circle.append(document.createElement("b"));
    return [circle.animate([
      {transform: `${at3d(0, 0, 1)} scale(0.55) rotate(-30deg)`, opacity: 0},
      {transform: `${at3d(0, 0, 1)} scale(1) rotate(0deg)`, opacity: 0.95, offset: 0.18},
      {transform: `${at3d(0, 0, 1)} scale(1.04) rotate(25deg)`, opacity: 0.8, offset: 0.75},
      {transform: `${at3d(0, 0, 1)} scale(1.1) rotate(35deg)`, opacity: 0}
    ], {duration: 2200, delay: at, easing: "ease-out"})];
  }
  if ( kind === "crater" ) {
    return [make("ssd-land-crater").animate([
      {transform: `${at3d(0, 0, 1)} scale(0.4)`, opacity: 0},
      {transform: `${at3d(0, 0, 1)} scale(1)`, opacity: 0.9, offset: 0.08},
      {transform: `${at3d(0, 0, 1)} scale(1.02)`, opacity: 0.75, offset: 0.7},
      {transform: `${at3d(0, 0, 1)} scale(1.05)`, opacity: 0}
    ], {duration: 2400, delay: at, easing: "ease-out"})];
  }
  if ( kind === "lightning" ) {
    const bolt = make("ssd-land-bolt");
    const flash = make("ssd-land-flash");
    return [
      bolt.animate([
        {transform: `${at3d(0, -size * 1.1, rest * 2)} scaleY(0.2)`, opacity: 0},
        {transform: `${at3d(0, -size * 1.1, rest * 2)} scaleY(1)`, opacity: 1, offset: 0.08},
        {opacity: 0.2, offset: 0.2},
        {opacity: 1, offset: 0.3},
        {transform: `${at3d(0, -size * 1.1, rest * 2)} scaleY(1)`, opacity: 0}
      ], {duration: 520, delay: at - 80, easing: "linear"}),
      flash.animate([
        {transform: `${at3d(0, 0, 1)} scale(0.3)`, opacity: 0},
        {transform: `${at3d(0, 0, 1)} scale(1.6)`, opacity: 1, offset: 0.2},
        {transform: `${at3d(0, 0, 1)} scale(2.6)`, opacity: 0}
      ], {duration: 650, delay: at, easing: "ease-out"})
    ];
  }
  if ( kind === "ink" ) {
    return [make("ssd-land-ink").animate([
      {transform: `${at3d(0, 0, 1)} scale(0.2) rotate(0deg)`, opacity: 0},
      {transform: `${at3d(0, 0, 1)} scale(1.15) rotate(20deg)`, opacity: 0.9, offset: 0.12},
      {transform: `${at3d(0, 0, 1)} scale(1.1) rotate(22deg)`, opacity: 0.8, offset: 0.7},
      {transform: `${at3d(0, 0, 1)} scale(1.1) rotate(22deg)`, opacity: 0}
    ], {duration: 2200, delay: at, easing: "ease-out"})];
  }
  const low = rest * 0.4;
  return landingParticles(kind, rand, share).map(p => {
    const el = make(`ssd-particle ssd-land-${kind}`);
    el.style.setProperty("--ssd-h", String(p.hue));
    glyph(el, kind, p.hue);
    return el.animate([
      {transform: `${at3d(0, 0, low)} scale(${Math.round(p.size * 50) / 100})`, opacity: 0},
      {opacity: 1, offset: 0.12},
      {transform: `${at3d(p.dx * size, p.dy * size, Math.max(1, low + (p.dz * size)))} `
        + `rotate(${Math.round(p.spin * 100) / 100}rad) scale(${Math.round(p.size * 100) / 100})`, opacity: 0}
    ], {duration: p.life, delay: at + p.delay, easing: "cubic-bezier(0.15, 0.7, 0.35, 1)"});
  });
}

/**
 * Landings with a shape of their own: a circle of holy light, crossed blades, arrows striking around the die, the
 * table cracking.
 * @type {Record<string, (ctx: object) => Animation[]>}
 */
const LANDING_PLAYS = {
  consecrate({make, at3d, at}) {
    const circle = make("ssd-land-consecrate");
    circle.append(document.createElement("b"));
    return [circle.animate([
      {transform: `${at3d(0, 0, 1)} scale(0.3)`, opacity: 0},
      {transform: `${at3d(0, 0, 1)} scale(1)`, opacity: 1, offset: 0.15},
      {transform: `${at3d(0, 0, 1)} scale(1.05)`, opacity: 0.85, offset: 0.7},
      {transform: `${at3d(0, 0, 1)} scale(1.12)`, opacity: 0}
    ], {duration: 2300, delay: at, easing: "ease-out"})];
  },

  clash({make, at3d, at, size, rest, rand, share}) {
    const blades = make("ssd-land-clash");
    blades.append(Object.assign(document.createElement("b"), {className: "fa-solid fa-swords"}));
    // Above the die, so its number stays free
    const out = [blades.animate([
      {transform: `${at3d(0, -size * 0.7, rest * 2)} scale(0.2) rotate(-25deg)`, opacity: 0},
      {transform: `${at3d(0, -size * 0.95, rest * 2)} scale(1.1) rotate(0deg)`, opacity: 1, offset: 0.18},
      {transform: `${at3d(0, -size * 1, rest * 2)} scale(1) rotate(0deg)`, opacity: 0.9, offset: 0.6},
      {transform: `${at3d(0, -size * 1.15, rest * 2)} scale(0.9) rotate(4deg)`, opacity: 0}
    ], {duration: 1000, delay: at, easing: "ease-out"})];
    for ( const p of landingParticles("clash", rand, share) ) {
      const spark = make("ssd-particle ssd-land-clash-spark");
      out.push(spark.animate([
        {transform: `${at3d(0, -size * 0.95, rest * 2)} scale(1)`, opacity: 1},
        {transform: `${at3d(p.dx * size, (p.dy * size) - (size * 0.95), rest * 2)} scale(0.3)`, opacity: 0}
      ], {duration: p.life, delay: at + 60 + p.delay, easing: "cubic-bezier(0.1, 0.7, 0.4, 1)"}));
    }
    return out;
  },

  arrows({make, at3d, at, size, rand, share}) {
    const count = Math.max(3, Math.round(5 * share));
    return Array.from({length: count}, (v, i) => {
      const arrow = make("ssd-land-arrow");
      arrow.append(Object.assign(document.createElement("b"), {className: "fa-solid fa-arrow-down"}));
      const angle = ((i + (rand() * 0.6)) / count) * Math.PI * 2;
      const reach = size * (0.55 + (rand() * 0.3));
      const hit = {x: Math.cos(angle) * reach, y: Math.sin(angle) * reach * 0.6};
      const tilt = Math.round((rand() - 0.5) * 30);
      const p = (dy, z, s) => `${at3d(hit.x, hit.y + dy, z)} rotate(${tilt}deg) scale(${s})`;
      return arrow.animate([
        {transform: p(-size * 1.2, size * 1.5, 1.4), opacity: 0},
        {transform: p(-size * 0.25, size * 0.3, 1), opacity: 1, offset: 0.12},
        {transform: p(-size * 0.25, size * 0.3, 1), opacity: 1, offset: 0.75},
        {transform: p(-size * 0.25, size * 0.3, 1), opacity: 0}
      ], {duration: 1900, delay: at - 160 + (i * 70), easing: "cubic-bezier(0.2, 0.8, 0.3, 1)"});
    });
  },

  quake({area, make, at3d, at, unit}) {
    const cracks = make("ssd-land-quake");
    const k = unit * 0.1;
    return [
      cracks.animate([
        {transform: `${at3d(0, 0, 1)} scale(0.3)`, opacity: 0},
        {transform: `${at3d(0, 0, 1)} scale(1)`, opacity: 1, offset: 0.06},
        {transform: `${at3d(0, 0, 1)} scale(1.03)`, opacity: 0.85, offset: 0.7},
        {transform: `${at3d(0, 0, 1)} scale(1.05)`, opacity: 0}
      ], {duration: 2400, delay: at, easing: "ease-out"}),
      area.animate([
        {transform: "translate(0, 0)"}, {transform: `translate(${px(-k)}, ${px(k)})`},
        {transform: `translate(${px(k)}, ${px(-k * 0.6)})`}, {transform: `translate(${px(-k * 0.4)}, ${px(-k * 0.3)})`},
        {transform: "translate(0, 0)"}
      ], {duration: 300, delay: at, easing: "linear"})
    ];
  }
};

/**
 * The inside of a see-through die: a tinted disc at its middle that always faces the viewer. It stands in for the
 * faces at the back, which a see-through die does not draw: drawing and sorting twice as many half transparent faces
 * cost the browser most of its frames on large throws.
 * @param {object} look
 * @returns {HTMLElement|null}
 */
export function buildInner(look) {
  if ( !look.seeThrough ) return null;
  const inner = document.createElement("div");
  inner.className = `ssd-inner ssd-inner-${look.finish}`;
  inner.style.setProperty("--ssd-glass-dark", look.glassDark);
  inner.style.setProperty("--ssd-glass-body", look.glassBody);
  inner.style.setProperty("--ssd-glass-light", look.glassLight);
  return inner;
}

/** Things inside a die drawn as an icon. */
export const CORE_ICONS = {heart: "fa-heart", moon: "fa-moon", sun: "fa-sun", snowflake: "fa-snowflake", skull: "fa-skull",
  bolt: "fa-bolt", ghost: "fa-ghost", leaf: "fa-leaf", note: "fa-music", gear: "fa-gear", yinyang: "fa-yin-yang",
  shield: "fa-shield-halved", mask: "fa-mask", feather: "fa-feather", paw: "fa-paw", ankh: "fa-ankh",
  book: "fa-book-open", fist: "fa-hand-fist", flask: "fa-flask", brain: "fa-brain", axe: "fa-axe-battle",
  sword: "fa-sword", bow: "fa-bow-arrow", hat: "fa-hat-wizard", crow: "fa-crow", spider: "fa-spider", dove: "fa-dove"};

/**
 * What floats inside a see-through die: a glowing orb, a flame, a swirl, fireflies, an eye or a star. A flat picture
 * at the center of the die that always faces the viewer, so the faces in front of it cover it and the ones behind do
 * not, like a real thing inside glass.
 * @param {object} look
 * @returns {HTMLElement|null}
 */
export function buildCore(look, {size = 56, animate = true} = {}) {
  if ( !look.seeThrough || !look.core || (look.core === "none") ) return null;
  const core = document.createElement("div");
  core.className = `ssd-core ssd-core-${look.core}`;
  if ( CORE_ICONS[look.core] ) core.classList.add("ssd-core-symbol");
  paintEffect(core, look, "core");
  const inner = document.createElement("div");
  inner.className = "ssd-core-in";
  // Fireflies are three lights on their own orbits, the eyes have an iris
  const parts = {fireflies: 3, eye: 1, dragoneye: 1}[look.core] ?? 0;
  for ( let i = 0; i < parts; i++ ) inner.append(document.createElement("i"));
  // Symbols are Font Awesome icons, which Foundry brings along, in the color of the light
  const icon = CORE_ICONS[look.core];
  if ( icon ) {
    const glyph = document.createElement("i");
    glyph.className = `fa-solid ${icon} ssd-core-icon`;
    inner.append(glyph);
  }
  core.append(inner);
  // Fireflies circle on their own radius and speed, as Web Animations so the compositor plays them
  if ( animate && (look.core === "fireflies") ) {
    [[0.12, 2200, 1, 0], [0.2, 3100, -1, -900], [0.16, 1700, 1, -600]].forEach(([radius, duration, way, delay], i) => {
      const r = Math.round(size * radius * 10) / 10;
      inner.children[i].animate([
        {transform: `rotate(0deg) translateX(${r}px) scale(1)`},
        {transform: `rotate(${way * 180}deg) translateX(${r}px) scale(0.6)`},
        {transform: `rotate(${way * 360}deg) translateX(${r}px) scale(1)`}
      ], {duration, delay, iterations: Infinity});
    });
  }
  return core;
}

/**
 * Show a die at rest without the throw (reduced motion): it fades in at its place.
 * @param {object} built
 * @param {HTMLElement} shadow
 * @param {object} plan
 * @param {object} options
 * @returns {Animation[]}
 */
export function placeDie(built, shadow, plan, {width, height, unit, delay, core = null, inner = null}) {
  const rest = unit * 0.95;
  if ( inner ) inner.style.transform = `translate3d(${px(plan.end.x * width)}, ${px(plan.end.y * height)}, ${px(rest * 0.55)})`;
  if ( core ) core.style.transform = `translate3d(${px(plan.end.x * width)}, ${px(plan.end.y * height)}, ${px(rest)})`;
  built.element.style.transform = `matrix3d(${cssMatrix(built.resting, [plan.end.x * width, plan.end.y * height, rest]).join(",")})`;
  for ( const face of built.faces ) face.shade.style.opacity = String(shadeOf(built.resting, face.normal));
  shadow.style.transform = `translate(${px(plan.end.x * width)}, ${px(plan.end.y * height)})`;
  const timing = {duration: 220, delay, fill: "backwards", easing: "ease-out"};
  return [...built.faces.map(f => f.element.animate([{opacity: 0}, {opacity: 1}], timing)),
    shadow.animate([{opacity: 0}, {opacity: 0.55}], {...timing, fill: "both"})];
}
