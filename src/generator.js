/**
 * Synthetic instance generation.
 *
 * Subjects are split into compulsory (taken by every student) and elective
 * (taken by a per-student random subset). A mutually-exclusive elective pair
 * is generated from two disjoint halves of the student pool, which guarantees
 * that the two subjects have no common student and therefore no conflict edge.
 */

import { mulberry32, randomInt, shuffle } from './rng.js';
import { DEFAULT_DURATION_MIN, normaliseConfig } from './config.js';

const PREFIXES = [
  'MAT', 'PHY', 'CHE', 'BIO', 'ECO', 'HIS', 'GEO', 'CSC',
  'ENG', 'LAW', 'PSY', 'SOC', 'ART', 'MUS', 'STA', 'PHI',
  'POL', 'FIN', 'MED', 'LIN',
];

export function subjectName(id) {
  const i = id - 1;
  return `${PREFIXES[i % PREFIXES.length]}${100 + Math.floor(i / PREFIXES.length)}`;
}

/**
 * Build the deterministic base subject list. The first few subjects are
 * compulsory and are taken by every student; the rest are electives. The set of
 * compulsory subjects never depends on exclusive pairs, so adding a pair does
 * not silently reshape the whole instance.
 */
export function buildSubjectBase(config) {
  const n = config.subjectCount;
  const compulsoryCount = Math.max(1, Math.min(n, Math.round(n * 0.2)));
  const subjects = [];
  for (let id = 1; id <= n; id++) {
    subjects.push({
      id,
      name: subjectName(id),
      kind: id <= compulsoryCount ? 'compulsory' : 'elective',
      durationMin: DEFAULT_DURATION_MIN,
      pinned: null,
    });
  }
  return subjects;
}

/** Overlay user edits (duration, kind, pin) onto a base subject list. */
export function applySubjectEdits(base, edits = {}) {
  return base.map((s) => {
    const e = edits[s.id] || {};
    let pinned = null;
    if (e.pinned && Number.isFinite(Number(e.pinned.day)) && Number.isFinite(Number(e.pinned.slot))) {
      pinned = { day: Number(e.pinned.day), slot: Number(e.pinned.slot) };
    }
    return {
      ...s,
      kind: e.kind === 'compulsory' || e.kind === 'elective' ? e.kind : s.kind,
      durationMin: e.durationMin === undefined || e.durationMin === null || e.durationMin === ''
        ? s.durationMin
        : Number(e.durationMin),
      pinned,
    };
  });
}

/** Keep only valid pairs, and ensure each subject belongs to at most one pair. */
export function resolveExclusivePairs(subjects, pairs = []) {
  const ids = new Set(subjects.map((s) => s.id));
  const used = new Set();
  const out = [];
  for (const [a, b] of pairs) {
    if (a === b || !ids.has(a) || !ids.has(b)) continue;
    if (used.has(a) || used.has(b)) continue;
    used.add(a);
    used.add(b);
    out.push([Math.min(a, b), Math.max(a, b)]);
  }
  return out;
}

function ensureEnrolled(students, subjectId, partnerId) {
  if (students.some((st) => st.subjectIds.includes(subjectId))) return;
  const target = students.find((st) => !st.subjectIds.includes(partnerId));
  if (!target) return;
  target.subjectIds = [...target.subjectIds, subjectId].sort((x, y) => x - y);
}

/**
 * Build anonymised enrollment data. Student ids are dense integers starting at
 * 1001; no real identities, names or free-text fields are ever produced.
 */
export function buildEnrollments(config, subjects, pairs = []) {
  const rng = mulberry32(config.seed);
  const compulsory = subjects.filter((s) => s.kind === 'compulsory').map((s) => s.id);
  const electiveIds = new Set(subjects.filter((s) => s.kind === 'elective').map((s) => s.id));

  const validPairs = [];
  const partner = new Map(); // subjectId -> the other member of its exclusive pair
  for (const [a, b] of pairs) {
    if (!electiveIds.has(a) || !electiveIds.has(b)) continue;
    validPairs.push([a, b]);
    partner.set(a, b);
    partner.set(b, a);
  }

  const electives = [...electiveIds].sort((x, y) => x - y);
  const studentCount = Math.max(20, config.subjectCount * 2);
  const students = [];

  // The RNG stream is completely independent of the exclusive pairs: every
  // student draws k electives from the full list. Then "students may choose at
  // most one of the two" is enforced by dropping the later member of a pair if
  // both were drawn. This can only REMOVE conflict edges, never create new ones,
  // so marking a pair can never make the schedule worse.
  for (let i = 0; i < studentCount; i++) {
    const studentId = 1001 + i;
    const lo = Math.min(config.electiveMin, electives.length);
    const hi = Math.min(config.electiveMax, electives.length);
    const k = randomInt(rng, lo, hi);
    const drawn = shuffle(rng, electives).slice(0, k);
    const chosen = [];
    const seenPairs = new Set();
    for (const id of drawn) {
      if (partner.has(id)) {
        const other = partner.get(id);
        const key = `${Math.min(id, other)}-${Math.max(id, other)}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
      }
      chosen.push(id);
    }
    students.push({
      id: studentId,
      subjectIds: [...compulsory, ...chosen].sort((x, y) => x - y),
    });
  }

  for (const [a, b] of validPairs) {
    ensureEnrolled(students, a, b);
    ensureEnrolled(students, b, a);
  }

  const enrollments = [];
  for (const st of students) {
    for (const sid of st.subjectIds) enrollments.push({ studentId: st.id, subjectId: sid });
  }
  return { students, enrollments, exclusivePairs: validPairs, studentCount };
}

/** Build a complete synthetic instance from a configuration and optional edits. */
export function generateInstance(rawConfig, edits = {}) {
  const config = normaliseConfig(rawConfig);
  const base = buildSubjectBase(config);
  const subjects = applySubjectEdits(base, edits);
  const pairs = resolveExclusivePairs(subjects, config.exclusivePairs);
  const built = buildEnrollments(config, subjects, pairs);
  return {
    config,
    subjects,
    students: built.students,
    enrollments: built.enrollments,
    exclusivePairs: built.exclusivePairs,
    studentCount: built.studentCount,
    source: 'synthetic',
  };
}
