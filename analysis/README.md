# Offline Comparison Experiment

This folder reproduces the comparison between the two greedy strategies from the
project brief — **schedule by course order** and **schedule the most conflicted
course first** — and adds **DSATUR** as a stronger reference point.

## Running

```sh
npm test            # unit tests for the pure core
npm run experiment  # regenerates results/experiment.csv and results/report.md
```

Node 22 or newer is required. There are no dependencies and no build step.

## Method

- 24 fixed seeds x 4 subject counts (20, 30, 40, 50) = 96 synthetic instances.
- Each instance gets `ceil(N / 4) + 1` exam days, four time slots per day, and a
  30-minute minimum rest between exams that share a student.
- All three heuristics are run against **the same** seeded instance, the **same**
  conflict graph, and the **same** `canPlace()` constraint oracle. Pinned
  subjects, disabled slots and exclusive pairs are all left at their defaults so
  only the vertex ordering differs.
- `slots_used` is the number of distinct `(day, slot)` pairs that contain at
  least one exam. A smaller value is better.

## Outputs

- `results/experiment.csv` — one row per (instance, heuristic) with English
  headers: `seed,N,days,slots_per_day,heuristic,slots_used,makespan_days,
  max_exams_per_slot,violations,evaluations`.
- `results/report.md` — aggregate table, per-size table, an ASCII bar chart and
  conclusions computed from the CSV at generation time. No conclusion is
  hard-coded.

Both files are committed so the numbers can be read directly on GitHub. The
generator is seeded and never reads the clock, so two consecutive runs are
byte-identical.

## Why the difference appears

Compulsory subjects are taken by every student and therefore form a clique that
is adjacent to almost everything else. Course-order first-fit may place a
low-degree elective early and then be forced to open a new slot for each
high-degree compulsory exam. Ordering by conflict degree (Welsh-Powell) places
the constrained exams first; DSATUR dynamically re-ranks by saturation degree.
Neither heuristic is exact — they are bounded greedy constructions, not
chromatic-number solvers.
