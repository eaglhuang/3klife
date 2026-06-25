# Paper EN Table Guards

Date: 2026-06-26  
Use: denominator and layout guard for the English paper

## Why This Exists

The English paper is more likely than the Chinese paper to trigger reviewer scrutiny on denominator discipline, table interpretation, and benchmark comparability. This file fixes the intended reading before any table text is translated.

## Core Denominator Rules

These numbers are not interchangeable:

- `20 scenarios`
- `42 mode comparisons`
- `252 policy rows`
- `294 ablation rows`
- `210 adversarial rows`
- `51-row enforcement-timing projection`
- `24,332 out-of-sync instances` from SyncBench

Required interpretation:

- `20 scenarios` and `42 mode comparisons` describe the benchmark family and its comparison surface.
- `252 policy rows`, `294 ablation rows`, and `210 adversarial rows` are row universes inside the v0.2 paper profile.
- `51-row enforcement-timing projection` is a projection derived from policy-view route outcomes; it is not additive with the other row universes.
- `24,332 out-of-sync instances` belongs to SyncBench and measures a different problem class.

## Table-Level Guards

### Table 18

Purpose:

- distinguish `v0.1 baseline` from `v0.2 paper profile`;
- keep the denominator at `42 mode comparisons`;
- explain reporting-role separation, not larger benchmark scale.

Do not translate it into language that implies:

- v0.2 replaced the whole benchmark history;
- all later row counts share the same denominator as Table 18.

### Table 19

Purpose:

- provide the paper-facing summary table for Results, Ablation, and enforcement timing.

Must remain explicit:

- the table mixes multiple row universes;
- it is a summary table, not a universal denominator table;
- forwarding rows use the 51-row enforcement-timing projection as denominator.

Required sentence idea to preserve:

```text
Table 19 should be read as a paper-facing summary table rather than a single denominator surface from which every detailed statistic may be compared directly.
```

### Table 20

Purpose:

- project benchmark results back to research-question level.

Must remain explicit:

- it is not a fresh benchmark;
- it separates what is answered by v0.2 from what remains future work;
- it should not be rewritten as if all RQs were resolved at the same evidence strength.

## SyncBench Guard

If SyncMind / SyncBench appears near tables or benchmark discussion, the English text must preserve this distinction:

```text
SyncBench is a future external replay source for out-of-sync recovery, not a directly comparable admission benchmark denominator.
```

Do not allow these rewrites:

- `AdmissionBench is smaller than SyncBench`
- `SyncBench proves larger-scale validation`
- `24,332 instances vs. 20 scenarios`
- `sample size superiority`

## Layout Risks In English Tables

Highest-risk items:

- long table titles;
- long artifact paths;
- long method names such as `Semistructured Merge with Language-Specific Syntactic Separators`;
- benchmark qualifiers like `paper-facing summary`, `label-retained blind audit`, `single governance domain`.

Prefer:

- shorter captions with detail moved to body text;
- preserving denominator explanations in body prose instead of forcing them into caption overload;
- controlled line breaks in table headers;
- appendix relocation for very long path-heavy evidence text if needed.

## Reviewer-Sensitive Sentences

Before finalizing the English tables, re-check that the manuscript still clearly states:

- this is not a large-scale comparative victory claim;
- this is a single-governance-domain paper profile;
- row universes are intentionally distinct;
- external validity remains future work;
- SyncBench is complementary rather than directly comparable.

## Go / No-Go

Do not finalize any English table if its translated wording obscures which denominator is active.
