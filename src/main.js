/**
 * Application bootstrap: owns state, the recompute pipeline, language switching
 * and all user actions. The pure core modules are imported unchanged from the
 * unit tests and the offline experiment.
 */

import { defaultConfig, normaliseConfig } from './config.js';
import { colorCount } from './timemodel.js';
import { applySubjectEdits, generateInstance, resolveExclusivePairs } from './generator.js';
import { buildConflictGraph } from './graph.js';
import { buildModel } from './constraints.js';
import { compareAll, HEURISTICS } from './solver.js';
import {
  detectLang, readStoredLang, storeLang, applyI18n, t, isLang,
} from './i18n.js';
import { parseImport, SAMPLE_CSV } from './importer.js';
import {
  exportScheduleCsv, exportScheduleJson, exportGraphJson, exportGraphSvg,
} from './exporter.js';
import { renderControls } from './ui/controls.js';
import { renderTimetable } from './ui/timetable.js';
import { renderComparison, renderWarnings } from './ui/stats.js';
import { renderGraph } from './ui/graphview.js';

const controlRoot = document.getElementById('controls');
const timetableRoot = document.getElementById('timetable');
const comparisonRoot = document.getElementById('comparison');
const graphRoot = document.getElementById('graphview');
const warningRoot = document.getElementById('warning');
const heuristicSelect = document.getElementById('heuristic-select');
const langZh = document.getElementById('lang-zh');
const langEn = document.getElementById('lang-en');
const summaryRoot = document.getElementById('summary');

const HEURISTIC_KEY = {
  courseOrder: 'heuristicCourseOrder',
  largestDegreeFirst: 'heuristicLargestDegree',
  dsatur: 'heuristicDsatur',
};

const state = {
  config: defaultConfig(),
  edits: {},
  imported: null,
  lang: detectLang(typeof location !== 'undefined' ? location.search : '', readStoredLang(),
    typeof navigator !== 'undefined' ? navigator.language : 'en'),
  activeHeuristic: 'largestDegreeFirst',
  importMessage: null,
  instance: null,
  graph: null,
  model: null,
  results: [],
};

function sanitise() {
  state.config = normaliseConfig(state.config);
  const cfg = state.config;
  const maxColor = colorCount(cfg.days);
  cfg.disabledSlots = cfg.disabledSlots.filter((c) => c >= 0 && c < maxColor);
  const validIds = new Set();
  for (let id = 1; id <= cfg.subjectCount; id++) validIds.add(id);
  cfg.exclusivePairs = resolveExclusivePairs(
    [...validIds].map((id) => ({ id })),
    cfg.exclusivePairs,
  );
  for (const key of Object.keys(state.edits)) {
    if (!validIds.has(Number(key))) delete state.edits[key];
  }
}

function buildInstance() {
  if (!state.imported) return generateInstance(state.config, state.edits);

  const cfg = normaliseConfig({ ...state.config, subjectCount: state.imported.subjects.length });
  const edits = {};
  for (const [key, value] of Object.entries(state.edits)) {
    edits[key] = { durationMin: value.durationMin, pinned: value.pinned };
  }
  const subjects = applySubjectEdits(state.imported.subjects, edits).map((s) => ({
    ...s,
    kind: state.imported.subjects.find((x) => x.id === s.id)?.kind ?? s.kind,
  }));
  return {
    ...state.imported,
    config: cfg,
    subjects,
    exclusivePairs: [],
  };
}

function compute() {
  sanitise();
  state.instance = buildInstance();
  state.graph = buildConflictGraph(state.instance.subjects, state.instance.students);
  state.model = buildModel({
    config: state.instance.config,
    subjects: state.instance.subjects,
    graph: state.graph,
    enrollments: state.instance.enrollments,
  });
  state.results = compareAll(state.model);
  if (!state.results.some((r) => r.heuristic === state.activeHeuristic)) {
    state.activeHeuristic = HEURISTICS[0];
  }
}

function activeResult() {
  return state.results.find((r) => r.heuristic === state.activeHeuristic) || state.results[0];
}

function controlState() {
  return {
    config: state.config,
    subjects: state.instance ? state.instance.subjects : [],
    instance: state.instance,
    graph: state.graph,
    lang: state.lang,
    imported: !!state.imported,
    importMessage: state.importMessage,
  };
}

