import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseConfig, defaultConfig } from '../src/config.js';
import { colorIndex } from '../src/timemodel.js';
import { buildConflictGraph } from '../src/graph.js';
import { buildModel, canPlace, validate } from '../src/constraints.js';

function baseSubjects(overrides = {}) {
  return [
    { id: 1, name: 'A', kind: 'compulsory', durationMin: 120, pinned: null },
    { id: 2, name: 'B', kind: 'elective', durationMin: 120, pinned: null },
    { id: 3, name: 'C', kind: 'elective', durationMin: 120, pinned: null },
  ].map((s) => ({ ...s, ...(overrides[s.id] || {}) }));
}

function baseStudents() {
  return [
    { id: 1001, subjectIds: [1, 2] },
    { id: 1002, subjectIds: [1, 3] },
  ];
}

function makeModel({ subjects = baseSubjects(), students = baseStudents(), config = {} } = {}) {
  const cfg = normaliseConfig({ ...defaultConfig(), days: 3, minRestMin: 30, ...config });
  const graph = buildConflictGraph(subjects, students);
  return buildModel({ config: cfg, subjects, graph, enrollments: [] });
}

const c0 = colorIndex(0, 0);
const c1 = colorIndex(0, 1);
const c2 = colorIndex(0, 2);

test('a valid assignment reports feasible', () => {
  const model = makeModel();
  const assignment = new Map([[1, c0], [2, c2], [3, c2]]);
  const result = validate(assignment, model);
  assert.equal(result.feasible, true, JSON.stringify(result.violations));
  assert.equal(result.total, 0);
});

test('conflicting subjects in the same slot are rejected', () => {
  const model = makeModel();
  const result = validate(new Map([[1, c0], [2, c0], [3, c2]]), model);
  assert.ok(result.counts.conflictInSameSlot >= 1);
  assert.equal(result.feasible, false);
});

test('a stricter rest threshold forbids adjacent slots for 120 minute exams', () => {
  const relaxed = makeModel({ config: { minRestMin: 30 } });
  const strict = makeModel({ config: { minRestMin: 45 } });
  const assignment = new Map([[1, c0], [2, c1], [3, c2]]);
  assert.equal(validate(assignment, relaxed).counts.minRestViolation, undefined);
  assert.ok(validate(assignment, strict).counts.minRestViolation >= 1);
});

test('shortening an exam removes the rest violation', () => {
  const strict = makeModel({
    subjects: baseSubjects({ 1: { durationMin: 60 } }),
    config: { minRestMin: 45 },
  });
  const assignment = new Map([[1, c0], [2, c1], [3, c2]]);
  assert.equal(validate(assignment, strict).feasible, true);
});

test('overlong, zero and negative durations are reported', () => {
  const model = makeModel({ subjects: baseSubjects({ 2: { durationMin: 150 } }) });
  const result = validate(new Map([[1, c0], [2, c2], [3, c2]]), model);
  assert.equal(result.counts.durationExceedsSlot, 1);
});

test('disabled slots are reported for both normal and pinned subjects', () => {
  const model = makeModel({ config: { disabledSlots: [c0] } });
  const result = validate(new Map([[1, c0], [2, c2], [3, c2]]), model);
  assert.ok(result.counts.disabledSlotUsed >= 1);

  const pinnedModel = makeModel({
    subjects: baseSubjects({ 1: { pinned: { day: 0, slot: 0 } } }),
    config: { disabledSlots: [c0] },
  });
  const pinnedResult = validate(new Map([[1, c0], [2, c2], [3, c2]]), pinnedModel);
  assert.equal(pinnedResult.counts.pinnedInDisabledSlot, 1);
});

test('a pin that is not honoured is reported', () => {
  const model = makeModel({ subjects: baseSubjects({ 1: { pinned: { day: 0, slot: 0 } } }) });
  const result = validate(new Map([[1, c1], [2, c2], [3, c2]]), model);
  assert.equal(result.counts.pinnedConflict, 1);
});

test('missing and out-of-range assignments are reported without throwing', () => {
  const model = makeModel();
  const result = validate(new Map([[1, c0], [3, c2]]), model);
  assert.equal(result.counts.unscheduled, 1);
  const bad = validate(new Map([[1, 999], [2, c2], [3, c2]]), model);
  assert.equal(bad.counts.colorOutOfRange, 1);
});

test('canPlace agrees with validate for the first-fit choice', () => {
  const model = makeModel();
  const placed = new Map([[1, c0]]);
  assert.equal(canPlace(model.subjectById.get(2), c0, placed, model).length > 0, true);
  assert.equal(canPlace(model.subjectById.get(2), c2, placed, model).length, 0);
  placed.set(2, c2);
  assert.equal(canPlace(model.subjectById.get(3), c2, placed, model).length, 0);
  const result = validate(new Map([[1, c0], [2, c2], [3, c2]]), model);
  assert.equal(result.feasible, true);
});
