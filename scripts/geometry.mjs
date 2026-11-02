/**
 * The dice as solids: corners, faces and their numbers, and the turn that brings a result face toward the viewer.
 * Pure math without Foundry or the page, so the tests can check every face of every die.
 *
 * Coordinates follow CSS 3D: x to the right, y down, z toward the viewer. A die lies on the table, which is the plane
 * of the screen, and the face facing the viewer is its result.
 */

const PHI = (1 + Math.sqrt(5)) / 2;
const EPS = 1e-6;

/* -------------------------------------------- */
/*  Vectors and turns                           */
/* -------------------------------------------- */

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
export const cross = (a, b) => [(a[1] * b[2]) - (a[2] * b[1]), (a[2] * b[0]) - (a[0] * b[2]), (a[0] * b[1]) - (a[1] * b[0])];
export const length = a => Math.hypot(a[0], a[1], a[2]);
export const normalize = a => {
  const l = length(a);
  return l > EPS ? scale(a, 1 / l) : [0, 0, 0];
};

/**
 * A 3x3 turn applied to a vector. Turns are row-major arrays of three rows.
 * @param {number[][]} m
 * @param {number[]} v
 * @returns {number[]}
 */
export function apply(m, v) {
  return [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
}

/**
 * Two turns after each other: first b, then a.
 * @param {number[][]} a
 * @param {number[][]} b
 * @returns {number[][]}
 */
export function multiply(a, b) {
  const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for ( let i = 0; i < 3; i++ ) {
    for ( let j = 0; j < 3; j++ ) out[i][j] = (a[i][0] * b[0][j]) + (a[i][1] * b[1][j]) + (a[i][2] * b[2][j]);
  }
  return out;
}

/**
 * The turn by an angle around an axis (right hand rule).
 * @param {number[]} axis
 * @param {number} angle   In radians
 * @returns {number[][]}
 */
export function axisAngle(axis, angle) {
  const [x, y, z] = normalize(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = 1 - c;
  return [
    [(k * x * x) + c, (k * x * y) - (s * z), (k * x * z) + (s * y)],
    [(k * x * y) + (s * z), (k * y * y) + c, (k * y * z) - (s * x)],
    [(k * x * z) - (s * y), (k * y * z) + (s * x), (k * z * z) + c]
  ];
}

/* -------------------------------------------- */
/*  Solids                                      */
/* -------------------------------------------- */

/**
 * The faces of the convex hull of some corners. Every face lists its corners counterclockwise seen from outside.
 * Brute force over all triples, fine for the twenty corners of the largest die.
 * @param {number[][]} vertices
 * @returns {{indices: number[], normal: number[], center: number[]}[]}
 */
export function hullFaces(vertices) {
  const faces = [];
  const seen = new Set();
  const n = vertices.length;
  for ( let i = 0; i < n; i++ ) {
    for ( let j = i + 1; j < n; j++ ) {
      for ( let k = j + 1; k < n; k++ ) {
        let normal = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
        if ( length(normal) < EPS ) continue;
        normal = normalize(normal);
        let d = dot(normal, vertices[i]);
        const sides = vertices.map(v => dot(normal, v) - d);
        if ( sides.every(s => s <= 1e-5) ) { /* outward already */ }
        else if ( sides.every(s => s >= -1e-5) ) {
          normal = scale(normal, -1);
          d = -d;
        }
        else continue;
        const key = normal.map(x => Math.round(x * 1e4)).join(",");
        if ( seen.has(key) ) continue;
        seen.add(key);
        const on = vertices.map((v, index) => index).filter(index => Math.abs(dot(normal, vertices[index]) - d) < 1e-5);
        const center = scale(on.reduce((sum, index) => add(sum, vertices[index]), [0, 0, 0]), 1 / on.length);
        const e1 = normalize(sub(vertices[on[0]], center));
        const e2 = cross(normal, e1);
        const angle = index => {
          const p = sub(vertices[index], center);
          return Math.atan2(dot(p, e2), dot(p, e1));
        };
        on.sort((a, b) => angle(a) - angle(b));
        faces.push({indices: on, normal, center});
      }
    }
  }
  return faces;
}

/**
 * The corners of each solid before scaling.
 * @type {Record<string, () => number[][]>}
 */
const CORNERS = {
  tetra: () => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  cube: () => {
    const out = [];
    for ( const x of [-1, 1] ) for ( const y of [-1, 1] ) for ( const z of [-1, 1] ) out.push([x, y, z]);
    return out;
  },
  octa: () => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  trapezo: () => {
    // Pentagonal trapezohedron: two tips and a zigzag ring. The ring height keeps every kite flat.
    const h = 1.05;
    const c36 = Math.cos(Math.PI / 5);
    const z0 = h * (1 - c36) / (1 + c36);
    const out = [[0, 0, h], [0, 0, -h]];
    for ( let k = 0; k < 5; k++ ) {
      const up = (2 * Math.PI * k) / 5;
      const down = up + (Math.PI / 5);
      out.push([Math.cos(up), Math.sin(up), z0], [Math.cos(down), Math.sin(down), -z0]);
    }
    return out;
  },
  dodeca: () => {
    const out = [];
    const a = 1 / PHI;
    for ( const x of [-1, 1] ) for ( const y of [-1, 1] ) for ( const z of [-1, 1] ) out.push([x, y, z]);
    for ( const s of [-1, 1] ) {
      for ( const t of [-1, 1] ) out.push([0, s * a, t * PHI], [s * a, t * PHI, 0], [s * PHI, 0, t * a]);
    }
    return out;
  },
  icosa: () => {
    const out = [];
    for ( const s of [-1, 1] ) {
      for ( const t of [-1, 1] ) out.push([0, s, t * PHI], [s, t * PHI, 0], [s * PHI, 0, t]);
    }
    return out;
  }
};

/**
 * How large each solid appears next to the others (its corners lie on a sphere of this radius).
 * @type {Record<string, number>}
 */
const SIZES = {tetra: 1.2, cube: 0.95, octa: 1.05, trapezo: 1.02, dodeca: 1.0, icosa: 1.02};

/**
 * Corners and faces of a solid, scaled to its size. A coin is a flat cylinder: two round faces and a rim of small
 * strips.
 * @param {string} solid
 * @returns {{vertices: number[][], faces: object[]}}
 */
export function buildSolid(solid) {
  if ( solid === "coin" ) return buildCoin();
  const raw = CORNERS[solid]();
  const radius = Math.max(...raw.map(length));
  const vertices = raw.map(v => scale(v, SIZES[solid] / radius));
  const faces = hullFaces(vertices).map(face => ({...face, kind: "face", polygon: null}));
  return {vertices, faces};
}

/** Corners of the round faces of a coin, and its half thickness. */
const COIN_SEGMENTS = 16;
const COIN_RADIUS = 0.9;
const COIN_HALF = 0.11;

/**
 * A coin lying flat: the face +z and the face -z, and the rim.
 * @returns {{vertices: number[][], faces: object[]}}
 */
function buildCoin() {
  const vertices = [];
  for ( let i = 0; i < COIN_SEGMENTS; i++ ) {
    const a = (2 * Math.PI * i) / COIN_SEGMENTS;
    vertices.push([COIN_RADIUS * Math.cos(a), COIN_RADIUS * Math.sin(a), COIN_HALF]);
  }
  for ( let i = 0; i < COIN_SEGMENTS; i++ ) {
    const a = (2 * Math.PI * i) / COIN_SEGMENTS;
    vertices.push([COIN_RADIUS * Math.cos(a), COIN_RADIUS * Math.sin(a), -COIN_HALF]);
  }
  const top = [...Array(COIN_SEGMENTS).keys()];
  const bottom = top.map(i => COIN_SEGMENTS + ((COIN_SEGMENTS - i) % COIN_SEGMENTS));
  const faces = [
    {kind: "face", indices: top, normal: [0, 0, 1], center: [0, 0, COIN_HALF]},
    {kind: "face", indices: bottom, normal: [0, 0, -1], center: [0, 0, -COIN_HALF]}
  ];
  for ( let i = 0; i < COIN_SEGMENTS; i++ ) {
    const j = (i + 1) % COIN_SEGMENTS;
    const indices = [i, COIN_SEGMENTS + i, COIN_SEGMENTS + j, j];
    const center = scale(indices.reduce((sum, index) => add(sum, vertices[index]), [0, 0, 0]), 1 / 4);
    faces.push({kind: "rim", indices, normal: normalize([center[0], center[1], 0]), center});
  }
  return {vertices, faces};
}

/* -------------------------------------------- */
/*  Dice                                        */
/* -------------------------------------------- */

/**
 * The die types the module draws, with their solid.
 * d4 is read at the top corner, all others at the face toward the viewer.
 * @type {Record<string, {solid: string, faces: number}>}
 */
export const DIE_TYPES = {
  d4: {solid: "tetra", faces: 4},
  d6: {solid: "cube", faces: 6},
  d8: {solid: "octa", faces: 8},
  d10: {solid: "trapezo", faces: 10},
  d12: {solid: "dodeca", faces: 12},
  d20: {solid: "icosa", faces: 20},
  coin: {solid: "coin", faces: 2}
};

/**
 * Pairs of opposite faces, in the order the hull found them.
 * @param {object[]} faces
 * @returns {number[][]}
 */
export function oppositePairs(faces) {
  const pairs = [];
  const used = new Set();
  faces.forEach((face, i) => {
    if ( used.has(i) ) return;
    const j = faces.findIndex((other, index) => !used.has(index) && (index !== i) && (dot(face.normal, other.normal) < -0.999));
    if ( j < 0 ) return;
    used.add(i);
    used.add(j);
    pairs.push([i, j]);
  });
  return pairs;
}

/**
 * The number of every face: opposite faces add up to faces + 1, as on real dice.
 * @param {object[]} faces
 * @returns {number[]}
 */
export function faceNumbers(faces) {
  const numbers = new Array(faces.length).fill(0);
  const total = faces.length + 1;
  oppositePairs(faces).forEach(([i, j], k) => {
    // Alternate which side gets the low number, so low and high numbers spread over the die
    const low = k + 1;
    if ( k % 2 ) {
      numbers[i] = total - low;
      numbers[j] = low;
    } else {
      numbers[i] = low;
      numbers[j] = total - low;
    }
  });
  return numbers;
}

/**
 * The direction "up" for the writing on a face: toward a corner on triangles, pentagons and kites (the tip), toward
 * an edge on squares.
 * @param {object} face
 * @param {number[][]} vertices
 * @returns {number[]}
 */
function faceUp(face, vertices) {
  const corners = face.indices.map(i => vertices[i]);
  let target;
  if ( corners.length === 4 && (face.kind === "face") ) {
    const distances = corners.map(c => length(sub(c, face.center)));
    const far = distances.indexOf(Math.max(...distances));
    const near = distances.indexOf(Math.min(...distances));
    // A square has all corners at the same distance: point at the middle of an edge. A kite points at its tip.
    target = (distances[far] - distances[near] < 1e-3) ? scale(add(corners[0], corners[1]), 0.5) : corners[far];
  }
  else target = corners[0];
  const v = sub(target, face.center);
  return normalize(sub(v, scale(face.normal, dot(v, face.normal))));
}

/** Built dice by type. */
const cache = new Map();

/**
 * Everything to draw a die type: its corners, and per face the frame (center, normal, up, right), the outline in the
 * frame of the face, the inner radius for the size of the writing, and its number.
 * @param {string} type   A key of DIE_TYPES
 * @returns {{type: string, solid: string, vertices: number[][], faces: object[], vertexNumbers?: number[]}}
 */
export function dieModel(type) {
  if ( cache.has(type) ) return cache.get(type);
  const def = DIE_TYPES[type];
  if ( !def ) throw new Error(`Unknown die type ${type}`);
  const {vertices, faces} = buildSolid(def.solid);
  const numbered = faces.filter(f => f.kind === "face");
  const numbers = (type === "d4") ? null : faceNumbers(numbered);
  const model = {type, solid: def.solid, vertices, faces: []};
  if ( type === "d4" ) model.vertexNumbers = vertices.map((v, i) => i + 1);
  let n = 0;
  for ( const face of faces ) {
    const up = faceUp(face, vertices);
    // Screen "down" in the frame of the face is the opposite of up, and right completes the frame
    const down = scale(up, -1);
    const right = cross(down, face.normal);
    const polygon = face.indices.map(i => {
      const p = sub(vertices[i], face.center);
      return [dot(p, right), dot(p, down)];
    });
    const inradius = Math.min(...polygon.map((p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      const edge = [q[0] - p[0], q[1] - p[1]];
      const len = Math.hypot(edge[0], edge[1]);
      return Math.abs((p[0] * edge[1]) - (p[1] * edge[0])) / len;
    }));
    const entry = {kind: face.kind, normal: face.normal, center: face.center, up, right, down, polygon, inradius,
      indices: face.indices};
    if ( face.kind === "face" ) {
      entry.number = numbers ? numbers[n] : null;
      n++;
    }
    model.faces.push(entry);
  }
  cache.set(type, model);
  return model;
}

/**
 * The turn that puts a direction of the die toward the viewer, with "up" of the die pointing up on the screen,
 * turned by a small angle.
 * @param {number[]} toward   Direction in the die that ends up facing the viewer
 * @param {number[]} up       Direction in the die that ends up pointing up on the screen
 * @param {number} [spin=0]   Turn on the table in radians
 * @returns {number[][]}
 */
export function orientToward(toward, up, spin = 0) {
  const n = normalize(toward);
  const u = normalize(sub(up, scale(n, dot(up, n))));
  const w = cross(n, u);
  const U = [Math.sin(spin), -Math.cos(spin), 0];
  const W = [Math.cos(spin), Math.sin(spin), 0];
  const Z = [0, 0, 1];
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for ( let i = 0; i < 3; i++ ) {
    for ( let j = 0; j < 3; j++ ) r[i][j] = (U[i] * u[j]) + (W[i] * w[j]) + (Z[i] * n[j]);
  }
  return r;
}

/** How far a d4 at rest leans toward the viewer, in radians. */
const D4_TILT = 0.5;

/**
 * The turn at rest for a face (or, on a d4, a corner) of a die.
 * @param {object} model   From dieModel
 * @param {number} index   Face index into model.faces, or corner index on a d4
 * @param {number} [spin=0]
 * @returns {number[][]}
 */
export function restingTurn(model, index, spin = 0) {
  if ( model.type === "d4" ) {
    const corner = model.vertices[index];
    // One face lies below the top corner on the screen: up points from the middle of its far edge to the corner, so
    // the number at its top corner stands upright
    const others = model.vertices.filter((v, i) => i !== index);
    const below = scale(add(others[0], others[1]), 0.5);
    // Seen from straight above all three faces lean away steeply; tipping the die toward the viewer makes the face
    // below readable
    return multiply(axisAngle([1, 0, 0], D4_TILT), orientToward(corner, sub(corner, below), spin));
  }
  const face = model.faces[index];
  return orientToward(face.normal, face.up, spin);
}

/**
 * The faces (or d4 corners) that show a value.
 * @param {object} model
 * @param {(number: number) => boolean} test   Tests the number of a face
 * @returns {number[]}
 */
export function indicesShowing(model, test) {
  if ( model.type === "d4" ) return model.vertexNumbers.map((n, i) => (test(n) ? i : -1)).filter(i => i >= 0);
  return model.faces.map((f, i) => ((f.kind === "face") && test(f.number) ? i : -1)).filter(i => i >= 0);
}

/**
 * The 16 numbers of a CSS matrix3d (column major) for a turn and a shift.
 * @param {number[][]} r
 * @param {number[]} [t=[0,0,0]]
 * @returns {number[]}
 */
export function cssMatrix(r, t = [0, 0, 0]) {
  return [
    r[0][0], r[1][0], r[2][0], 0,
    r[0][1], r[1][1], r[2][1], 0,
    r[0][2], r[1][2], r[2][2], 0,
    t[0], t[1], t[2], 1
  ];
}

/**
 * The frame of a face as a turn: its right, down and outward directions become x, y and z.
 * @param {object} face
 * @returns {number[][]}
 */
export function faceTurn(face) {
  // Columns: right, down, normal
  return [
    [face.right[0], face.down[0], face.normal[0]],
    [face.right[1], face.down[1], face.normal[1]],
    [face.right[2], face.down[2], face.normal[2]]
  ];
}

export const __test__ = {CORNERS, SIZES, COIN_SEGMENTS};
