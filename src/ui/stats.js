/**
 * Comparison table, hand-built SVG bar chart and the violation report.
 * No chart library, no CDN, no external font.
 */

import { t, tf } from '../i18n.js';
import { HEURISTIC_LABELS } from '../solver.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function labelFor(heuristic, lang) {
  const key = {
    courseOrder: 'heuristicCourseOrder',
    largestDegreeFirst: 'heuristicLargestDegree',
    dsatur: 'heuristicDsatur',
  }[heuristic];
  return t(key || HEURISTIC_LABELS[heuristic] || heuristic, lang);
}

export function renderComparison(root, { results, lang }) {
  root.replaceChildren();
  if (!results || !results.length) return;

  root.appendChild(el('p', 'hint', t('comparisonIntro', lang)));

  const table = el('table', 'cmp-table');
  const thead = el('thead');
  const hrow = el('tr');
  for (const key of ['comparisonTitle', 'metricSlots', 'metricDays', 'metricMaxPerSlot', 'metricViolations', 'metricEvaluations']) {
    hrow.appendChild(el('th', '', key === 'comparisonTitle' ? '' : t(key, lang)));
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = el('tbody');
  const best = Math.min(...results.map((r) => r.slotsUsed));
  for (const r of results) {
    const tr = el('tr');
    const name = el('td');
    name.appendChild(el('span', '', labelFor(r.heuristic, lang)));
    if (r.slotsUsed === best) name.appendChild(el('span', 'best-badge', t('bestBadge', lang)));
    tr.appendChild(name);
    for (const value of [r.slotsUsed, r.makespanDays, r.maxExamsPerSlot, r.violationsTotal, r.evaluations]) {
      tr.appendChild(el('td', '', String(value)));
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);

  const baseline = results.find((r) => r.heuristic === 'courseOrder');
  const ldf = results.find((r) => r.heuristic === 'largestDegreeFirst');
  if (baseline && ldf) {
    const diff = baseline.slotsUsed - ldf.slotsUsed;
    const key = diff > 0 ? 'savingsMore' : diff < 0 ? 'savingsNegative' : 'savingsEqual';
    root.appendChild(el('p', 'callout', tf(key, lang, { n: Math.abs(diff) })));
  }

  root.appendChild(buildChart(results, lang));
}

function buildChart(results, lang) {
  const wrap = el('div', 'chart-wrap');
  wrap.appendChild(el('h4', '', t('chartTitle', lang)));
  const width = 640;
  const rowHeight = 48;
  const height = results.length * rowHeight + 30;
  const labelWidth = 190;
  const maxValue = Math.max(...results.map((r) => r.slotsUsed), 1);
  const scale = (width - labelWidth - 70) / maxValue;
  const colors = ['#94a3b8', '#4f7cff', '#16a085'];

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    width: '100%',
    role: 'img',
    'aria-label': t('chartTitle', lang),
  });
  results.forEach((r, i) => {
    const y = 12 + i * rowHeight;
    const label = svgEl('text', { x: 0, y: y + 17, class: 'chart-label' });
    label.textContent = labelFor(r.heuristic, lang);
    svg.appendChild(label);
    const w = Math.max(2, r.slotsUsed * scale);
    svg.appendChild(svgEl('rect', {
      x: labelWidth, y: y + 3, width: w, height: 22, rx: 5, fill: colors[i % colors.length],
    }));
    const value = svgEl('text', { x: labelWidth + w + 8, y: y + 19, class: 'chart-value' });
    value.textContent = String(r.slotsUsed);
    svg.appendChild(value);
  });
  wrap.appendChild(svg);
  return wrap;
}

export function renderWarnings(root, { result, lang }) {
  root.replaceChildren();
  if (!result) return;
  const ok = result.feasible;
  const badge = el('span', `status-badge ${ok ? 'is-ok' : 'is-bad'}`,
    ok ? t('feasibleBadge', lang) : t('infeasibleBadge', lang));
  root.appendChild(badge);

  if (ok) {
    root.appendChild(el('span', 'warn-text', t('noViolations', lang)));
    root.hidden = false;
    return;
  }

  root.appendChild(el('strong', 'warn-text', t('warningTitle', lang)));
  const counts = result.counts || {};
  const list = el('ul', 'violation-list');
  for (const [type, count] of Object.entries(counts)) {
    const li = el('li');
    li.appendChild(el('span', 'violation-name', t(`violation.${type}`, lang)));
    li.appendChild(el('span', 'violation-count', tf('violationsCount', lang, { n: count })));
    list.appendChild(li);
  }
  root.appendChild(list);
  root.hidden = false;
}
