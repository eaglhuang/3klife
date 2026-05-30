---
task_id: TASK-AAO-0088
title: "rollback evidence backfill (lift dogfood 89→91)"
status: done
priority: P1
closure_authority: target_repo
depends_on: []
started_at: "2026-05-30T13:39:06+08:00"
started_by_agent: "antigravity-gemini-3.5-flash"
closed_at: "2026-05-30T14:06:30+08:00"
scopePaths:
  - "atomic-registry.json"
  - "atomic_workbench/atomization-coverage/"
deliverables:
  - "atomic-registry.json"
  - "atomic_workbench/atomization-coverage/dogfood-score.json"
  - "atomic_workbench/atomization-coverage/dogfood-score.md"
validators:
  - "node atm.mjs atomize score"
  - "node atm.mjs hook pre-commit --json"
  - "node atm.mjs hook pre-push --json"
atomizationImpact:
  ownerAtomOrMap: null
  mapUpdates: []
outOfScope:
  - "Do not change atomize score evaluation logic"
  - "Do not manually edit dogfood-score.json or dogfood-score.md"
  - "Do not add rollback evidence to atoms with no semantic relation to backfill"
nonGoals:
  - "Do not use --no-verify or --force to bypass hooks"
  - "Do not perform ownership backfill or other backfill types"
  - "Do not change schemaVersion or .gitignore or baseline"
---

## Goal
Backfill `atomic_workbench/atomization-coverage/atom-backfill-rollback.md` evidence references
into at least 3 atoms in `atomic-registry.json` whose semantics are genuinely related to the
atomize backfill lifecycle. This raises `withRollback` from 0/7 to ≥3/7, lifting
`evidence_coverage` from 75% to ≥86%, and the overall dogfood score from 89→≥91 (Grade A).

## Acceptance
- `atomic-registry.json`: exactly the 3 chosen atoms have `atom-backfill-rollback.md` appended to their `evidence[]`.
- `node atm.mjs atomize score` reports `overall_atomization_score ≥ 91` and `grade: "A"`.
- `dogfood-score.json` updated by the score command (not hand-edited).
- `dogfood-score.md` synchronized (or stale state is reported to Captain).
- All validators exit 0.
