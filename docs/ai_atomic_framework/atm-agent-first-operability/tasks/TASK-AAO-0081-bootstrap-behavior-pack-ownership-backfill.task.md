---
task_id: TASK-AAO-0081
title: "register bootstrap-runtime-map + behavior-pack-map path patterns"
status: done
priority: P0
closure_authority: target_repo
depends_on: []
scopePaths:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node atm.mjs atomize inventory --json"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.path-to-atom-map"
  mapUpdates: []
outOfScope:
  - "CID 欄位 backfill — TASK-AAO-0082"
  - "language-adapter-map (4) / atom-birth-map (2) / guard-validation-map (1)"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---

## Goal
Register bootstrap-runtime-map and behavior-pack-map path patterns to eliminate 92 unowned files gap and increase source ownership coverage score.

## Acceptance
- 3 path patterns added to path-to-atom-map.json.
- unowned files count reduced below 20.
- source ownership coverage score increased to 95%+.
