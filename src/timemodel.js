/**
 * The time model: discrete colors plus continuous minute coordinates.
 *
 * A color is a discrete (day, slot) pair and is the unit of graph coloring and
 * of the "slots used" metric. Feasibility of a conflicting pair of exams is
 * decided on continuous minute coordinates, so per-subject duration has a real
 * effect on the schedule instead of being cosmetic. See docs/TIME_MODEL.md.
 */

import {
  SLOT_STARTS_MIN,
  SLOT_LENGTH_MIN,
  DAY_SPAN_MIN,
  SLOTS_PER_DAY,
} from './config.js';

export function colorCount(days) {
  return Math.max(0, days) * SLOTS_PER_DAY;
}

export function colorIndex(day, slot) {
  return day * SLOTS_PER_DAY + slot;
}

export function decodeColor(color) {
  const slot = ((color % SLOTS_PER_DAY) + SLOTS_PER_DAY) % SLOTS_PER_DAY;
  return { day: Math.floor(color / SLOTS_PER_DAY), slot };
}

/** Absolute minute coordinate of a color's start time. This mapping is injective. */
export function startMinute(color) {
  const { day, slot } = decodeColor(color);
  return day * DAY_SPAN_MIN + SLOT_STARTS_MIN[slot];
}

export function endMinute(subject, color) {
  return startMinute(color) + subject.durationMin;
}

/**
 * Rest in minutes between two exams in either chronological order.
 * Only meaningful for exams that share at least one student (a conflict edge).
 * A negative value indicates overlapping exams.
 */
export function restBetween(subjectA, colorA, subjectB, colorB) {
  const a = startMinute(colorA);
  const b = startMinute(colorB);
  if (a <= b) return b - (a + subjectA.durationMin);
  return a - (b + subjectB.durationMin);
}

export function durationFits(subject) {
  return subject.durationMin > 0 && subject.durationMin <= SLOT_LENGTH_MIN;
}

/** Format an absolute minute coordinate as a wall-clock HH:MM string. */
export function formatClock(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatSlotRange(color) {
  return `${formatClock(startMinute(color))}-${formatClock(startMinute(color) + SLOT_LENGTH_MIN)}`;
}

/** Clock string for a subject actually taking place in a given color. */
export function formatExamRange(subject, color) {
  return `${formatClock(startMinute(color))}-${formatClock(endMinute(subject, color))}`;
}
