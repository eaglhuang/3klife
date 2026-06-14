---
task_id: TASK-MAO-0019
title: "cross-repo dual binding closure"
status: planned
owner: atm-core
priority: P1
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0018"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/tasks/closeout-provenance.ts"
  - "tests/cli/cross-repo-dual-binding-close.test.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "tests/cli/cross-repo-dual-binding-close.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types tests/cli/cross-repo-dual-binding-close.test.ts"
  - "npm run validate:task-ledger-governance"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert dual-binding close orchestration changes, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-cross-repo-binding-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Opening new adopter planning queues in the framework repo"
  - "Humanless resolution of target/planning divergence"
---

# TASK-MAO-0019 - cross-repo dual binding closure

## Goal

Formalize closure ordering and evidence for tasks that touch both ATM core and an adopter or planning repository.

## Implementation Contract

- Require ATM core Broker submission and runner binding before adopter closeback uses the new runner.
- Add or validate an `adopterRepoBinding` alongside `atmCoreRunnerBinding`.
- Keep framework ledger authority target-local and planning mirror updates in the planning repo.
- Fail closed when target and planning bindings disagree or one side is missing.
- Reuse `taskflow close` orchestration instead of adding a second close path.

## Acceptance Criteria

- Tests cover core-only, adopter-only, and mixed target/planning task closure.
- Mixed task closure records both bindings and their ordering.
- Missing runner binding blocks mixed closure when ATM core scope was touched.
- Existing planning profile fallback behavior still passes.

