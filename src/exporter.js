/**
 * Browser-side export helpers. All output is generated in memory; no library,
 * no network request, no personal data is ever included.
 */

import { decodeColor, startMinute, endMinute, formatClock } from './timemodel.js';
import { graphToJSON } from './graph.js';

function download(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function scheduleToCsv(result, instance) {
  const lines = ['day,slot,start_time,end_time,subject_id,subject_name,duration_min,kind,locked'];
  const byId = new Map(instance.subjects.map((s) => [s.id, s]));
  const rows = Object.entries(result.assignment)
    .map(([id, color]) => ({ id: Number(id), color }))
    .sort((a, b) => a.color - b.color || a.id - b.id);
  for (const { id, color } of rows) {
    const subject = byId.get(id);
    if (!subject) continue;
    const { day, slot } = decodeColor(color);
    lines.push([
      day + 1,
      slot + 1,
      formatClock(startMinute(color)),
      formatClock(endMinute(subject, color)),
      subject.externalId ?? subject.id,
      subject.name,
      subject.durationMin,
      subject.kind,
      subject.pinned ? 'yes' : 'no',
    ].map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function scheduleToJson(result, instance) {
  return JSON.stringify({
    source: instance.source,
    seed: instance.source === 'synthetic' ? instance.config.seed : null,
    config: instance.config,
    heuristic: result.heuristic,
    feasible: result.feasible,
    slotsUsed: result.slotsUsed,
    makespanDays: result.makespanDays,
    violations: result.violations,
    subjects: instance.subjects,
    assignment: Object.entries(result.assignment).map(([id, color]) => ({
      subjectId: Number(id),
      color,
      ...decodeColor(color),
    })),
  }, null, 2);
}

export function exportScheduleCsv(result, instance) {
  download('exam-schedule.csv', scheduleToCsv(result, instance), 'text/csv;charset=utf-8');
}

export function exportScheduleJson(result, instance) {
  download('exam-schedule.json', scheduleToJson(result, instance), 'application/json;charset=utf-8');
}

export function exportGraphJson(instance, graph) {
  const payload = JSON.stringify(graphToJSON(graph, instance.subjects), null, 2);
  download('conflict-graph.json', payload, 'application/json;charset=utf-8');
}

export function exportGraphSvg(svgElement) {
  if (!svgElement) return;
  const clone = svgElement.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
  download('conflict-graph.svg', markup, 'image/svg+xml;charset=utf-8');
}
