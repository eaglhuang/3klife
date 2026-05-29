---
task_id: TASK-AAO-0076
title: "next.ts atomization wave 2C-A: task lifecycle route predicates"
status: planned
priority: P1
milestone: M5
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on: [TASK-AAO-0061, TASK-AAO-0073, TASK-AAO-0074]
related_plan: "TASK-AAO-0061 wave 2C deferred scope (split into 2C-A and 2C-B)"
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/next/route-predicates.ts"
      atom_id: "atm.cli-next-route-predicates"
      capability: "Pure task lifecycle predicates: status routability, dependency satisfaction, claimability, prompt-scope and task mention checks for next.ts routing"
      coverage_status: "active"
outOfScope:
  - "Wave 2C-B (scoring/sorting/pattern matching) - separate card TASK-AAO-0077"
  - "normalizeOptionalString cross-module dedup - separate housekeeping card"
nonGoals:
  - "Do not change any function signature or runtime behavior"
---

# TASK-AAO-0076: next.ts atomization wave 2C-A route predicates

## Goal
Extract 12 pure task lifecycle predicates from next.ts into next/route-predicates.ts as Wave 2C-A of TASK-AAO-0061 deferred scope.