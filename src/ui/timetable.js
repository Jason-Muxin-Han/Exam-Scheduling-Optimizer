/**
 * Timetable view: a days x slots grid showing the selected heuristic's result.
 */

import { t } from '../i18n.js';
import { SLOTS_PER_DAY } from '../config.js';
import { colorIndex, formatSlotRange, formatExamRange } from '../timemodel.js';

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

export function renderTimetable(root, { result, instance, config, lang }) {
  root.replaceChildren();
  if (!result) return;

  const grid = el('div', 'tt-grid');
  const head = el('div', 'tt-row tt-head');
  head.appendChild(el('div', 'tt-cell tt-day-head', t('dayLabel', lang)));
  for (let s = 0; s < SLOTS_PER_DAY; s++) {
    head.appendChild(el('div', 'tt-cell', `${t('slotLabel', lang)} ${s + 1}  ${formatSlotRange(colorIndex(0, s))}`));
  }
  grid.appendChild(head);

  const byId = new Map(instance.subjects.map((s) => [s.id, s]));
  const byColor = new Map();
  for (const [id, color] of Object.entries(result.assignment)) {
    if (!byColor.has(color)) byColor.set(color, []);
    byColor.get(color).push(byId.get(Number(id)));
  }
  const exclusiveIds = new Set(instance.exclusivePairs.flat());
  const disabled = new Set(config.disabledSlots);

  for (let d = 0; d < config.days; d++) {
    const row = el('div', 'tt-row');
    row.appendChild(el('div', 'tt-cell tt-day-head', `${t('dayLabel', lang)} ${d + 1}`));
    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      const color = colorIndex(d, s);
      const cell = el('div', `tt-cell${disabled.has(color) ? ' is-disabled' : ''}`);
      if (disabled.has(color)) cell.appendChild(el('span', 'disabled-tag', t('disabledCell', lang)));

      const list = (byColor.get(color) || []).filter(Boolean)
        .sort((a, b) => a.id - b.id);
      if (!list.length && !disabled.has(color)) {
        cell.appendChild(el('span', 'empty-tag', t('emptySlot', lang)));
      }
      for (const subject of list) {
        const card = el('div', `exam-card${exclusiveIds.has(subject.id) ? ' is-exclusive' : ''}${subject.pinned ? ' is-pinned' : ''}`);
        const top = el('div', 'exam-top');
        top.appendChild(el('strong', '', subject.name));
        top.appendChild(el('span', `kind-pill ${subject.kind}`, subject.kind === 'compulsory'
          ? t('kindCompulsory', lang) : t('kindElective', lang)));
        card.appendChild(top);
        card.appendChild(el('div', 'exam-time', formatExamRange(subject, color)));
        const meta = el('div', 'exam-meta');
        meta.appendChild(el('span', '', `${subject.durationMin} ${t('durationUnit', lang)}`));
        if (subject.pinned) meta.appendChild(el('span', 'lock-tag', t('pinnedBadge', lang)));
        if (exclusiveIds.has(subject.id)) meta.appendChild(el('span', 'pair-tag', t('graphExclusive', lang)));
        card.appendChild(meta);
        cell.appendChild(card);
      }
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
  root.appendChild(grid);
}
