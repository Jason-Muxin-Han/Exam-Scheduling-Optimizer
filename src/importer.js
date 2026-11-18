/**
 * Import of user-supplied ANONYMISED enrollment data.
 *
 * Only numeric IDs or hashed tokens are accepted. Free-text names, emails and
 * real student numbers are rejected so the tool never becomes a place where
 * personal information is pasted. External IDs are mapped to dense internal
 * numeric IDs; the original token is kept as a display label.
 */

import { DEFAULT_DURATION_MIN, normaliseConfig } from './config.js';

const MAX_ROWS = 200000;
const MAX_SUBJECTS = 60;
const NUMERIC_ID = /^\d+$/;
const HASHED_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidId(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return NUMERIC_ID.test(s) || HASHED_ID.test(s);
}

function compareIds(a, b) {
  const an = NUMERIC_ID.test(a);
  const bn = NUMERIC_ID.test(b);
  if (an && bn) return Number(a) - Number(b);
  if (an !== bn) return an ? -1 : 1;
  return a.localeCompare(b);
}

/**
 * Build a small built-in anonymised example. The identical edge list is shipped
 * as data/template.csv so the button and the downloadable template agree.
 */
function buildSampleCsv() {
  const electives = [3, 4, 5, 6, 7, 8];
  const lines = ['student_id,subject_id'];
  for (let student = 1001; student <= 1024; student++) {
    const i = student - 1001;
    const ids = [1, 2, electives[(i * 2) % 6], electives[(i * 2 + 1) % 6]];
    for (const id of ids) lines.push(`${student},${id}`);
  }
  return `${lines.join('\n')}\n`;
}

export const SAMPLE_CSV = buildSampleCsv();

/** Turn validated external IDs into an internal instance. */
function assemble(rows, rawConfig, subjectMeta) {
  const subjectIds = [...new Set(rows.map(([sid]) => sid))].sort(compareIds);
  const studentIds = [...new Set(rows.map(([, sid]) => sid))].sort(compareIds);
  if (!subjectIds.length) return { errors: ['err.emptyFile'] };
  if (subjectIds.length > MAX_SUBJECTS) return { errors: ['err.tooManySubjects'] };
  if (rows.length > MAX_ROWS) return { errors: ['err.tooManyRows'] };

  const subjectIndex = new Map(subjectIds.map((token, i) => [token, i + 1]));
  const studentIndex = new Map(studentIds.map((token, i) => [token, i + 1]));
  const enrollmentsByStudent = new Map();
  for (const [subjectToken, studentToken] of rows) {
    const internal = studentIndex.get(studentToken);
    if (!enrollmentsByStudent.has(internal)) enrollmentsByStudent.set(internal, new Set());
    enrollmentsByStudent.get(internal).add(subjectIndex.get(subjectToken));
  }

  const subjects = subjectIds.map((token) => {
    const internal = subjectIndex.get(token);
    const meta = subjectMeta.get(token) || {};
    return {
      id: internal,
      externalId: token,
      name: meta.name || `SUB${String(internal).padStart(2, '0')}`,
      kind: meta.kind === 'compulsory' ? 'compulsory' : 'elective',
      durationMin: meta.durationMin ?? DEFAULT_DURATION_MIN,
      pinned: meta.pinned || null,
    };
  });

  const students = [...enrollmentsByStudent.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, set]) => ({ id, subjectIds: [...set].sort((a, b) => a - b) }));

  const enrollments = [];
  for (const st of students) {
    for (const sid of st.subjectIds) enrollments.push({ studentId: st.id, subjectId: sid });
  }

  const config = normaliseConfig({
    ...rawConfig,
    subjectCount: subjects.length,
    disabledSlots: [],
    exclusivePairs: [],
  });

  return {
    instance: {
      config,
      subjects,
      students,
      enrollments,
      exclusivePairs: [],
      studentCount: students.length,
      source: 'imported',
    },
  };
}

function parseCsv(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim().length);
  if (!lines.length) return { errors: ['err.emptyFile'] };
  const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
  if (header.length < 2 || header[0] !== 'student_id' || header[1] !== 'subject_id') {
    return { errors: ['err.missingColumn'] };
  }
  const rows = [];
  const errors = new Set();
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length < 2) { errors.add('err.missingColumn'); continue; }
    const [studentToken, subjectToken] = cells;
    if (!isValidId(studentToken) || !isValidId(subjectToken)) { errors.add('err.badId'); continue; }
    rows.push([subjectToken, studentToken]);
  }
  if (errors.size) return { errors: [...errors] };
  return assemble(rows, {}, new Map());
}

function parseJson(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { errors: ['err.badJson'] }; }
  if (!data || !Array.isArray(data.enrollments)) return { errors: ['err.badJson'] };

  const meta = new Map();
  if (Array.isArray(data.subjects)) {
    for (const raw of data.subjects) {
      if (!raw || !isValidId(raw.id)) return { errors: ['err.badId'] };
      if (meta.has(String(raw.id).trim())) return { errors: ['err.duplicateId'] };
      const duration = raw.durationMin === undefined ? DEFAULT_DURATION_MIN : Number(raw.durationMin);
      if (!Number.isFinite(duration) || duration <= 0) return { errors: ['err.badDuration'] };
      let pinned = null;
      if (raw.pinned && Number.isFinite(Number(raw.pinned.day)) && Number.isFinite(Number(raw.pinned.slot))) {
        pinned = { day: Number(raw.pinned.day), slot: Number(raw.pinned.slot) };
      }
      meta.set(String(raw.id).trim(), {
        name: isValidId(raw.name) || (typeof raw.name === 'string' && /^[A-Za-z0-9_-]{1,16}$/.test(raw.name))
          ? String(raw.name)
          : undefined,
        kind: raw.kind,
        durationMin: duration,
        pinned,
      });
    }
  }

  const rows = [];
  const errors = new Set();
  for (const row of data.enrollments) {
    if (!row || !isValidId(row.student_id) || !isValidId(row.subject_id)) {
      errors.add('err.badId');
      continue;
    }
    const subjectToken = String(row.subject_id).trim();
    if (meta.size && !meta.has(subjectToken)) { errors.add('err.danglingRef'); continue; }
    rows.push([subjectToken, String(row.student_id).trim()]);
  }
  if (errors.size) return { errors: [...errors] };
  return assemble(rows, data.config || {}, meta);
}

/**
 * Parse a .csv or .json file. Returns { instance } on success, or { errors }
 * containing i18n keys that the UI renders in the active language.
 */
export function parseImport(text, filename = '') {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return parseCsv(text);
  if (lower.endsWith('.json')) return parseJson(text);
  return { errors: ['err.invalidFile'] };
}
