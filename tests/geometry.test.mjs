import assert from "node:assert/strict";
import test from "node:test";

import {DIE_TYPES, apply, cross, dieModel, dot, indicesShowing, length, multiply, oppositePairs, orientToward,
  restingTurn, sub} from "../scripts/geometry.mjs";

const FACES = {d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, coin: 2};
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const closeVec = (a, b, eps = 1e-6) => a.every((x, i) => close(x, b[i], eps));

/**
 * A turn is a rotation: rows of length 1, at right angles, no mirror.
 * @param {number[][]} r
 */
function assertRotation(r) {
  for ( let i = 0; i < 3; i++ ) {
    assert.ok(close(length(r[i]), 1), `row ${i} has length ${length(r[i])}`);
    for ( let j = i + 1; j < 3; j++ ) assert.ok(close(dot(r[i], r[j]), 0));
  }
  assert.ok(close(dot(cross(r[0], r[1]), r[2]), 1), "mirrored");
}

test("every die has the right number of faces", () => {
  for ( const [type, count] of Object.entries(FACES) ) {
    const model = dieModel(type);
    assert.equal(model.faces.filter(f => f.kind === "face").length, count, type);
  }
  assert.equal(dieModel("coin").faces.filter(f => f.kind === "rim").length, 16);
});

test("faces are flat, face outward, and their frames are right handed", () => {
  for ( const type of Object.keys(DIE_TYPES) ) {
    const model = dieModel(type);
    for ( const face of model.faces ) {
      for ( const i of face.indices ) {
        const offset = dot(sub(model.vertices[i], face.center), face.normal);
        assert.ok(Math.abs(offset) < 1e-6, `${type} face not flat (${offset})`);
      }
      assert.ok(dot(face.normal, face.center) > 0, `${type} face points inward`);
      assert.ok(closeVec(cross(face.right, face.down), face.normal), `${type} frame mirrored`);
      assert.ok(face.inradius > 0.05, `${type} face too small for a number`);
    }
  }
});

test("a d10 is a pentagonal trapezohedron with ten kites", () => {
  const model = dieModel("d10");
  assert.equal(model.vertices.length, 12);
  for ( const face of model.faces ) assert.equal(face.indices.length, 4);
});

test("opposite faces add up to the faces plus one", () => {
  for ( const type of ["d6", "d8", "d10", "d12", "d20"] ) {
    const model = dieModel(type);
    const faces = model.faces.filter(f => f.kind === "face");
    const numbers = faces.map(f => f.number).sort((a, b) => a - b);
    assert.deepEqual(numbers, [...Array(faces.length).keys()].map(i => i + 1), `${type} numbers`);
    const pairs = oppositePairs(faces);
    assert.equal(pairs.length, faces.length / 2);
    for ( const [i, j] of pairs ) assert.equal(faces[i].number + faces[j].number, faces.length + 1, type);
  }
});

test("the resting turn puts each face toward the viewer, upright", () => {
  for ( const type of ["d6", "d8", "d10", "d12", "d20", "coin"] ) {
    const model = dieModel(type);
    model.faces.forEach((face, index) => {
      if ( face.kind !== "face" ) return;
      const r = restingTurn(model, index);
      assertRotation(r);
      assert.ok(closeVec(apply(r, face.normal), [0, 0, 1]), `${type} face ${index} not toward the viewer`);
      assert.ok(closeVec(apply(r, face.up), [0, -1, 0]), `${type} face ${index} not upright`);
      // Every other face points away from the viewer or sideways
      for ( const other of model.faces ) if ( other !== face ) assert.ok(apply(r, other.normal)[2] < 0.999);
    });
  }
});

test("a spin turns the die on the table only", () => {
  const model = dieModel("d20");
  const r = restingTurn(model, 3, 0.4);
  assertRotation(r);
  assert.ok(closeVec(apply(r, model.faces[3].normal), [0, 0, 1]));
  assert.ok(closeVec(apply(r, model.faces[3].up), [Math.sin(0.4), -Math.cos(0.4), 0]));
});

test("a d4 rests with its corner up and one face upright below it, leaning toward the viewer", () => {
  const model = dieModel("d4");
  assert.deepEqual(model.vertexNumbers, [1, 2, 3, 4]);
  model.vertices.forEach((corner, index) => {
    const r = restingTurn(model, index);
    assertRotation(r);
    const dir = apply(r, corner);
    assert.ok(close(dir[0], 0) && dir[2] > 0, `corner ${index}`);
    // The corner is the point nearest to the viewer
    for ( const other of model.vertices ) if ( other !== corner ) assert.ok(apply(r, other)[2] < dir[2]);
    // The face below on the screen holds this corner, and the corner is its top
    const lower = model.faces.filter(f => f.indices.includes(index))
      .map(f => apply(r, f.center)).sort((a, b) => b[1] - a[1])[0];
    assert.ok(lower[1] > 0, "a face lies below the corner");
    assert.ok(close(lower[0], 0, 1e-6), "and straight below it");
  });
});

test("every number of every die has a face that shows it", () => {
  for ( const type of ["d6", "d8", "d10", "d12", "d20"] ) {
    const model = dieModel(type);
    for ( let n = 1; n <= DIE_TYPES[type].faces; n++ ) assert.equal(indicesShowing(model, x => x === n).length, 1);
  }
  const d4 = dieModel("d4");
  for ( let n = 1; n <= 4; n++ ) assert.equal(indicesShowing(d4, x => x === n).length, 1);
});

test("orientToward and multiply keep rotations", () => {
  const r = orientToward([1, 2, 3], [0, 1, 0], 1.1);
  assertRotation(r);
  assertRotation(multiply(r, orientToward([0, 0, 1], [1, 0, 0])));
});
