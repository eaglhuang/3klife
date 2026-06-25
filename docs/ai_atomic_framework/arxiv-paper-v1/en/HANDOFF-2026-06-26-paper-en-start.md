# HANDOFF-2026-06-26 paper-en start

## Mission

Prepare the English paper pass from the now-stable Chinese manuscript without reopening large structural changes.

## Current Status

- The Chinese source has already absorbed the highest-CP final-stage literature additions.
- `paper.v3.1.md`, `paper-zh.tex`, and `references.bib` were updated and synced on 2026-06-26.
- The important late additions are:
  - structured / semistructured merge positioning
  - transactional agent runtime positioning
  - SyncMind / SyncBench citation and denominator-boundary clarification

## Latest Stable Compile Baseline

- Chinese compile gate passed.
- Latest known summary:
  - `Errors: 0`
  - `Unresolved: 0`
  - `Pages: 38`
  - `Overfull: 14`

Treat this as the baseline to preserve while starting the English version.

## What Changed and Why

1. Related Work was strengthened in a narrow, controlled way
- SafeMerge and semistructured merge systems were added as adjacent design points.
- Atomix and Cordon were added as adjacent transactional runtime design points.
- These additions close the most meaningful citation gap without expanding the paper into a broader survey.

2. SyncBench comparison was calibrated
- The manuscript now states that SyncBench's `24,332 out-of-sync instances` should not be directly compared to AdmissionBench row universes.
- SyncBench remains useful as an external replay source, not as a same-unit denominator.

## Read These Files Before Starting `paper-en.tex`

1. `docs/ai_atomic_framework/arxiv-paper-v1/en/README.md`
2. `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-READINESS-CHECKLIST.md`
3. `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-GLOSSARY.md`
4. `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-CITATION-MAP.md`
5. `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-TABLE-GUARDS.md`
6. `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-CLAIM-RISK-SCAN.md`
7. `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-LAYOUT-PLAN.md`

## Non-Negotiable English Guards

1. Do not strengthen correctness claims
- ATM remains a pre-write admission and conflict-control substrate.
- It does not become a semantic correctness or semantic soundness guarantee in English.

2. Do not blur benchmark denominators
- Keep scenario counts, policy rows, ablation rows, adversarial rows, and enforcement-timing projections distinct.

3. Do not reopen broad related-work expansion
- The late-stage CP-max additions are already in.
- General multi-agent frameworks and CAS / agent-memory clusters should stay minimized unless a concrete English phrasing issue forces a tiny citation adjustment.

## Recommended Translation Order

1. Abstract / Introduction
2. Related Work
3. Method / formalization
4. Evaluation prose
5. Tables and captions
6. Appendix and artifact-heavy sections

## Practical Starting Rule

If an English sentence sounds stronger, broader, or more comparable than the current Chinese sentence, assume it is wrong and rewrite it downward first.
