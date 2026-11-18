/**
 * Deterministic pseudo-random utilities shared by the browser, unit tests and
 * the offline experiment. No Math.random(), no Date, no platform APIs.
 */

/** mulberry32: a small, fast, well-distributed 32-bit seeded PRNG. */
export function mulberry32(seed) {
  let a = Number(seed) >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive integer in [min, max]. */
export function randomInt(rng, min, max) {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

/** Fisher-Yates shuffle returning a new array; consumes the supplied RNG stream. */
export function shuffle(rng, items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Pick k distinct items without replacement. */
export function sample(rng, items, k) {
  const pool = shuffle(rng, items);
  return pool.slice(0, Math.max(0, Math.min(k, pool.length)));
}
