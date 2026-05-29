---
task_id: TASK-AAO-0077
title: "next.ts atomization wave 2C-B: match and sort helpers"
status: planned
priority: P1
milestone: M5
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on: [TASK-AAO-0061, TASK-AAO-0073, TASK-AAO-0074, TASK-AAO-0076]
related_plan: "TASK-AAO-0061 wave 2C deferred scope (final split: 2C-A complete, this is 2C-B)"
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/match-and-sort.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/match-and-sort.ts"
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
    - path_pattern: "packages/cli/src/commands/next/match-and-sort.ts"
      atom_id: "atm.cli-next-match-and-sort"
      capability: "Pure comparators, hashers, matchers, weights for next.ts task scoring and queue ordering"
      coverage_status: "active"
outOfScope:
  - "normalizeOptionalString cross-module dedup — separate housekeeping card"
  - "git-head.json JSONL migration — TASK-AAO-0078"
nonGoals:
  - "Do not change any function signature or runtime behavior"
---

## Goal: Extract 13 pure comparators/matchers/weights from next.ts into next/match-and-sort.ts as final Wave 2C-B of TASK-AAO-0061 deferred scope.
