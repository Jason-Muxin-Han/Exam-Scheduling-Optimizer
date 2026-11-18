# Exam Scheduling Optimizer

An interactive, zero-build teaching project that models exam timetabling as
**graph coloring** and then adds the constraints that make real scheduling
hard: per-subject durations, a minimum rest between exams, locked exam times,
disabled slots, compulsory versus elective subjects, and mutually exclusive
electives that may share a single slot.

- **Live demo:** <https://jason-muxin-han.github.io/Exam-Scheduling-Optimizer/>
- **Webpage UI:** Chinese / English toggle (follows the browser language by default)
- **Everything else in this repository:** English
- **Dependencies:** none. No build step, no npm install, no CDN, no framework.

---

## The idea in one paragraph

Each exam is a node. Draw an edge between two exams when at least one student is
enrolled in both. Two adjacent nodes may not receive the same color, and a color
is a `(day, slot)` pair. Minimizing the number of colors used is therefore
exactly a graph coloring problem, and `chi(G)` is a lower bound on the number of
time slots any valid timetable needs. This project compares three bounded greedy
coloring heuristics on the same instance, and then layers real-world constraints
on top of the pure coloring model.

---

## Quick start

ES modules and `fetch()` are blocked by browser CORS rules on `file://`, so serve
the folder over HTTP. GitHub Pages already does this.

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

Node 22+ is only needed for the tests and the offline experiment:

```sh
npm test            # 47 unit tests, zero dependencies
npm run experiment  # regenerates analysis/results/experiment.csv and report.md
```

No `npm install` is required: `package.json` contains only `"type": "module"`
and three scripts.

---

## The nine interactive controls

| # | Control | What it changes |
| --- | --- | --- |
| 1 | Exam days | Number of days; total colors `C = days * 4`. |
| 2 | Exam duration for one subject | Minutes; changes the end time and therefore the feasible slots. |
| 3 | Lock a subject's exam time | Pins a subject to a chosen `(day, slot)` before solving. |
| 4 | Disable a day / slot | Forbids one color for every subject. |
| 5 | Minimum rest between exams | Minutes from the end of one exam to the start of the next, for exams sharing a student. |
| 6 | Total exam subjects | Regenerates the seeded instance (5-60 subjects). |
| 7 | Mutually exclusive elective pair | Two subjects whose students may take only one; the edge between them disappears, so they can share a slot. |
| 8 | Compulsory / elective per subject | Compulsory subjects are taken by every student and become high-degree hubs. |
| 9 | Electives per student (min / max) | Controls how many electives each synthetic student takes. |

Extra: seeded regeneration, a heuristic selector for the displayed timetable,
anonymised CSV/JSON import, four exports, and the language toggle.

> Note: "at most two exams per student per day" and "avoid consecutive exams"
> were examples of possible extensions in the original brief, not implemented
> features. The second idea is already covered in a more general form by
> control 5: setting the minimum rest to 150 minutes or more makes adjacent
> slots impossible for any exam duration.

---

## Comparison results

`analysis/run-experiment.js` runs 96 seeded instances (24 seeds x 4 sizes) and
writes committed, reproducible results to `analysis/results/`.

| Heuristic | Mean slots used | Slot wins (ties shared) |
| --- | ---: | ---: |
| Course order (first-fit) | 15.65 | 20 |
| Highest conflict first (Welsh-Powell ordering) | 14.91 | 57 |
| DSATUR (reference) | 14.48 | 89 |

Highest-conflict-first used **4.73% fewer** slots than course order on average;
DSATUR used **7.46% fewer**. All three use the same conflict graph, the same
pinned pre-placement and the same constraint oracle. See
[`analysis/results/report.md`](analysis/results/report.md) for the full tables.

---

## Repository layout

```
index.html                  Single page shell with data-i18n markup
css/style.css               Responsive styling, zero frameworks
src/                        Pure core + browser shell (ES modules)
  config.js  timemodel.js  rng.js  generator.js  graph.js
  constraints.js  solver.js  i18n.js  importer.js  exporter.js
  main.js         Bootstrap and recompute pipeline
  ui/             controls, timetable, graphview, stats renderers
data/                       Anonymised CSV / JSON import templates
docs/                       Algorithm, time-model and privacy notes
analysis/                   Offline experiment and committed results
tests/                      node:test unit tests
.github/workflows/pages.yml GitHub Pages deployment
```

The pure core (`config`, `timemodel`, `rng`, `generator`, `graph`,
`constraints`, `solver`) never touches the DOM, the filesystem or the clock.
The exact same solver code runs in the browser, in `node --test` and in the
offline experiment.

---

## Data and privacy

The default data is entirely synthetic and generated from a seeded PRNG. No
third-party dataset is bundled. The import feature accepts only numeric IDs or
hashed tokens (`[A-Za-z0-9_-]{8,64}`); names, emails, student numbers and any
free-text identifier are rejected. See [`docs/DATA_AND_PRIVACY.md`](docs/DATA_AND_PRIVACY.md).

---

## Documentation

- [`docs/ALGORITHMS.md`](docs/ALGORITHMS.md) — graph coloring model, the three heuristics, complexity, slot counting.
- [`docs/TIME_MODEL.md`](docs/TIME_MODEL.md) — why rest is measured in minutes and how duration changes feasibility.
- [`docs/DATA_AND_PRIVACY.md`](docs/DATA_AND_PRIVACY.md) — schemas and anonymisation rules.
- [`analysis/README.md`](analysis/README.md) — experiment methodology.

---

## Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the repository root on
every push to `main`. All asset paths are relative, so the project site works
under `/Exam-Scheduling-Optimizer/`.

**One manual step is required after the first push:** in the repository, open
**Settings -> Pages -> Build and deployment -> Source** and select **GitHub
Actions**. `configure-pages` does not set this for you. Then re-run the workflow
with the `workflow_dispatch` button if the first run failed.

---

## License

MIT. See [`LICENSE`](LICENSE).
