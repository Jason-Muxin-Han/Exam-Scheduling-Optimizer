# Data and Privacy

## No real dataset is bundled

The repository ships **no third-party course or enrollment dataset**. Public
exam-timetabling benchmarks exist (Toronto / Carter, ITC 2007, UniTime Purdue),
but their redistribution terms are often unclear or merely described as
"publicly available". Rather than take that risk, this project uses a seeded
synthetic generator by default and offers an import path for data the user is
actually allowed to use.

The user is responsible for ensuring that any imported data is permitted for
reuse and contains no personal information.

## Synthetic generator

`src/generator.js` produces, from a single `mulberry32(seed)`:

- `subjects[]` — numeric id, course-style name, `compulsory` or `elective`,
  duration and optional pin.
- `students[]` — numeric ids starting at `1001`, each with a list of subject
  ids. Every student takes all compulsory subjects plus `k` electives drawn
  uniformly from `[electiveMin, electiveMax]`.
- `enrollments[]` — the flattened `(student_id, subject_id)` edge list.
- `exclusivePairs[]` — pairs whose two subjects never share a student.

A mutually exclusive pair is enforced by dropping the second member of the pair
whenever both appear in one student's drawn electives. The random stream does
not depend on which pairs exist, so adding a pair can only **remove** conflict
edges, never create new ones.

Nothing in this pipeline reads `Math.random()`, `Date`, the clock or any
platform API, so a seed reproduces an instance byte-for-byte in the browser, in
Node tests and in the offline experiment.

## Import schemas

### CSV — enrollment edge list

`data/template.csv` is the reference. Header is mandatory and exact:

```csv
student_id,subject_id
1001,1
1001,2
1001,3
```

One row per enrollment. Subject ids become internal numeric ids in sorted
order; the original token is kept as `externalId` for display and export.

### JSON — complete instance

`data/template.json` is the reference:

```json
{
  "config": { "days": 4, "minRestMin": 30, "seed": 0 },
  "subjects": [
    { "id": "1", "kind": "compulsory", "durationMin": 120, "pinned": null },
    { "id": "2", "kind": "elective", "durationMin": 90, "pinned": null }
  ],
  "enrollments": [
    { "student_id": "1001", "subject_id": "1" },
    { "student_id": "1001", "subject_id": "2" }
  ],
  "exclusive_pairs": []
}
```

`subjects` is optional for CSV-style JSON; when present, enrollment rows must
reference ids that appear in it. `pinned` is `{ "day": number, "slot": number }`
with zero-based indices. `config` may override `days` and `minRestMin`.

## Identifier validation

Every external id is trimmed and must match exactly one of:

```
^\d+$                      numeric id
^[A-Za-z0-9_-]{8,64}$     hashed / opaque token
```

Rejected: names, email addresses, real student numbers containing letters or
punctuation outside the token alphabet, free text, non-ASCII identifiers,
whitespace inside ids, and anything containing `@`. The importer returns a
list of i18n error keys rather than throwing, and the UI displays them in the
active language.

Hard limits: 60 subjects, 200000 enrollment rows. Duplicate subject ids,
dangling references, non-positive durations and malformed CSV headers are all
rejected.

## What is exported

- `exam-schedule.csv` — day, slot, start/end time, subject id, name, duration, kind, locked flag.
- `exam-schedule.json` — config, seed, heuristic, feasibility, violations, subjects and assignment.
- `conflict-graph.json` — nodes with degree and enrollment counts, edges, density.
- `conflict-graph.svg` — the rendered graph.

Exports contain only ids, durations and numeric metadata. They never contain
names or any personal field, because the importer never accepts one.

## Practical anonymisation advice

If you want to use a real (and permitted) timetable:

1. Replace every student identifier with a sequential integer or a salted hash
   before the data reaches this tool. Do the mapping outside the browser.
2. Keep the mapping table somewhere private; do not commit it.
3. Do not include names, emails, programme names, grades, demographic fields
   or free-text notes — they are not needed to build a conflict graph.
4. Check the license or data-use permission of the source before
   redistributing any derived file.

The generated conflict graph only needs the bipartite student-subject relation;
everything else is unnecessary and increases privacy risk.
