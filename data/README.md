# Data Templates

Two small, fully anonymised examples of the accepted import formats. Neither
file contains real people or real course data; all ids are sequential integers.

| File | Format | Contents |
| --- | --- | --- |
| `template.csv` | Enrollment edge list | Header `student_id,subject_id`, 24 students, 8 subjects, 96 rows. |
| `template.json` | Complete instance | 12 students, 8 subjects, 48 enrollment rows, with per-subject kind and duration. |

## CSV

```csv
student_id,subject_id
1001,1
1001,2
1001,3
```

The header is mandatory and must be exactly `student_id,subject_id`. One row
per enrollment. Extra columns are ignored; free-text identifiers are rejected.

## JSON

```json
{
  "config": { "days": 4, "minRestMin": 30, "seed": 0 },
  "subjects": [
    { "id": "1", "kind": "compulsory", "durationMin": 120, "pinned": null }
  ],
  "enrollments": [
    { "student_id": "1001", "subject_id": "1" }
  ],
  "exclusive_pairs": []
}
```

## Privacy notice

**Use numeric or hashed IDs only. Never put names, emails, student numbers or
any personal information in these files.** The importer validates ids against
`^\d+$` or `^[A-Za-z0-9_-]{8,64}$` and rejects everything else. See
`../docs/DATA_AND_PRIVACY.md` for the full rules and anonymisation guidance.

The "Load sample" button in the webpage uses exactly the same edge list as
`template.csv`.
