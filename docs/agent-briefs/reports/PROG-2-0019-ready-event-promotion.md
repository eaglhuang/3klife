# PROG-2-0019 Ready Event Promotion

Generated at: 2026-05-29T15:12:00Z

## Scope

- Task: PROG-2-0019 source-event-packet ready-event promotion.
- Goal: keep the work strictly upstream by turning primary-canon source-event-packets into `canonicalWrites=false` staged ready-event candidates and validating the runtime delta through sidecar exports.
- Non-goal: this task does not decide scene eligibility, primary anchors, or focus-general projection rules.

## What Changed

- Added `promote_source_packets_to_ready_events.py` in both local and external `3klife-npc-brain` repos.
- The bridge selects `strong` / `rich` primary-canon source-event-packets, filters blocked relationship cues, and emits:
  - promotion queue
  - promoted ready-events
  - merged ready-events (`base + promoted`)
- All generated rows preserve provenance fields and remain `canonicalWrites=false`.

## Validation Summary

- Front6 batch: `18` promoted candidates, sidecar export `6/6 ok`.
- Front6 readiness bands: `needs-etl-fill 5 -> 4`, `playable-with-audit-risks 1 -> 2`.
- Needs-fill batch: `63` promoted candidates, sidecar export `21/21 ok`.
- Needs-fill readiness bands: `needs-etl-fill 16 -> 10`, `playable-with-audit-risks 5 -> 11`.
- Persona-based delta across 21 needs-fill targets: all `21/21` gained ready events, total `readyEventCount` delta = `131`.

## Largest Ready-Event Gains

| generalId | deltaReady |
| --- | ---: |
| ma-chao | 13 |
| liu-zhang | 10 |
| sima-yi | 10 |
| fa-zheng | 8 |
| pang-tong | 8 |
| ma-dai | 7 |

## Guardrails

- Relationship counts were not inflated by this task; the bridge mainly lifts ready-event coverage.
- `alias-only`, `relationship_external`, and `missing-pair-relation-cue` are blocked from direct promotion.
- Remaining `needs-etl-fill` targets should be improved by stronger relationship-backed location/event refinement, not by downstream scene heuristics.

## Key Artifacts

- `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0019-ready-event-promotion-report.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0019-promoted-ready-events.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0019-front6-readiness-audit.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0019-needs-fill-readiness-audit.json`