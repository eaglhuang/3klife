---
task_id: TASK-AAO-0074
title: "next.ts atomization wave 2B: view projections"
status: planned
priority: P1
milestone: M5
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on: [TASK-AAO-0061, TASK-AAO-0073]
related_plan: "TASK-AAO-0061 wave 2 deferred scope"
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/view-projections.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/view-projections.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence: { required: command-backed }
rollback: { strategy: revert-commit }
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/next/view-projections.ts"
      atom_id: "atm.cli-next-view-projections"
      capability: "Pure view projection, hash, quoting, and dedup helpers for next.ts task candidate rendering"
      coverage_status: "active"
outOfScope:
  - "Wave 2C (comparison/validation predicates) — separate card"
  - "normalizeOptionalString cross-module dedup — separate housekeeping card"
nonGoals:
  - "Do not change any function signature or runtime behavior"
---

# TASK-AAO-0074: next.ts atomization wave 2B: view projections

## Goal: Extract 6 pure formatting/projection helpers from next.ts into next/view-projections.ts as Wave 2B of TASK-AAO-0061 deferred scope.

## Acceptance: 6 functions extracted; new atom registered with independent atom_id; bitwise compat verified.