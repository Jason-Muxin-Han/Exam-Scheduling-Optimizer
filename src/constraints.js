/**
 * The single source of truth for feasibility.
 *
 * canPlace() is the incremental oracle used by the greedy solvers. validate()
 * recomputes every constraint from scratch and is the authoritative report.
 * Both share the same atomic predicates so they cannot drift apart.
 */

import { SLOT_LENGTH_MIN } from './config.js';
import { restBetween, colorIndex, colorCount } from './timemodel.js';

export const VIOLATION_TYPES = [
  'durationExceedsSlot',
  'conflictInSameSlot',
  'minRestViolation',
  'disabledSlotUsed',
  'pinnedInDisabledSlot',
  'pinnedConflict',
  'colorOutOfRange',
  'unscheduled',
];

/** Assemble everything a solver needs to evaluate a placement. */
export function buildModel({ config, subjects, graph, enrollments }) {
  return {
    config,
    subjects,
    subjectById: new Map(subjects.map((s) => [s.id, s])),
    graph,
    enrollments: enrollments || [],
    colorCount: colorCount(config.days),
    disabledColors: new Set(config.disabledSlots),
    minRestMin: config.minRestMin,
  };
}

function durationIssue(subject) {
  if (!(subject.durationMin > 0) || subject.durationMin > SLOT_LENGTH_MIN) {
    return [{
      type: 'durationExceedsSlot',
      subjectId: subject.id,
      duration: subject.durationMin,
      limit: SLOT_LENGTH_MIN,
    }];
  }
  return [];
}

/** Violations caused specifically by a pair of conflicting subjects. */
export function pairIssues(subjectA, colorA, subjectB, colorB, adjacent, model) {
  if (!adjacent) return [];
  const ids = [subjectA.id, subjectB.id].sort((x, y) => x - y);
  if (colorA === colorB) {
    return [{ type: 'conflictInSameSlot', subjectIds: ids, color: colorA, students: 'shared' }];
  }
  const rest = restBetween(subjectA, colorA, subjectB, colorB);
  if (rest < model.minRestMin) {
    return [{
      type: 'minRestViolation',
      subjectIds: ids,
      rest,
      required: model.minRestMin,
      colorA,
      colorB,
    }];
  }
  return [];
}

/** Return the list of violations if subject is placed in color given placed placements. */
export function canPlace(subject, color, placed, model) {
  const issues = [...durationIssue(subject)];
  if (model.disabledColors.has(color)) {
    issues.push({ type: 'disabledSlotUsed', subjectId: subject.id, color });
  }
  if (color < 0 || color >= model.colorCount) {
    issues.push({ type: 'colorOutOfRange', subjectId: subject.id, color });
  }
  const neighbours = model.graph.adjacency.get(subject.id);
  for (const [otherId, otherColor] of placed) {
    const other = model.subjectById.get(otherId);
    if (!other) continue;
    issues.push(...pairIssues(subject, color, other, otherColor, !!neighbours?.has(otherId), model));
  }
  return issues;
}

function readColor(assignment, id) {
  if (assignment instanceof Map) return assignment.get(id);
  return assignment[id];
}

/** Independent, exhaustive constraint check on a finished assignment. */
export function validate(assignment, model) {
  const violations = [];

  for (const subject of model.subjects) {
    const color = readColor(assignment, subject.id);
    if (color === undefined || color === null) {
      violations.push({ type: 'unscheduled', subjectId: subject.id });
      continue;
    }
    violations.push(...durationIssue(subject));
    if (model.disabledColors.has(color)) {
      violations.push({ type: 'disabledSlotUsed', subjectId: subject.id, color });
    }
    if (color < 0 || color >= model.colorCount) {
      violations.push({ type: 'colorOutOfRange', subjectId: subject.id, color });
    }
    if (subject.pinned) {
      const pinnedColor = colorIndex(subject.pinned.day, subject.pinned.slot);
      if (pinnedColor !== color) {
        violations.push({
          type: 'pinnedConflict',
          subjectId: subject.id,
          expected: pinnedColor,
          actual: color,
        });
      }
      if (model.disabledColors.has(pinnedColor)) {
        violations.push({ type: 'pinnedInDisabledSlot', subjectId: subject.id, color: pinnedColor });
      }
    }
  }

  for (const [a, b] of model.graph.edges) {
    const ca = readColor(assignment, a);
    const cb = readColor(assignment, b);
    if (ca === undefined || ca === null || cb === undefined || cb === null) continue;
    const sa = model.subjectById.get(a);
    const sb = model.subjectById.get(b);
    violations.push(...pairIssues(sa, ca, sb, cb, true, model));
  }

  const counts = {};
  for (const v of violations) counts[v.type] = (counts[v.type] || 0) + 1;
  return {
    feasible: violations.length === 0,
    violations,
    counts,
    total: violations.length,
  };
}
