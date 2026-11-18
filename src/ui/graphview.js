/**
 * Conflict graph rendered as inline SVG with a deterministic circular layout.
 * No force simulation, no library: positions are stable across recomputes.
 */

import { t } from '../i18n.js';
import { decodeColor, formatSlotRange } from '../timemodel.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function slotColor(color) {
  const hue = (color * 47 + 205) % 360;
  return `hsl(${hue}, 62%, 52%)`;
}

export function renderGraph(root, { graph, instance, result, lang }) {
  root.replaceChildren();
  if (!graph || !instance) return;

  const size = 620;
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.min(255, Math.max(150, size * 0.42 - graph.ids.length));
  const n = graph.ids.length;
  const positions = new Map();
  graph.ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
    positions.set(id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });

  const svg = svgEl('svg', {
    id: 'conflict-graph-svg',
    viewBox: `0 0 ${size} ${size}`,
    width: '100%',
    role: 'img',
    'aria-label': t('graphTitle', lang),
  });

  const edgeLayer = svgEl('g', { class: 'graph-edges' });
  for (const [a, b] of graph.edges) {
    const pa = positions.get(a);
    const pb = positions.get(b);
    if (!pa || !pb) continue;
    edgeLayer.appendChild(svgEl('line', {
      x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y,
      stroke: '#64748b', 'stroke-width': 0.8, 'stroke-opacity': n > 30 ? 0.1 : 0.22,
    }));
  }
  svg.appendChild(edgeLayer);

  const pairLayer = svgEl('g', { class: 'graph-pairs' });
  for (const [a, b] of instance.exclusivePairs) {
    const pa = positions.get(a);
    const pb = positions.get(b);
    if (!pa || !pb) continue;
    pairLayer.appendChild(svgEl('line', {
      x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y,
      stroke: '#e0873a', 'stroke-width': 3, 'stroke-dasharray': '7 5', 'stroke-opacity': 0.9,
    }));
  }
  svg.appendChild(pairLayer);

  const nodeLayer = svgEl('g', { class: 'graph-nodes' });
  const byId = new Map(instance.subjects.map((s) => [s.id, s]));
  const exclusiveIds = new Set(instance.exclusivePairs.flat());
  const assignment = result ? result.assignment : {};

  for (const id of graph.ids) {
    const p = positions.get(id);
    const subject = byId.get(id);
    const degree = graph.degree.get(id) ?? 0;
    const r = 8 + Math.min(8, degree / Math.max(1, n) * 12);
    const color = assignment[id];
    const fill = color === undefined ? '#cbd5e1' : slotColor(color);
    const group = svgEl('g');
    const title = svgEl('title');
    const slotText = color === undefined
      ? ''
      : ` | ${t('slotLabel', lang)} ${decodeColor(color).day + 1}-${decodeColor(color).slot + 1} ${formatSlotRange(color)}`;
    title.textContent = `${subject?.name ?? id} | ${t('graphEdges', lang)} ${degree}${slotText}`;
    group.appendChild(title);
    group.appendChild(svgEl('circle', {
      cx: p.x, cy: p.y, r,
      fill,
      stroke: exclusiveIds.has(id) ? '#e0873a' : '#ffffff',
      'stroke-width': exclusiveIds.has(id) ? 3 : 1.5,
    }));
    if (n <= 40) {
      const text = svgEl('text', {
        x: p.x, y: p.y + 3.5,
        'text-anchor': 'middle',
        class: 'graph-node-label',
      });
      text.textContent = String(id);
      group.appendChild(text);
    }
    nodeLayer.appendChild(group);
  }
  svg.appendChild(nodeLayer);
  root.appendChild(svg);

  const legend = el('div', 'graph-legend');
  legend.appendChild(el('span', '', `${t('graphNodes', lang)}: ${graph.ids.length}`));
  legend.appendChild(el('span', '', `${t('graphEdges', lang)}: ${graph.edges.length}`));
  legend.appendChild(el('span', '', `${t('graphDensity', lang)}: ${(graph.density * 100).toFixed(1)}%`));
  legend.appendChild(el('span', 'legend-item', `● ${t('graphLegendSlot', lang)}`));
  legend.appendChild(el('span', 'legend-item legend-pair', `--- ${t('graphExclusive', lang)}`));
  root.appendChild(legend);
}
