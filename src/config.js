/**
 * Global constants and configuration helpers for the exam scheduling model.
 * Every time value is expressed in minutes measured from midnight of day 0.
 * This module is pure: it has no DOM, filesystem or clock dependencies.
 */

export const SLOT_STARTS_MIN = [540, 690, 840, 990]; // 09:00, 11:30, 14:00, 16:30
export const SLOT_LENGTH_MIN = 120; // Maximum duration of a single exam.
export const SLOT_INTERVAL_MIN = 150; // Start-to-start distance between adjacent slots.
export const DAY_SPAN_MIN = 1440; // Keeps the absolute minute coordinates of different days disjoint.
export const SLOTS_PER_DAY = SLOT_STARTS_MIN.length;

export const MIN_SUBJECTS = 5;
export const MAX_SUBJECTS = 60;
export const MIN_DAYS = 1;
export const MAX_DAYS = 14;
export const DEFAULT_DURATION_MIN = 120;

/**
 * Create a default configuration. Plain arrays are used instead of Sets so the
 * whole state stays serialisable for export and deterministic replay.
 */
export function defaultConfig() {
  return {
    days: 5,
    subjectCount: 12,
    minRestMin: 30,
    electiveMin: 1,
    electiveMax: 2,
    seed: 20261118,
    disabledSlots: [], // Array of color indices.
    exclusivePairs: [], // Array of [subjectIdA, subjectIdB].
  };
}

/** Clamp an arbitrary value to an inclusive integer range. */
export function clamp(value, min, max) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Return a sanitised copy of a user-supplied configuration. */
export function normaliseConfig(raw = {}) {
  const base = defaultConfig();
  const cfg = {
    ...base,
    days: clamp(raw.days ?? base.days, MIN_DAYS, MAX_DAYS),
    subjectCount: clamp(raw.subjectCount ?? base.subjectCount, MIN_SUBJECTS, MAX_SUBJECTS),
    minRestMin: clamp(raw.minRestMin ?? base.minRestMin, 0, 600),
    electiveMin: clamp(raw.electiveMin ?? base.electiveMin, 0, MAX_SUBJECTS),
    electiveMax: clamp(raw.electiveMax ?? base.electiveMax, 0, MAX_SUBJECTS),
    seed: clamp(raw.seed ?? base.seed, 0, 2147483647),
    disabledSlots: Array.isArray(raw.disabledSlots)
      ? [...new Set(raw.disabledSlots.map(Number))].filter((n) => Number.isFinite(n) && n >= 0)
      : [],
    exclusivePairs: Array.isArray(raw.exclusivePairs)
      ? raw.exclusivePairs
          .filter((p) => Array.isArray(p) && p.length === 2)
          .map(([a, b]) => [Number(a), Number(b)])
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a !== b)
      : [],
  };
  if (cfg.electiveMin > cfg.electiveMax) {
    const swap = cfg.electiveMin;
    cfg.electiveMin = cfg.electiveMax;
    cfg.electiveMax = swap;
  }
  return cfg;
}
