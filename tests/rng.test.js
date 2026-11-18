import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, randomInt, shuffle, sample } from '../src/rng.js';

test('mulberry32 is deterministic for the same seed', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('different seeds produce different streams', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  assert.notEqual(a(), b());
});

test('values stay inside [0, 1)', () => {
  const rng = mulberry32(20261118);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('randomInt covers an inclusive range', () => {
  const rng = mulberry32(7);
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(randomInt(rng, 2, 5));
  assert.deepEqual([...seen].sort(), [2, 3, 4, 5]);
});

test('shuffle is a permutation and does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(mulberry32(9), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});

test('sample returns distinct items and clamps k', () => {
  const rng = mulberry32(11);
  const picked = sample(rng, [1, 2, 3, 4], 3);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3);
  assert.equal(sample(rng, [1, 2], 99).length, 2);
});
