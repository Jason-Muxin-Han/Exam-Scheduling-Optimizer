# Algorithms

## The graph

Let `S` be the set of subjects and `T` the set of students. For a subject `s`,
let `E(s) = { t in T : t is enrolled in s }`. The **conflict graph** is the
undirected graph `G = (S, E)` with

```
{s_i, s_j} in E   iff   E(s_i) intersect E(s_j) is non-empty
```

A time slot is a color `c = (day, slot)`, and a valid coloring assigns each
subject a color such that adjacent subjects receive different colors. The
minimum number of colors needed is the chromatic number `chi(G)`; computing it
is NP-hard, so practical tools use heuristics.

Two structural facts are worth noting:

1. A **compulsory** subject is taken by every student, so it is adjacent to
   every other subject that has at least one student. Compulsory subjects form
   a clique joined to the rest of the graph, which is why they dominate the
   degree ordering.
2. A **mutually exclusive elective pair** `(a, b)` is constructed so that no
   student takes both, i.e. `E(a) intersect E(b) = empty`. There is no edge
   between them, so a greedy solver is free to reuse the same color for both.
   This is the mechanism behind the "two exams in one time slot" control.

The conflict graph is always derived from the enrollment table. It is not
sufficient for every possible constraint (for example, counting how many exams
one student takes per day needs the enrollment table itself), but it is exactly
the information needed for the same-slot constraint.

## The three heuristics

All three are bounded greedy constructions. They share the pinned
pre-placement, the `canPlace()` oracle and the `validate()` report.

### 1. Course order (first-fit baseline)

Order subjects by ascending numeric id. For each subject, scan colors
`0 .. C-1` and take the first color with zero violations. This is the strategy
"just schedule the courses in order".

### 2. Highest conflict first (Welsh-Powell ordering)

Sort subjects by descending conflict degree (ties broken by id), then run the
same first-fit scan. High-degree subjects are placed while the palette is still
empty, leaving more reusable colors for the low-degree electives. The sorting
cost is `O(N log N)` and it does not change the number of constraint checks in
any meaningful way.

### 3. DSATUR (reference)

At each step, choose the uncolored subject with the largest **saturation
degree**: the number of distinct colors already used by its colored neighbors.
Ties are broken by degree, then by id. DSATUR is usually the strongest of the
three because it reacts to the partial coloring instead of following a fixed
order. Its worst case here is `O(N^2 * C)` evaluations, bounded by `N * C`
placements, which is harmless for `N <= 60`.

## What "slots used" means

```
slotsUsed = | { c : at least one subject is assigned color c } |
```

This is the number of distinct `(day, slot)` pairs actually occupied, not the
largest color index and not the number of days. The comparison panel also
reports `makespanDays`, `maxExamsPerSlot`, `violationsTotal` and the number of
constraint evaluations.

## Constraint handling

`canPlace(subject, color, placed, model)` returns a list of violations for a
candidate placement. The solver takes the first color with an empty list. If
no such color exists, it takes the color with the **fewest** violations and
continues. Consequences:

- The solver always terminates: the outer loop visits `N` subjects and the
  inner loop visits `C` colors exactly once, so at most `N * C` evaluations.
  There is no backtracking and no `while (true)`.
- Infeasible instances still produce a complete, renderable timetable plus an
  explicit list of violations and `feasible: false`.
- `validate(assignment, model)` independently recomputes every constraint from
  scratch, which cross-checks the incremental oracle.

Violation types: `durationExceedsSlot`, `conflictInSameSlot`,
`minRestViolation`, `disabledSlotUsed`, `pinnedInDisabledSlot`,
`pinnedConflict`, `colorOutOfRange`, `unscheduled`.

## Complexity summary

| Step | Cost |
| --- | --- |
| Enrollment to conflict graph | `O(sum_t |E_t|^2)` |
| Degree sort (heuristic 2) | `O(N log N)` |
| DSATUR selection | `O(N^2 * Delta)` bounded in practice |
| Constraint evaluation | `O(N * C * N)` worst case |
| Independent validation | `O(N^2)` on the edge set |

`C = days * 4 <= 56` and `N <= 60` in the interactive tool, so a full recompute
is effectively instantaneous.

## What is not implemented

This is a teaching demo, not an exact solver. There is no branch-and-bound
chromatic number search, no tabu search / simulated annealing, no room capacity
or invigilator constraints, and no soft-objective penalty function. "At most
two exams per student per day" and "avoid consecutive exams" were illustrative
examples in the original brief and are deliberately not implemented; the
minimum-rest control generalizes the second one. These are natural extensions
listed at the end of `docs/TIME_MODEL.md`.
