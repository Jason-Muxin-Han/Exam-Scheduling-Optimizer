/**
 * Greedy graph-coloring heuristics.
 *
 * All three solvers share the same pinned pre-placement, the same canPlace()
 * oracle and the same validate() report, so the comparison is fair. The search
 * is strictly bounded: outer loop over N subjects, inner loop over C colors,
 * no backtracking, no while(true). Infeasible instances still produce a full
 * best-effort timetable plus an explicit violation list.
 */

import { colorIndex, decodeColor } from './timemodel.js';
import { canPlace, validate } from './constraints.js';

export const HEURISTICS = ['courseOrder', 'largestDegreeFirst', 'dsatur'];

export const HEURISTIC_LABELS = {
  courseOrder: 'Course order',
  largestDegreeFirst: 'Highest conflict first',
  dsatur: 'DSATUR',
};

export function solve(model, heuristic = 'courseOrder') {
  const placed = new Map();
  let evaluations = 0;

  // Pinned subjects are fixed first so every other subject can avoid them.
  const pinned = model.subjects.filter((s) => s.pinned).sort((a, b) => a.id - b.id);
  const pinnedIds = new Set(pinned.map((s) => s.id));
  for (const subject of pinned) {
    const wanted = colorIndex(subject.pinned.day, subject.pinned.slot);
    const color = Math.max(0, Math.min(wanted, model.colorCount - 1));
    placed.set(subject.id, color);
  }

  const remaining = model.subjects
    .filter((s) => !pinnedIds.has(s.id))
    .map((s) => s.id)
    .sort((a, b) => a - b);

  if (heuristic === 'largestDegreeFirst') {
    remaining.sort((a, b) => (model.graph.degree.get(b) - model.graph.degree.get(a)) || (a - b));
  }

  const order = [];

  function place(id) {
    const subject = model.subjectById.get(id);
    let bestColor = 0;
    let bestCount = Number.POSITIVE_INFINITY;
    for (let color = 0; color < model.colorCount; color++) {
      evaluations++;
      const count = canPlace(subject, color, placed, model).length;
      if (count === 0) {
        bestColor = color;
        bestCount = 0;
        break;
      }
      if (count < bestCount) {
        bestColor = color;
        bestCount = count;
      }
    }
    placed.set(id, bestColor);
  }

  if (heuristic === 'dsatur') {
    const pool = new Set(remaining);
    while (pool.size > 0) {
      let bestId = null;
      let bestSat = -1;
      let bestDeg = -1;
      for (const id of pool) {
        const usedColors = new Set();
        for (const [otherId, otherColor] of placed) {
          if (model.graph.adjacency.get(id)?.has(otherId)) usedColors.add(otherColor);
        }
        const sat = usedColors.size;
        const deg = model.graph.degree.get(id) ?? 0;
        if (sat > bestSat || (sat === bestSat && (deg > bestDeg || (deg === bestDeg && id < bestId)))) {
          bestId = id;
          bestSat = sat;
          bestDeg = deg;
        }
      }
      pool.delete(bestId);
      order.push(bestId);
      place(bestId);
    }
  } else {
    for (const id of remaining) {
      order.push(id);
      place(id);
    }
  }

  const colors = [...placed.values()];
  const used = new Set(colors);
  const perColor = new Map();
  for (const color of colors) perColor.set(color, (perColor.get(color) || 0) + 1);
  const maxExamsPerSlot = perColor.size ? Math.max(...perColor.values()) : 0;
  const makespanDays = colors.length
    ? Math.max(...colors.map((c) => decodeColor(c).day)) + 1
    : 0;

  const validation = validate(placed, model);
  return {
    heuristic,
    assignment: Object.fromEntries(placed),
    order: [...pinned.map((s) => s.id), ...order],
    slotsUsed: used.size,
    makespanDays,
    maxExamsPerSlot,
    evaluations,
    feasible: validation.feasible,
    violations: validation.violations,
    counts: validation.counts,
    violationsTotal: validation.total,
  };
}

/** Run every heuristic on exactly the same model. */
export function compareAll(model, heuristics = HEURISTICS) {
  return heuristics.map((h) => solve(model, h));
}
