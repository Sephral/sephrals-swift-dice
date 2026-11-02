import assert from "node:assert/strict";
import test from "node:test";

import {dieModel, dot, restingTurn} from "../scripts/geometry.mjs";
import {LANDING_PARTS, THROW_STYLES, TRAILS, burstParticles, confettiRain, contactTimes, fireworkPlan, hashText, heightAt,
  landingParticles, planThrow, poseAt, positionAt, restingPlaces, samplePath, seededRandom, shadeOf, stepsFor,
  trailParticles, travelAt} from "../scripts/motion.mjs";

test("the same seed gives the same numbers, another seed others", () => {
  const a = seededRandom("abc:0");
  const b = seededRandom("abc:0");
  const c = seededRandom("abc:1");
  const first = [a(), a(), a()];
  assert.deepEqual([b(), b(), b()], first);
  assert.notDeepEqual([c(), c(), c()], first);
  for ( const x of first ) assert.ok((x >= 0) && (x < 1));
  assert.equal(hashText(""), 0x811c9dc5);
});

test("resting places stay inside the area and apart", () => {
  for ( const count of [1, 2, 5, 10, 20] ) {
    const places = restingPlaces(count, seededRandom(`p${count}`), 1.6);
    assert.equal(places.length, count);
    for ( const p of places ) assert.ok(p.x > 0.05 && p.x < 0.95 && p.y > 0.05 && p.y < 0.95, JSON.stringify(p));
    for ( let i = 0; i < count; i++ ) {
      for ( let j = i + 1; j < count; j++ ) {
        const dx = (places[i].x - places[j].x) * 1.6;
        const dy = places[i].y - places[j].y;
        assert.ok(Math.hypot(dx, dy) > 0.06, `dice ${i} and ${j} of ${count} overlap`);
      }
    }
  }
});

test("a throw is the same for the same seed", () => {
  const one = planThrow(4, {rand: seededRandom("m1:0")});
  const two = planThrow(4, {rand: seededRandom("m1:0")});
  assert.deepEqual(one, two);
});

test("height and travel start and end where they should", () => {
  assert.equal(heightAt(0), 1);
  assert.equal(heightAt(1), 0);
  for ( let i = 0; i <= 100; i++ ) assert.ok(heightAt(i / 100) >= 0);
  assert.equal(travelAt(0), 0);
  assert.equal(travelAt(1), 1);
});

test("at the end of a throw the die rests exactly on its place and face", () => {
  const model = dieModel("d20");
  const plan = planThrow(3, {rand: seededRandom("rest")})[1];
  const resting = restingTurn(model, 7, plan.spin);
  const end = poseAt(plan, resting, 1);
  assert.equal(end.z, 0);
  assert.ok(Math.abs(end.x - plan.end.x) < 1e-12 && Math.abs(end.y - plan.end.y) < 1e-12);
  for ( let i = 0; i < 3; i++ ) for ( let j = 0; j < 3; j++ ) assert.ok(Math.abs(end.turn[i][j] - resting[i][j]) < 1e-9);
  const start = poseAt(plan, resting, 0);
  assert.ok(start.x > 1, "the die comes in from the right");
});

test("between two animation steps the die never turns more than a quarter turn", () => {
  // The browser interpolates between steps along the shortest turn, larger steps would look wrong
  for ( const seed of ["a", "b", "c", "d", "e"] ) {
    const plan = planThrow(1, {rand: seededRandom(seed)})[0];
    const path = samplePath(plan, restingTurn(dieModel("d6"), 0, plan.spin), 40);
    for ( let i = 1; i < path.length; i++ ) {
      const a = path[i - 1].turn;
      const b = path[i].turn;
      // Angle of b * a^T from its trace
      let trace = 0;
      for ( let k = 0; k < 3; k++ ) trace += dot(b[k], a[k]);
      const angle = Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2)));
      assert.ok(angle < Math.PI / 2, `step ${i} of ${seed} turns ${angle}`);
    }
  }
});

test("faces toward the light are lighter than faces away from it", () => {
  const model = dieModel("d6");
  const r = restingTurn(model, 0);
  const top = shadeOf(r, model.faces[0].normal);
  const sides = model.faces.slice(1).map(f => shadeOf(r, f.normal));
  assert.ok(sides.every(s => s >= top));
  assert.ok(top >= 0 && top <= 0.7);
});

test("trail particles follow the die while it moves, the same for the same seed", () => {
  const plan = planThrow(1, {rand: seededRandom("trail")})[0];
  for ( const kind of Object.keys(TRAILS) ) {
    const a = trailParticles(plan, kind, 10, seededRandom("fx"));
    const b = trailParticles(plan, kind, 10, seededRandom("fx"));
    assert.deepEqual(a, b, kind);
    assert.equal(a.length, 10);
    for ( const p of a ) {
      assert.ok(p.t > 0 && p.t <= 0.8, `${kind} starts while the die moves`);
      assert.deepEqual(p.from, positionAt(plan, p.t));
      assert.ok(p.life > 200 && p.life < 1500);
    }
  }
  assert.deepEqual(trailParticles(plan, "none", 10, seededRandom("x")), []);
  assert.deepEqual(trailParticles(plan, "sparks", 0, seededRandom("x")), []);
});

