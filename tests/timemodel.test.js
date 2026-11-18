import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOT_INTERVAL_MIN,
  SLOT_LENGTH_MIN,
  SLOTS_PER_DAY,
} from '../src/config.js';
import {
  colorCount,
  colorIndex,
  decodeColor,
  startMinute,
  endMinute,
  restBetween,
  durationFits,
  formatClock,
} from '../src/timemodel.js';

test('color index round-trips through (day, slot)', () => {
  for (let day = 0; day < 8; day++) {
    for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
      const color = colorIndex(day, slot);
      assert.deepEqual(decodeColor(color), { day, slot });
    }
  }
  assert.equal(colorCount(5), 20);
});

test('start minutes are injective across all colors', () => {
  const seen = new Set();
  for (let c = 0; c < colorCount(10); c++) {
    const t = startMinute(c);
    assert.ok(!seen.has(t), `duplicate minute coordinate at color ${c}`);
    seen.add(t);
  }
});

test('clock formatting', () => {
  assert.equal(formatClock(540), '09:00');
  assert.equal(formatClock(990), '16:30');
  assert.equal(formatClock(1440 + 540), '09:00');
});

test('duration changes the rest between adjacent slots', () => {
  const long = { id: 1, durationMin: 120 };
  const short = { id: 2, durationMin: 60 };
  const slot0 = colorIndex(0, 0);
  const slot1 = colorIndex(0, 1);
  assert.equal(startMinute(slot1) - startMinute(slot0), SLOT_INTERVAL_MIN);
  assert.equal(restBetween(long, slot0, long, slot1), 30);
  assert.equal(restBetween(short, slot0, short, slot1), 90);
  assert.equal(endMinute(long, slot0) - startMinute(slot0), 120);
});

test('a 45 minute rest threshold separates long and short exams', () => {
  const long = { id: 1, durationMin: 120 };
  const short = { id: 2, durationMin: 60 };
  const adjacent = [colorIndex(0, 0), colorIndex(0, 1)];
  assert.ok(restBetween(long, adjacent[0], long, adjacent[1]) < 45);
  assert.ok(restBetween(short, adjacent[0], short, adjacent[1]) >= 45);
});

test('gap of one intervening slot always clears SLOT_INTERVAL_MIN', () => {
  const subject = { id: 1, durationMin: SLOT_LENGTH_MIN };
  const c0 = colorIndex(0, 0);
  const c2 = colorIndex(0, 2);
  assert.ok(restBetween(subject, c0, subject, c2) >= SLOT_INTERVAL_MIN);
});

test('durationFits rejects zero, negative and overlong durations', () => {
  assert.equal(durationFits({ durationMin: 90 }), true);
  assert.equal(durationFits({ durationMin: SLOT_LENGTH_MIN }), true);
  assert.equal(durationFits({ durationMin: 0 }), false);
  assert.equal(durationFits({ durationMin: SLOT_LENGTH_MIN + 1 }), false);
});

test('cross-day rest is large and positive', () => {
  const subject = { id: 1, durationMin: 120 };
  const lastOfDay0 = colorIndex(0, 3);
  const firstOfDay1 = colorIndex(1, 0);
  assert.ok(restBetween(subject, lastOfDay0, subject, firstOfDay1) > 600);
});
