# Contributing

Thanks for taking an interest in this project.

## Ground rules

- **All repository content is in English**: code, comments, identifiers,
  documentation, sample data, workflow files and commit messages. The only
  Chinese text lives in the `zh` dictionary in `src/i18n.js`, because the
  webpage UI is bilingual by design.
- **No dependencies and no build step.** The site must keep working from a
  plain static HTTP server. Do not add a bundler, a framework, a CDN script or
  an external font.
- **All asset paths are relative** (`./...`), never absolute (`/...`), because
  GitHub Pages serves this as a project site under `/Exam-Scheduling-Optimizer/`.
- The pure core modules (`src/config.js`, `rng.js`, `timemodel.js`,
  `generator.js`, `graph.js`, `constraints.js`, `solver.js`) must not reference
  `window`, `document`, `fs`, `process`, `Date` or `Math.random()`. They are
  imported by the browser, `node --test` and the offline experiment.

## Before opening a pull request

```sh
npm test
npm run experiment
python3 -m http.server 8000
```

1. All tests pass.
2. `analysis/results/experiment.csv` and `report.md` are regenerated with
   `npm run experiment` if generator or solver behaviour changed; the report
   derives its conclusions from the CSV, so never edit conclusions by hand.
3. The page loads with no console errors. Verify at least one change to each
   of the nine controls, the language toggle, import, and the four exports.
4. Run `node --test tests/i18n.test.js` after adding any UI string: the test
   checks `en`/`zh` key parity and scans `data-i18n` keys in `index.html`.

## Adding a UI string

Add the key to **both** `dictionaries.en` and `dictionaries.zh` in
`src/i18n.js`. Use `data-i18n="key"` for static markup and `t('key', lang)`
for text rendered in JavaScript. Use `tf()` for strings with `{placeholders}`.

## Privacy

Never commit real enrollment data. The import path accepts numeric or hashed
ids only; see `docs/DATA_AND_PRIVACY.md`.