function renderViews() {
  const result = activeResult();
  renderTimetable(timetableRoot, {
    result, instance: state.instance, config: state.instance.config, lang: state.lang,
  });
  renderComparison(comparisonRoot, { results: state.results, lang: state.lang });
  renderGraph(graphRoot, {
    graph: state.graph, instance: state.instance, result, lang: state.lang,
  });
  renderWarnings(warningRoot, { result, lang: state.lang });
  warningRoot.hidden = false;

  if (summaryRoot) {
    summaryRoot.textContent = `${state.instance.subjects.length} ${t('subjectsShort', state.lang)} / ${state.instance.studentCount} ${t('studentsShort', state.lang)} / ${state.graph.edges.length} ${t('graphEdges', state.lang)} / ${t('seedShort', state.lang)} ${state.config.seed}`;
  }
  if (heuristicSelect) heuristicSelect.value = state.activeHeuristic;
  langZh.classList.toggle('is-active', state.lang === 'zh');
  langEn.classList.toggle('is-active', state.lang === 'en');
}

function refresh(structural = false) {
  compute();
  if (structural) renderControls(controlRoot, controlState(), actions);
  renderViews();
}

function populateHeuristicSelect() {
  heuristicSelect.replaceChildren();
  for (const h of HEURISTICS) {
    const option = document.createElement('option');
    option.value = h;
    option.textContent = t(HEURISTIC_KEY[h], state.lang);
    heuristicSelect.appendChild(option);
  }
  heuristicSelect.value = state.activeHeuristic;
}

function applyLanguage(lang) {
  state.lang = isLang(lang) || 'en';
  storeLang(state.lang);
  applyI18n(state.lang);
  populateHeuristicSelect();
  refresh(true);
}

async function importText(text, filename) {
  let parsed;
  try { parsed = parseImport(text, filename); } catch { parsed = { errors: ['err.invalidFile'] }; }
  if (!parsed.instance) {
    state.importMessage = { ok: false, errors: parsed.errors || ['err.invalidFile'] };
    refresh(true);
    return;
  }
  state.imported = parsed.instance;
  state.edits = {};
  state.config = normaliseConfig({ ...state.config, subjectCount: parsed.instance.subjects.length });
  state.importMessage = {
    ok: true,
    values: { s: parsed.instance.subjects.length, t: parsed.instance.studentCount },
  };
  refresh(true);
}

const actions = {
  setConfig(patch, structural) {
    state.config = { ...state.config, ...patch };
    refresh(structural);
  },
  setEdit(id, patch, structural) {
    state.edits[id] = { ...(state.edits[id] || {}), ...patch };
    refresh(structural);
  },
  setSeed(value) {
    state.config = { ...state.config, seed: value };
    refresh(true);
  },
  regenerate() {
    const next = (Math.imul(state.config.seed, 1103515245) + 12345) >>> 0;
    state.config = { ...state.config, seed: next };
    refresh(true);
  },
  addPair(pair) {
    const [a, b] = pair;
    const ids = new Set(state.instance.subjects.map((s) => s.id));
    const already = state.config.exclusivePairs.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a),
    );
    const used = new Set(state.config.exclusivePairs.flat());
    if (a === b || !ids.has(a) || !ids.has(b) || already || used.has(a) || used.has(b)) {
      state.importMessage = { ok: false, errors: ['pairInvalid'] };
      refresh(true);
      return;
    }
    state.config = { ...state.config, exclusivePairs: [...state.config.exclusivePairs, [a, b]] };
    state.importMessage = null;
    refresh(true);
  },
  removePair(a, b) {
    const pairs = state.config.exclusivePairs.filter(
      ([x, y]) => !((x === a && y === b) || (x === b && y === a)),
    );
    state.config = { ...state.config, exclusivePairs: pairs };
    refresh(true);
  },
  importFile(file) {
    file.text().then((text) => importText(text, file.name)).catch(() => {
      state.importMessage = { ok: false, errors: ['err.invalidFile'] };
      refresh(true);
    });
  },
  loadSample() {
    importText(SAMPLE_CSV, 'sample.csv');
  },
  clearImport() {
    state.imported = null;
    state.edits = {};
    state.config = normaliseConfig(state.config);
    state.importMessage = null;
    refresh(true);
  },
  export(kind) {
    const result = activeResult();
    if (!result) return;
    if (kind === 'csv') exportScheduleCsv(result, state.instance);
    else if (kind === 'json') exportScheduleJson(result, state.instance);
    else if (kind === 'graphJson') exportGraphJson(state.instance, state.graph);
    else if (kind === 'graphSvg') exportGraphSvg(document.getElementById('conflict-graph-svg'));
  },
  resetAll() {
    state.config = defaultConfig();
    state.edits = {};
    state.imported = null;
    state.importMessage = null;
    state.activeHeuristic = 'largestDegreeFirst';
    refresh(true);
  },
};

heuristicSelect.addEventListener('change', () => {
  state.activeHeuristic = heuristicSelect.value;
  renderViews();
});
langZh.addEventListener('click', () => applyLanguage('zh'));
langEn.addEventListener('click', () => applyLanguage('en'));

applyI18n(state.lang);
populateHeuristicSelect();
refresh(true);
