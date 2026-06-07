---
task_id: TASK-AAO-0083
title: "ExternalTaskSourcePlugin interface (governance Layer 1)"
status: done
priority: P1
closure_authority: target_repo
depends_on: []
scopePaths:
  - "packages/plugin-sdk/src/external-task-source.ts"
  - "packages/plugin-sdk/src/capability.ts"
  - "packages/plugin-sdk/src/index.ts"
  - "tests/plugin-sdk/external-task-source.test.ts"
deliverables:
  - "packages/plugin-sdk/src/external-task-source.ts"
  - "packages/plugin-sdk/src/capability.ts"
  - "packages/plugin-sdk/src/index.ts"
  - "tests/plugin-sdk/external-task-source.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run test -- tests/plugin-sdk/external-task-source.test.ts"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.plugin-sdk-map"
  mapUpdates:
    - path_pattern: "packages/plugin-sdk/src/external-task-source.ts"
      atom_id: "atm.external-task-source-plugin"
      capability: "Plugin interface contract for external task card sources (parse/validate/generate hooks, neutral to format and tracker)"
      coverage_status: "active"
outOfScope:
  - "Reference implementation — TASK-AAO-0084"
  - "Context Map schema fields — TASK-AAO-0085"
  - "Upstream 3KLife task-card-opener — TASK-AAO-0086"
  - "Modifying tasks.ts to consume plugin — TASK-AAO-0084 中做"
nonGoals:
  - "Do not assume any specific frontmatter format"
  - "Do not bundle reference implementation in this card"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---

## Goal
Establish the neutral plugin interface contract for external task card sources, enabling extensible task card parser, validator, and generator hooks without coupling AAF core to any specific frontmatter schema, tracker, or repository style.

## Acceptance
- `packages/plugin-sdk/src/external-task-source.ts` exists and defines the standard extensible interfaces
- `packages/plugin-sdk/src/capability.ts` registers 'external-task-source' within `CapabilityKind` alphabetically
- `packages/plugin-sdk/src/index.ts` exports all new interfaces and types
- `tests/plugin-sdk/external-task-source.test.ts` passes typecheck and implements rigorous mock interface testing
- All hooks (`parse`, `validate`, `generate`) are fully optional
