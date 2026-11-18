import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, normaliseConfig } from '../src/config.js';
import { colorIndex } from '../src/timemodel.js';
import { generateInstance } from '../src/generator.js';
import { buildConflictGraph } from '../src/graph.js';
import { buildModel } from '../src/constraints.js';
import { solve, compareAll, HEURISTICS } from '../src/solver.js';

function modelFrom(instance) {
  const graph = buildConflictGraph(instance.subjects, instance.students);
  return buildModel({
    config: instance.config,
    subjects: instance.subjects,
    graph,
    enrollments: instance.enrollments,
  });
}

test('every subject receives exactly one color and the work is bounded', () => {
  const instance = generateInstance({ subjectCount: 30, days: 12, seed: 123 });
  const model = modelFrom(instance);
  for (const heuristic of HEURISTICS) {
    const result = solve(model, heuristic);
    assert.equal(Object.keys(result.assignment).length, instance.subjects.length);
    for (const color of Object.values(result.assignment)) {
      assert.ok(color >= 0 && color < model.colorCount);
    }
    assert.ok(result.evaluations <= instance.subjects.length * model.colorCount);
    assert.ok(result.slotsUsed <= model.colorCount);
  }
});

test('results are deterministic across repeated runs', () => {
  const instance = generateInstance({ subjectCount: 20, days: 8, seed: 55 });
  const model = modelFrom(instance);
  assert.deepEqual(compareAll(model), compareAll(model));
});

test('largestDegreeFirst starts with a maximum-degree subject', () => {
  const instance = generateInstance({ subjectCount: 20, days: 8, seed: 8 });
  const model = modelFrom(instance);
  const result = solve(model, 'largestDegreeFirst');
  const firstNonPinned = result.order[0];
  const maxDegree = Math.max(...[...model.graph.degree.values()]);
  assert.equal(model.graph.degree.get(firstNonPinned), maxDegree);
});

test('exclusive pair members are co-scheduled into one slot', () => {
  const subjects = [
    { id: 1, name: 'A', kind: 'elective', durationMin: 120, pinned: null },
    { id: 2, name: 'B', kind: 'elective', durationMin: 120, pinned: null },
    { id: 3, name: 'C', kind: 'elective', durationMin: 120, pinned: null },
  ];
  const students = [
    { id: 1001, subjectIds: [1, 3] },
    { id: 1002, subjectIds: [2, 3] },
  ];
  const config = normaliseConfig({ ...defaultConfig(), days: 2, minRestMin: 30 });
  const graph = buildConflictGraph(subjects, students);
  const model = buildModel({ config, subjects, graph, enrollments: [] });
  const result = solve(model, 'courseOrder');
  assert.equal(graph.adjacency.get(1).has(2), false);
  assert.equal(result.assignment[1], result.assignment[2]);
  assert.equal(result.slotsUsed, 2);
  assert.equal(result.feasible, true, JSON.stringify(result.violations));
});

test('pinned subjects keep their requested slot', () => {
  const instance = generateInstance({ subjectCount: 12, days: 6, seed: 42 });
  instance.subjects[0].pinned = { day: 2, slot: 3 };
  const model = modelFrom(instance);
  const result = solve(model, 'courseOrder');
  assert.equal(result.assignment[1], colorIndex(2, 3));
});

test('infeasible instances still produce a complete best-effort timetable', () => {
  const instance = generateInstance({ subjectCount: 10, days: 1, seed: 4 });
  for (const s of instance.subjects) s.durationMin = 150;
  const model = modelFrom(instance);
  const result = solve(model, 'courseOrder');
  assert.equal(Object.keys(result.assignment).length, 10);
  assert.equal(result.feasible, false);
  assert.equal(result.counts.durationExceedsSlot, 10);
  assert.ok(result.violations.length > 0);
});

test('a very tight instance terminates and reports violations instead of hanging', () => {
  const instance = generateInstance({ subjectCount: 25, days: 1, minRestMin: 600, seed: 6 });
  const model = modelFrom(instance);
  const result = solve(model, 'dsatur');
  assert.equal(Object.keys(result.assignment).length, 25);
  assert.equal(result.feasible, false);
  assert.ok(result.evaluations <= 25 * model.colorCount);
});

test('compareAll returns one result per heuristic in a stable order', () => {
  const instance = generateInstance({ subjectCount: 12, days: 6, seed: 1 });
  const results = compareAll(modelFrom(instance));
  assert.deepEqual(results.map((r) => r.heuristic), HEURISTICS);
  for (const r of results) {
    assert.equal(typeof r.slotsUsed, 'number');
    assert.equal(typeof r.violationsTotal, 'number');
  }
});
