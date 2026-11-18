/**
 * Control panel: builds all nine required interactive controls.
 *
 * The panel is rebuilt only on structural changes (subject count, days,
 * language, import). Value edits call actions.recompute() so the views update
 * while input focus is never lost.
 */

import { t, tf } from '../i18n.js';
import {
  MAX_DAYS, MIN_DAYS, MAX_SUBJECTS, MIN_SUBJECTS, SLOTS_PER_DAY,
} from '../config.js';
import { colorIndex, formatSlotRange } from '../timemodel.js';
import { resolveExclusivePairs } from '../generator.js';

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function section(titleKey, lang) {
  const box = el('section', 'ctrl-section');
  box.appendChild(el('h3', '', t(titleKey, lang)));
  return box;
}

function numberField(parent, labelKey, value, min, max, lang, onCommit) {
  const wrap = el('div', 'field');
  const label = el('label', '', t(labelKey, lang));
  const input = el('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  input.addEventListener('change', () => onCommit(Number(input.value)));
  label.appendChild(input);
  wrap.appendChild(label);
  parent.appendChild(wrap);
  return input;
}

function button(label, onClick, className = 'btn') {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function buildInstanceSection(state, actions) {
  const { config, instance, lang, imported } = state;
  const box = section('sectionInstance', lang);

  const seedRow = el('div', 'field-inline');
  const seedLabel = el('label', '', t('seedLabel', lang));
  const seedInput = el('input');
  seedInput.type = 'number';
  seedInput.min = '0';
  seedInput.max = '2147483647';
  seedInput.value = String(config.seed);
  seedInput.disabled = imported;
  seedInput.addEventListener('change', () => actions.setSeed(Number(seedInput.value)));
  seedLabel.appendChild(seedInput);
  seedRow.appendChild(seedLabel);
  seedRow.appendChild(button(t('regenerate', lang), () => actions.regenerate(), 'btn btn-primary'));
  box.appendChild(seedRow);

  numberField(box, 'subjectCountLabel', config.subjectCount, MIN_SUBJECTS, MAX_SUBJECTS, lang,
    (v) => actions.setConfig({ subjectCount: v }, true)).disabled = imported;

  const rangeWrap = el('div', 'field');
  rangeWrap.appendChild(el('label', '', t('electiveRangeLabel', lang)));
  const two = el('div', 'two-col');
  for (const [key, value] of [['electiveMinLabel', config.electiveMin], ['electiveMaxLabel', config.electiveMax]]) {
    const l = el('label', 'sub-label', t(key, lang));
    const i = el('input');
    i.type = 'number';
    i.min = '0';
    i.max = String(MAX_SUBJECTS);
    i.step = '1';
    i.value = String(value);
    i.disabled = imported;
    i.addEventListener('change', () => {
      const patch = key === 'electiveMinLabel' ? { electiveMin: Number(i.value) } : { electiveMax: Number(i.value) };
      actions.setConfig(patch, true);
    });
    l.appendChild(i);
    two.appendChild(l);
  }
  rangeWrap.appendChild(two);
  box.appendChild(rangeWrap);

  box.appendChild(el('p', 'stat-line',
    `${instance.subjects.length} ${t('subjectsShort', lang)} / ${instance.studentCount} ${t('studentsShort', lang)} / ${t('seedShort', lang)} ${config.seed}`));
  return box;
}

function buildScheduleSection(state, actions) {
  const { config, lang } = state;
  const box = section('sectionSchedule', lang);

  numberField(box, 'daysLabel', config.days, MIN_DAYS, MAX_DAYS, lang,
    (v) => actions.setConfig({ days: v }, true));
  numberField(box, 'minRestLabel', config.minRestMin, 0, 600, lang,
    (v) => actions.setConfig({ minRestMin: v }, false));
  box.appendChild(el('p', 'hint', t('minRestHint', lang)));

  box.appendChild(el('label', 'field-label', t('disabledSlotsLabel', lang)));
  const grid = el('div', 'slot-grid');
  const head = el('div', 'slot-grid-head');
  head.appendChild(el('span', 'slot-corner', ''));
  for (let s = 0; s < SLOTS_PER_DAY; s++) {
    head.appendChild(el('span', 'slot-head', `${t('slotLabel', lang)} ${s + 1}`));
  }
  grid.appendChild(head);

  for (let d = 0; d < config.days; d++) {
    const row = el('div', 'slot-grid-row');
    row.appendChild(el('span', 'slot-row-label', `${t('dayLabel', lang)} ${d + 1}`));
    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      const color = colorIndex(d, s);
      const off = config.disabledSlots.includes(color);
      const chip = el('button', `slot-chip${off ? ' is-off' : ''}`, formatSlotRange(color));
      chip.type = 'button';
      chip.title = t('disabledCell', lang);
      chip.addEventListener('click', () => {
        const next = config.disabledSlots.includes(color)
          ? config.disabledSlots.filter((c) => c !== color)
          : [...config.disabledSlots, color];
        actions.setConfig({ disabledSlots: next }, false);
        chip.classList.toggle('is-off');
      });
      row.appendChild(chip);
    }
    grid.appendChild(row);
  }
  box.appendChild(grid);
  box.appendChild(el('p', 'hint', t('disabledHint', lang)));
  return box;
}

function buildSubjectSection(state, actions) {
  const { subjects, config, lang, imported } = state;
  const box = section('sectionSubjects', lang);
  const pairedIds = new Set(resolveExclusivePairs(subjects, config.exclusivePairs).flat());

  const table = el('div', 'subject-table');
  const header = el('div', 'subject-row subject-head');
  for (const key of ['colSubject', 'colKind', 'colDuration', 'colPin']) {
    header.appendChild(el('span', '', t(key, lang)));
  }
  table.appendChild(header);

  for (const subject of subjects) {
    const row = el('div', 'subject-row');
    row.appendChild(el('span', 'subject-name', subject.name));

    const kind = el('select');
    for (const [value, key] of [['compulsory', 'kindCompulsory'], ['elective', 'kindElective']]) {
      const opt = el('option', '', t(key, lang));
      opt.value = value;
      kind.appendChild(opt);
    }
    kind.value = subject.kind;
    kind.disabled = imported || pairedIds.has(subject.id);
    if (pairedIds.has(subject.id)) kind.title = t('pairSectionHint', lang);
    kind.addEventListener('change', () => actions.setEdit(subject.id, { kind: kind.value }, true));
    row.appendChild(kind);

    const duration = el('input');
    duration.type = 'number';
    duration.min = '15';
    duration.max = '180';
    duration.step = '15';
    duration.value = String(subject.durationMin);
    duration.addEventListener('change', () => actions.setEdit(subject.id, { durationMin: Number(duration.value) }, false));
    row.appendChild(duration);

    const pin = el('select');
    const none = el('option', '', t('pinNone', lang));
    none.value = '';
    pin.appendChild(none);
    for (let d = 0; d < config.days; d++) {
      for (let s = 0; s < SLOTS_PER_DAY; s++) {
        const color = colorIndex(d, s);
        const opt = el('option', '', `${t('dayLabel', lang)} ${d + 1} / ${t('slotLabel', lang)} ${s + 1} (${formatSlotRange(color)})`);
        opt.value = String(color);
        pin.appendChild(opt);
      }
    }
    pin.value = subject.pinned ? String(colorIndex(subject.pinned.day, subject.pinned.slot)) : '';
    pin.addEventListener('change', () => {
      if (pin.value === '') actions.setEdit(subject.id, { pinned: null }, false);
      else {
        const c = Number(pin.value);
        actions.setEdit(subject.id, { pinned: { day: Math.floor(c / SLOTS_PER_DAY), slot: c % SLOTS_PER_DAY } }, false);
      }
    });
    row.appendChild(pin);
    table.appendChild(row);
  }
  box.appendChild(table);
  return box;
}

function buildPairSection(state, actions) {
  const { subjects, config, instance, graph, lang, imported } = state;
  const box = section('sectionPairs', lang);
  box.appendChild(el('p', 'hint', t('pairSectionHint', lang)));

  const form = el('div', 'pair-form');
  const selectA = el('select');
  const selectB = el('select');
  const electives = subjects.filter((s) => s.kind === 'elective');
  for (const subject of electives) {
    for (const select of [selectA, selectB]) {
      const opt = el('option', '', `${subject.name} (${subject.id})`);
      opt.value = String(subject.id);
      select.appendChild(opt);
    }
  }
  if (electives.length > 1) selectB.value = String(electives[1].id);

  // Default the form to a pair that currently has a conflict edge, so adding
  // one visibly removes that edge and can free a time slot.
  const electiveIds = new Set(electives.map((s) => s.id));
  const used = new Set(config.exclusivePairs.flat());
  const suggestion = graph && graph.edges
    ? graph.edges.find(([a, b]) => electiveIds.has(a) && electiveIds.has(b) && !used.has(a) && !used.has(b))
    : null;
  if (suggestion) {
    selectA.value = String(suggestion[0]);
    selectB.value = String(suggestion[1]);
  }
  form.appendChild(selectA);
  form.appendChild(el('span', 'pair-x', '+'));
  form.appendChild(selectB);
  form.appendChild(button(t('addPair', lang), () => actions.addPair([Number(selectA.value), Number(selectB.value)]), 'btn btn-primary'));
  selectA.disabled = imported;
  selectB.disabled = imported;
  box.appendChild(form);
  if (suggestion) box.appendChild(el('p', 'hint', t('pairSuggestionHint', lang)));

  const list = el('ul', 'pair-list');
  const active = instance.exclusivePairs;
  if (!config.exclusivePairs.length) {
    list.appendChild(el('li', 'muted', t('noPairs', lang)));
  }
  active.forEach(([a, b], index) => {
    const item = el('li');
    const byId = new Map(subjects.map((s) => [s.id, s.name]));
    item.appendChild(el('span', '', `${byId.get(a) || a} + ${byId.get(b) || b}`));
    item.appendChild(button(t('remove', lang), () => actions.removePair(a, b), 'btn btn-tiny'));
    list.appendChild(item);
  });
  box.appendChild(list);
  if (active.length) box.appendChild(el('p', 'stat-line', `${active.length} ${t('pairSaved', lang)}`));
  return box;
}

function buildIOSection(state, actions) {
  const { lang, imported, importMessage } = state;
  const box = section('sectionIO', lang);

  if (imported) box.appendChild(el('p', 'notice', t('importedNotice', lang)));
  box.appendChild(el('p', 'hint', t('importHint', lang)));

  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,.json,text/csv,application/json';
  fileInput.className = 'hidden-input';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) actions.importFile(file);
  });

  const row1 = el('div', 'btn-row');
  row1.appendChild(fileInput);
  row1.appendChild(button(t('importButton', lang), () => fileInput.click(), 'btn'));
  row1.appendChild(button(t('loadSample', lang), () => actions.loadSample(), 'btn'));
  if (imported) row1.appendChild(button(t('clearImport', lang), () => actions.clearImport(), 'btn'));
  box.appendChild(row1);
  box.appendChild(el('p', 'privacy', t('privacyNote', lang)));

  box.appendChild(el('label', 'field-label', t('exportTitle', lang)));
  const row2 = el('div', 'btn-row');
  for (const [kind, key] of [
    ['csv', 'exportScheduleCsv'], ['json', 'exportScheduleJson'],
    ['graphJson', 'exportGraphJson'], ['graphSvg', 'exportGraphSvg'],
  ]) {
    row2.appendChild(button(t(key, lang), () => actions.export(kind), 'btn btn-small'));
  }
  box.appendChild(row2);

  if (importMessage) {
    const msg = el('div', `import-message ${importMessage.ok ? 'is-ok' : 'is-error'}`);
    msg.appendChild(el('strong', '', importMessage.ok
      ? tf('ok.imported', lang, importMessage.values)
      : t('importErrorTitle', lang)));
    if (!importMessage.ok) {
      const ul = el('ul');
      for (const key of importMessage.errors) ul.appendChild(el('li', '', t(key, lang)));
      msg.appendChild(ul);
    }
    box.appendChild(msg);
  }

  const row3 = el('div', 'btn-row');
  row3.appendChild(button(t('resetAll', lang), () => actions.resetAll(), 'btn btn-quiet'));
  box.appendChild(row3);
  return box;
}

/** Full rebuild of the control panel. */
export function renderControls(root, state, actions) {
  root.replaceChildren();
  root.appendChild(buildInstanceSection(state, actions));
  root.appendChild(buildScheduleSection(state, actions));
  root.appendChild(buildSubjectSection(state, actions));
  root.appendChild(buildPairSection(state, actions));
  root.appendChild(buildIOSection(state, actions));
}
