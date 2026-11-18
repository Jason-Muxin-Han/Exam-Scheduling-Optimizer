import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, normaliseConfig } from '../src/config.js';
import {
  buildSubjectBase,
  applySubjectEdits,
  resolveExclusivePairs,
  generateInstance,
} from '../src/generator.js';
import { buildConflictGraph, areAdjacent } from '../src/graph.js';

test('subject base respects count and compulsory/elective split', () => {
  const config = normaliseConfig({ subjectCount: 20 });
  const base = buildSubjectBase(config);
  assert.equal(base.length, 20);
  assert.equal(new Set(base.map((s) => s.id)).size, 20);
  assert.ok(base.some((s) => s.kind === 'compulsory'));
  assert.ok(base.some((s) => s.kind === 'elective'));
});

test('edits override duration, kind and pin', () => {
  const base = buildSubjectBase(normaliseConfig({ subjectCount: 8 }));
  const subjects = applySubjectEdits(base, {
    1: { durationMin: 90, kind: 'elective', pinned: { day: 2, slot: 1 } },
  });
  assert.equal(subjects[0].durationMin, 90);
  assert.equal(subjects[0].kind, 'elective');
  assert.deepEqual(subjects[0].pinned, { day: 2, slot: 1 });
  assert.equal(subjects[1].pinned, null);
});

test('exclusive pairs are deduplicated and disjoint', () => {
  const subjects = buildSubjectBase(normaliseConfig({ subjectCount: 10 }));
  const pairs = resolveExclusivePairs(subjects, [[3, 4], [4, 3], [3, 7], [8, 9], [1, 1]]);
  assert.deepEqual(pairs, [[3, 4], [8, 9]]);
});

test('compulsory subjects are taken by every student', () => {
  const instance = generateInstance({ subjectCount: 12, seed: 5 });
  const compulsory = instance.subjects.filter((s) => s.kind === 'compulsory');
  assert.ok(compulsory.length > 0);
  for (const st of instance.students) {
    for (const c of compulsory) {
      assert.ok(st.subjectIds.includes(c.id), `student ${st.id} misses ${c.name}`);
    }
  }
});

test('per-student elective count stays inside the configured range', () => {
  const instance = generateInstance({ subjectCount: 15, electiveMin: 2, electiveMax: 4, seed: 3 });
  const compulsoryCount = instance.subjects.filter((s) => s.kind === 'compulsory').length;
  for (const st of instance.students) {
    const electives = st.subjectIds.length - compulsoryCount;
    assert.ok(electives >= 2 && electives <= 4, `student ${st.id} has ${electives} electives`);
  }
});

test('an exclusive pair has disjoint student sets and therefore no conflict edge', () => {
  const instance = generateInstance({
    subjectCount: 12,
    seed: 77,
    exclusivePairs: [[7, 8]],
  });
  const [a, b] = instance.exclusivePairs[0];
  assert.equal(a, 7);
  assert.equal(b, 8);
  const setA = new Set(instance.students.filter((s) => s.subjectIds.includes(a)).map((s) => s.id));
  const setB = new Set(instance.students.filter((s) => s.subjectIds.includes(b)).map((s) => s.id));
  assert.ok(setA.size > 0 && setB.size > 0);
  for (const id of setA) assert.ok(!setB.has(id), `shared student ${id}`);
  const graph = buildConflictGraph(instance.subjects, instance.students);
  assert.equal(areAdjacent(graph, a, b), false);
});

test('marking an exclusive pair only removes conflict edges, never adds any', () => {
  const cfg = { subjectCount: 20, seed: 31, electiveMin: 2, electiveMax: 4 };
  const base = generateInstance(cfg);
  const graphA = buildConflictGraph(base.subjects, base.students);
  const electives = new Set(base.subjects.filter((s) => s.kind === 'elective').map((s) => s.id));
  const [a, b] = graphA.edges.find(([x, y]) => electives.has(x) && electives.has(y));

  const paired = generateInstance({ ...cfg, exclusivePairs: [[a, b]] });
  const graphB = buildConflictGraph(paired.subjects, paired.students);
  const before = new Set(graphA.edges.map(([x, y]) => `${x}-${y}`));
  for (const [x, y] of graphB.edges) {
    assert.ok(before.has(`${x}-${y}`), `unexpected new edge ${x}-${y}`);
  }
  assert.ok(graphB.edges.length < graphA.edges.length);
  assert.equal(areAdjacent(graphB, a, b), false);
});

test('generation is fully reproducible from the seed', () => {
  const a = generateInstance({ subjectCount: 14, seed: 999 });
  const b = generateInstance({ subjectCount: 14, seed: 999 });
  assert.deepEqual(a, b);
  const c = generateInstance({ subjectCount: 14, seed: 1000 });
  assert.notDeepEqual(a.students, c.students);
});

test('normaliseConfig clamps out-of-range values', () => {
  const cfg = normaliseConfig({ days: 999, subjectCount: 0, electiveMin: 9, electiveMax: 1 });
  assert.equal(cfg.days, 14);
  assert.equal(cfg.subjectCount, 5);
  assert.ok(cfg.electiveMin <= cfg.electiveMax);
  assert.equal(defaultConfig().minRestMin, 30);
});
