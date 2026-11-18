# The Time Model

Pure graph coloring answers one question: can these two exams share a slot?
Real timetabling also asks how long each exam lasts and how much rest a student
gets between exams. This document explains how both are represented without
breaking the coloring abstraction.

## Two layers

**Discrete layer — colors.** A color is a `(day, slot)` pair:

```
colorIndex(day, slot) = day * SLOTS_PER_DAY + slot
C = days * SLOTS_PER_DAY
```

With the constants in `src/config.js`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `SLOT_STARTS_MIN` | `[540, 690, 840, 990]` | 09:00, 11:30, 14:00, 16:30 |
| `SLOT_LENGTH_MIN` | `120` | Maximum duration of one exam |
| `SLOT_INTERVAL_MIN` | `150` | Start-to-start distance of adjacent slots |
| `DAY_SPAN_MIN` | `1440` | Keeps different days disjoint in absolute minutes |
| `SLOTS_PER_DAY` | `4` | Four exam periods per day |

Colors are the unit of graph coloring and of the `slotsUsed` metric.

**Continuous layer — minute coordinates.** Each color has an absolute start
time `t(c) = day * 1440 + SLOT_STARTS_MIN[slot]`. Because the slot starts are
distinct and the day span is large, `c -> t(c)` is injective. For a subject
`s` placed at color `c`:

```
end(s, c) = t(c) + s.durationMin
```

For two exams `A` at `cA` and `B` at `cB` that share at least one student,
let the earlier start be `tA` and the later `tB`. The rest is

```
rest(A, B) = tB - (tA + durationA)
```

and the constraint is `rest(A, B) >= minRestMin`. Cross-day pairs automatically
satisfy it because `DAY_SPAN_MIN` makes the gap very large, so a single global
formula covers both same-day and cross-day cases.

## Why minutes instead of "N slots apart"

The alternative is to require `|cA - cB| > k` for some integer gap. It is
simpler, but then **per-subject duration has no effect on feasibility at all**:
a 60-minute exam and a 120-minute exam behave identically, and the "set exam
duration" control becomes cosmetic. The minute model avoids that.

Worked example with `minRestMin = 45`:

- Subject A lasts 120 minutes and starts at 09:00 (`t = 540`), ending at 11:00.
  The next slot starts at 11:30 (`t = 690`), so `rest = 690 - 660 = 30 < 45`.
  A conflicting exam **cannot** go in that adjacent slot.
- Change A's duration to 60 minutes: it ends at 10:00, so
  `rest = 690 - 600 = 90 >= 45`. The adjacent slot is now **allowed**.

Only the duration changed, yet the feasible color set, the greedy placement,
the final `slotsUsed` and the day distribution all change. This is the reason
the project measures the exam interval in minutes.

A second effect: `durationMin > SLOT_LENGTH_MIN` (or a non-positive duration)
is itself a violation, so the UI can demonstrate an infeasible instance by
setting a subject to 150 or 180 minutes.

## "Avoid consecutive exams" is a special case

With the numbers above, setting `minRestMin = SLOT_INTERVAL_MIN = 150` makes
adjacent slots impossible for any valid duration:

```
adjacent slots:  rest = 150 - durationA < 150   (because durationA > 0)
one slot apart:  rest = 300 - durationA >= 180  (because durationA <= 120)
```

So the "avoid back-to-back exams" idea is exactly the minimum-rest control with
a 150-minute threshold; no separate toggle is needed. Setting the threshold
even higher (for example 200 minutes) also rules out one-slot gaps and pushes
conflicting exams to different days.

## Pinned subjects and disabled slots

- A pinned subject is pre-placed at `colorIndex(pin.day, pin.slot)` before the
  greedy loop, so every other subject sees it through `canPlace()`. If two
  pinned subjects conflict, `validate()` reports `pinnedConflict` rather than
  crashing.
- A disabled color is in `model.disabledColors`. Any placement there yields a
  `disabledSlotUsed` violation. A pin pointing at a disabled color also yields
  `pinnedInDisabledSlot`.
- Reducing the number of days can leave a pin outside the palette; the solver
  clamps the color and `validate()` reports the mismatch.

## Infeasibility policy

Instances can be over-constrained: too few days, a very large minimum rest,
several conflicting pins, or an overlong exam. The solver is a **bounded greedy
construction with best-effort fallback**:

1. For each subject, scan all `C` colors once.
2. Take the first zero-violation color. If none exists, take the color with the
   fewest violations.
3. Report `feasible: false`, the full violation list and per-type counts.

There is no recursion, no backtracking and no unbounded loop, so the page can
never hang. The UI shows a warning banner and still renders the complete
timetable, which is much more useful for exploring constraints than an error
dialog.

## Possible extensions

- Cap the number of exams one student takes per day (requires the enrollment
  table, not just the conflict graph).
- Treat "avoid consecutive exams" as a soft objective with a penalty score
  instead of a hard rest threshold.
- Add room capacity, invigilator availability and cohort-level fairness.
- Replace greedy construction with tabu search or an exact branch-and-bound
  chromatic number solver for small instances.
