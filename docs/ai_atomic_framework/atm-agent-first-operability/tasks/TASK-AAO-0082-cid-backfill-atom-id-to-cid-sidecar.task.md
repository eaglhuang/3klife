---
task_id: TASK-AAO-0082
title: "CID backfill via atom-id-to-cid.json sidecar (parallel intersection math foundation)"
status: done
priority: P0
closure_authority: target_repo
depends_on: []
scopePaths:
  - "atomic_workbench/atomization-coverage/atom-id-to-cid.json"
  - "scripts/atom-id-to-cid-backfill.ts"
  - "scripts/validate-atom-id-to-cid.ts"
  - "schemas/atom-id-to-cid.schema.json"
  - "package.json"
deliverables:
  - "atomic_workbench/atomization-coverage/atom-id-to-cid.json"
  - "scripts/atom-id-to-cid-backfill.ts"
  - "scripts/validate-atom-id-to-cid.ts"
  - "schemas/atom-id-to-cid.schema.json"
  - "package.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:atom-id-to-cid"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.cid-foundation"
  mapUpdates:
    - path_pattern: "atomic_workbench/atomization-coverage/atom-id-to-cid.json"
      atom_id: "atm.cid-foundation"
      capability: "Content-addressed atom CID lookup keyed by path-to-atom-map atom_id, foundation for parallel intersection scheduling"
      coverage_status: "active"
outOfScope:
  - "task 系統實際引用 atom-id-to-cid（留下一張卡）"
  - "atomic-registry CID 整合"
  - "path-to-atom-map.json 結構變更"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---

## Goal
Implement atom-id-to-cid.json sidecar file to backfill content-addressed CIDs for all unique atoms in path-to-atom-map.json. This provides the mathematical foundation for parallel intersection scheduling.

## Acceptance
- schemas/atom-id-to-cid.schema.json exists and defines v1 structure
- scripts/atom-id-to-cid-backfill.ts exists and populates atom-id-to-cid.json deterministically
- scripts/validate-atom-id-to-cid.ts exists and enforces schema compliance and two-way mapping consistency
- package.json includes npm script for validate:atom-id-to-cid
- All unique atoms from path-to-atom-map.json mapped to base64url content-addressed CIDs
