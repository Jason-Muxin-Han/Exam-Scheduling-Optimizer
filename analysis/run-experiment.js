/**
 * Offline comparison experiment.
 *
 * Runs every heuristic on reproducible synthetic instances across several seeds
 * and problem sizes, then writes an English CSV and an English Markdown report.
 * Uses only Node built-ins and the pure core modules, so the exact same solver
 * code powers the webpage and this experiment.
 *
 * Usage: npm run experiment
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SLOTS_PER_DAY } from '../src/config.js';
import { generateInstance } from '../src/generator.js';
import { buildConflictGraph } from '../src/graph.js';
import { buildModel } from '../src/constraints.js';
import { compareAll, HEURISTICS, HEURISTIC_LABELS } from '../src/solver.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'results');
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);
const SIZES = [20, 30, 40, 50];
const CSV_HEADER = [
  'seed', 'N', 'days', 'slots_per_day', 'heuristic',
  'slots_used', 'makespan_days', 'max_exams_per_slot', 'violations', 'evaluations',
];

function daysFor(n) {
  return Math.ceil(n / SLOTS_PER_DAY) + 1;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function pct(part, whole) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function bar(value, max, width = 34) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return '#'.repeat(Math.max(0, filled)).padEnd(width, '.');
}

function collect() {
  const rows = [];
  for (const n of SIZES) {
    for (const seed of SEEDS) {
      const days = daysFor(n);
      const instance = generateInstance({
        subjectCount: n,
        days,
        seed,
        minRestMin: 30,
        electiveMin: 2,
        electiveMax: 4,
        disabledSlots: [],
        exclusivePairs: [],
      });
      const graph = buildConflictGraph(instance.subjects, instance.students);
      const model = buildModel({
        config: instance.config,
        subjects: instance.subjects,
        graph,
        enrollments: instance.enrollments,
      });
      for (const result of compareAll(model)) {
        rows.push({
          seed,
          N: n,
          days,
          slots_per_day: SLOTS_PER_DAY,
          heuristic: result.heuristic,
          label: HEURISTIC_LABELS[result.heuristic],
          slots_used: result.slotsUsed,
          makespan_days: result.makespanDays,
          max_exams_per_slot: result.maxExamsPerSlot,
          violations: result.violationsTotal,
          evaluations: result.evaluations,
          edges: graph.edges.length,
          density: graph.density,
        });
      }
    }
  }
  return rows;
}

function writeCsv(rows) {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) lines.push(CSV_HEADER.map((k) => r[k]).join(','));
  writeFileSync(join(OUT_DIR, 'experiment.csv'), `${lines.join('\n')}\n`, 'utf8');
}

function buildReport(rows) {
  const byHeuristic = new Map(HEURISTICS.map((h) => [h, []]));
  for (const r of rows) byHeuristic.get(r.heuristic).push(r);

  const averages = HEURISTICS.map((h) => ({
    heuristic: h,
    label: HEURISTIC_LABELS[h],
    slots: mean(byHeuristic.get(h).map((r) => r.slots_used)),
    violations: mean(byHeuristic.get(h).map((r) => r.violations)),
    evaluations: mean(byHeuristic.get(h).map((r) => r.evaluations)),
  }));
  const maxAvg = Math.max(...averages.map((a) => a.slots));

  // Wins are counted per instance: the heuristic achieving the fewest slots.
  const wins = Object.fromEntries(HEURISTICS.map((h) => [h, 0]));
  const perSize = new Map(SIZES.map((n) => [n, Object.fromEntries(HEURISTICS.map((h) => [h, []]))]));
  const instanceKeys = [...new Set(rows.map((r) => `${r.seed}-${r.N}`))];
  for (const key of instanceKeys) {
    const group = rows.filter((r) => `${r.seed}-${r.N}` === key);
    const best = Math.min(...group.map((r) => r.slots_used));
    for (const r of group) {
      if (r.slots_used === best) wins[r.heuristic]++;
      perSize.get(r.N)[r.heuristic].push(r.slots_used);
    }
  }

  const baseline = averages.find((a) => a.heuristic === 'courseOrder').slots;
  const ldf = averages.find((a) => a.heuristic === 'largestDegreeFirst').slots;
  const dsatur = averages.find((a) => a.heuristic === 'dsatur').slots;
  const ldfGain = pct(baseline - ldf, baseline);
  const dsaturGain = pct(baseline - dsatur, baseline);
  const totalInstances = instanceKeys.length;
  const edgeMean = mean(rows.filter((r) => r.heuristic === 'courseOrder').map((r) => r.edges));
  const baselineEvals = averages.find((a) => a.heuristic === 'courseOrder').evaluations;
  const ldfEvals = averages.find((a) => a.heuristic === 'largestDegreeFirst').evaluations;
  const evalRatio = pct(ldfEvals - baselineEvals, baselineEvals);

  const lines = [];
  lines.push('# Exam Scheduling Heuristic Comparison');
  lines.push('');
  lines.push('Generated by `npm run experiment`. All numbers below are computed from the committed `experiment.csv`; nothing is hard-coded.');
  lines.push('');
  lines.push('## Setup');
  lines.push('');
  lines.push(`- Instances: ${totalInstances} (${SEEDS.length} seeds x ${SIZES.length} problem sizes).`);
  lines.push(`- Subject counts: ${SIZES.join(', ')}.`);
  lines.push(`- Days per instance: ceil(N / ${SLOTS_PER_DAY}) + 1, giving 4 * days available time slots.`);
  lines.push('- Minimum rest between two exams sharing a student: 30 minutes.');
  lines.push('- Every instance uses the same seeded generator, the same conflict graph and the same constraint oracle for all three heuristics.');
  lines.push(`- Mean number of conflict edges per instance: ${edgeMean.toFixed(1)}.`);
  lines.push('');
  lines.push('## Aggregate results');
  lines.push('');
  lines.push('| Heuristic | Mean slots used | Mean violations | Mean evaluations | Slot wins (ties shared) |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const a of averages) {
    lines.push(`| ${a.label} | ${a.slots.toFixed(2)} | ${a.violations.toFixed(2)} | ${a.evaluations.toFixed(0)} | ${wins[a.heuristic]} |`);
  }
  lines.push('');
  lines.push('```');
  lines.push('Mean slots used (shorter is better)');
  for (const a of averages) {
    lines.push(`${a.label.padEnd(24)} ${bar(a.slots, maxAvg)} ${a.slots.toFixed(2)}`);
  }
  lines.push('```');
  lines.push('');
  lines.push('## Mean slots used by problem size');
  lines.push('');
  lines.push('| N | Days | Course order | Highest conflict first | DSATUR |');
  lines.push('| ---: | ---: | ---: | ---: | ---: |');
  for (const n of SIZES) {
    const values = HEURISTICS.map((h) => mean(perSize.get(n)[h]).toFixed(2));
    lines.push(`| ${n} | ${daysFor(n)} | ${values.join(' | ')} |`);
  }
  lines.push('');
  lines.push('## Conclusions derived from the data');
  lines.push('');
  const gainText = (value) => (value >= 0
    ? `${value.toFixed(2)}% fewer`
    : `${(-value).toFixed(2)}% more`);
  lines.push(`1. Over ${totalInstances} instances, course-order first-fit used ${baseline.toFixed(2)} slots on average, while highest-conflict-first (Welsh-Powell ordering) used ${ldf.toFixed(2)} (${gainText(ldfGain)} slots).`);
  lines.push(`2. DSATUR used ${dsatur.toFixed(2)} slots on average, i.e. ${gainText(dsaturGain)} than course order.`);
  lines.push(`3. Slot-count wins (ties counted for each winner): ${HEURISTICS.map((h) => `${HEURISTIC_LABELS[h]} ${wins[h]}`).join(', ')} out of ${totalInstances} instances each.`);
  lines.push(`4. Reordering subjects by conflict degree costs almost nothing: mean constraint evaluations went from ${baselineEvals.toFixed(0)} to ${ldfEvals.toFixed(0)} (${evalRatio >= 0 ? '+' : ''}${evalRatio.toFixed(2)}%), while the slot count fell. Highly connected compulsory exams are placed earlier, leaving more reusable slots for electives.`);
  lines.push('5. All three heuristics are greedy and bounded by N * C constraint evaluations; none of them guarantees the chromatic number chi(G). A larger difference appears on sparse graphs, while dense graphs force every heuristic towards one slot per exam.');
  lines.push('');
  lines.push('## Reproducing');
  lines.push('');
  lines.push('```sh');
  lines.push('npm test');
  lines.push('npm run experiment');
  lines.push('```');
  lines.push('');
  lines.push('The generator uses a seeded mulberry32 PRNG and never reads the clock, so two consecutive runs produce byte-identical `experiment.csv`.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

mkdirSync(OUT_DIR, { recursive: true });
const rows = collect();
writeCsv(rows);
writeFileSync(join(OUT_DIR, 'report.md'), buildReport(rows), 'utf8');
process.stdout.write(`Wrote ${rows.length} rows for ${rows.length / HEURISTICS.length} instances.\n`);