test("a burst on the highest result rises, on the lowest it sinks", () => {
  const up = burstParticles("max", 20, seededRandom("b"));
  const down = burstParticles("min", 14, seededRandom("b"));
  assert.equal(up.length, 20);
  assert.equal(down.length, 14);
  assert.ok(up.every(p => p.dz > 0));
  assert.ok(down.every(p => p.dz < 0));
});

test("landing particles spread around the die, the same for the same seed", () => {
  for ( const kind of Object.keys(LANDING_PARTS) ) {
    const a = landingParticles(kind, seededRandom("land"));
    assert.deepEqual(a, landingParticles(kind, seededRandom("land")), kind);
    assert.equal(a.length, LANDING_PARTS[kind].count);
    for ( const p of a ) assert.ok(Math.hypot(p.dx, p.dy) >= 0.29 && p.dz > 0 && p.life > 300, kind);
  }
  assert.deepEqual(landingParticles("shockwave", seededRandom("x")), []);
});

test("large throws give each die fewer landing particles, never fewer than three", () => {
  assert.equal(landingParticles("splash", seededRandom("s"), 1).length, LANDING_PARTS.splash.count);
  assert.equal(landingParticles("splash", seededRandom("s"), 0.4).length, Math.round(LANDING_PARTS.splash.count * 0.4));
  assert.equal(landingParticles("sparkle", seededRandom("s"), 0.1).length, 3);
});

test("every throw style ends exactly on its place, full size, on the rolled face", () => {
  for ( const style of THROW_STYLES ) {
    for ( const from of ["right", "bottom"] ) {
      for ( const plan of planThrow(4, {rand: seededRandom(`end:${style}:${from}`), style, from}) ) {
        assert.equal(plan.style, style);
        const resting = restingTurn(dieModel("d12"), 2, plan.spin);
        const end = poseAt(plan, resting, 1);
        assert.ok(Math.abs(end.x - plan.end.x) < 1e-9 && Math.abs(end.y - plan.end.y) < 1e-9, `${style} place`);
        assert.ok(Math.abs(end.z) < 1e-9 && Math.abs(end.scale - 1) < 1e-9, `${style} height and size`);
        for ( let i = 0; i < 3; i++ ) for ( let j = 0; j < 3; j++ ) assert.ok(Math.abs(end.turn[i][j] - resting[i][j]) < 1e-9);
      }
    }
  }
  // An unknown style throws the classic way
  assert.equal(planThrow(1, {rand: seededRandom("x"), style: "trebuchet"})[0].style, "classic");
});

test("no throw style turns a die more than a quarter turn between two animation steps", () => {
  for ( const style of THROW_STYLES ) {
    for ( const seed of ["a", "b", "c", "d"] ) {
      for ( const plan of planThrow(3, {rand: seededRandom(`${seed}${style}`), style}) ) {
        const path = samplePath(plan, restingTurn(dieModel("d20"), 5, plan.spin), stepsFor(1000 * (1 - plan.delay)));
        for ( let i = 1; i < path.length; i++ ) {
          let trace = 0;
          for ( let k = 0; k < 3; k++ ) trace += dot(path[i].turn[k], path[i - 1].turn[k]);
          const angle = Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2)));
          assert.ok(angle < Math.PI / 2, `${style} step ${i} turns ${angle}`);
          assert.ok(Number.isFinite(path[i].x) && Number.isFinite(path[i].z) && (path[i].scale >= 0), style);
        }
      }
    }
  }
});

test("dice wait in the hand or the cup, and trails start after the release", () => {
  for ( const style of ["hand", "cup"] ) {
    const plan = planThrow(1, {rand: seededRandom(style), style})[0];
    assert.ok(plan.release > 0.2 && plan.hold);
    const held = positionAt(plan, plan.release * 0.5);
    assert.ok(Math.abs(held.x - plan.hold.x) < 0.05 && Math.abs(held.y - plan.hold.y) < 0.05, style);
    if ( style === "cup" ) assert.equal(held.scale, 0, "hidden in the cup");
    for ( const p of trailParticles(plan, "sparks", 6, seededRandom("t")) ) assert.ok(p.t >= plan.release, style);
    for ( const c of contactTimes(plan) ) assert.ok(c.t > plan.release, style);
  }
  const teleport = planThrow(1, {rand: seededRandom("tp"), style: "teleport"})[0];
  assert.deepEqual(teleport.start, teleport.end);
  assert.equal(positionAt(teleport, 0).scale, 0, "a teleported die appears from nothing");
  const cannon = planThrow(4, {rand: seededRandom("c"), style: "cannon"});
  assert.ok(cannon.every((p, i) => (i === 0) || (p.delay > cannon[i - 1].delay)), "the cannon fires one after the other");
});

test("fireworks and confetti are planned from the seed", () => {
  assert.deepEqual(fireworkPlan(seededRandom("f")), fireworkPlan(seededRandom("f")));
  assert.equal(fireworkPlan(seededRandom("f"))[0].sparks.length, 14);
  const rain = confettiRain(seededRandom("c"), 20);
  assert.equal(rain.length, 20);
  assert.ok(rain.every(p => (p.x >= 0) && (p.x <= 1) && (p.life > 1000)));
});
