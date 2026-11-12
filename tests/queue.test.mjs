import {test} from "node:test";
import assert from "node:assert/strict";
import {__test__} from "../scripts/chat.mjs";

const {LEAD, GAP, QUEUE_LIMIT, planStart} = __test__;

test("a throw on an empty table starts at once", () => {
  const plan = planStart({now: 1000, duration: 1400, queueEnd: 0, sequential: true});
  assert.equal(plan.startAt, 1000 + LEAD);
  assert.equal(plan.queueEnd, 1000 + LEAD + 1400);
});

test("damage right after the attack waits until the attack dice lie still", () => {
  const attack = planStart({now: 1000, duration: 1400, queueEnd: 0, sequential: true});
  const damage = planStart({now: 1030, duration: 1400, queueEnd: attack.queueEnd, sequential: true});
  assert.equal(damage.startAt, attack.queueEnd + GAP);
  assert.equal(damage.queueEnd, damage.startAt + 1400);
});

test("without one throw after the other both start at once", () => {
  const attack = planStart({now: 1000, duration: 1400, queueEnd: 0, sequential: false});
  const damage = planStart({now: 1030, duration: 1400, queueEnd: attack.queueEnd, sequential: false});
  assert.equal(damage.startAt, 1030 + LEAD);
});

test("a long queue never holds a throw longer than the limit", () => {
  let end = 0;
  const starts = [];
  for ( let i = 0; i < 6; i++ ) {
    const plan = planStart({now: 1000, duration: 1900, queueEnd: end, sequential: true});
    end = plan.queueEnd;
    starts.push(plan.startAt);
  }
  for ( const start of starts ) assert.ok(start - (1000 + LEAD) <= QUEUE_LIMIT);
  assert.ok(starts.includes(1000 + LEAD));
});

test("a throw after the queue ran out starts at once", () => {
  const plan = planStart({now: 9000, duration: 1400, queueEnd: 2500, sequential: true});
  assert.equal(plan.startAt, 9000 + LEAD);
});
