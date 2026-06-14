---
task_id: TASK-MAO-0017
title: "runner version stream state machine"
status: planned
owner: atm-core
priority: P0
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0014"
  - "TASK-MAO-0016"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/runner-version-state.ts"
  - "packages/core/src/broker/runner-ref-store.ts"
  - "packages/core/src/broker/__tests__/runner-version-state.test.ts"
  - "packages/cli/src/commands/route.ts"
  - "tests/cli/runner-version-lease.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/runner-version-state.ts"
  - "packages/core/src/broker/__tests__/runner-version-state.test.ts"
  - "tests/cli/runner-version-lease.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/runner-version-state.test.ts"
  - "node --strip-types tests/cli/runner-version-lease.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert runner stream state machine, lease tests, CLI integration, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-version-state-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Closure packet runner binding"
  - "External contributor pipeline"
---

# TASK-MAO-0017 - runner version stream state machine

## Goal

Implement the `idle`, `core-editing-active`, and `core-editing-quiescing` runner stream transitions and lease distribution rules.

## Implementation Contract

- Track active ATM core routes and patch queue emptiness.
- Lease `built/v<N>` to non-core routes and `in-dev/HEAD` to core routes once it exists.
- Treat first core route bootstrap from `built/v<N>` as a special case until the first in-dev publish succeeds.
- Reject core route close when its leased in-dev SHA is older than current `in-dev/HEAD`.
- Clear only the moving `in-dev/HEAD` control ref after successful built promotion; preserve immutable version refs for audit.

## Acceptance Criteria

- Tests cover idle, first core route, multiple core routes, newer in-dev close rejection, quiescing, built promotion, and in-dev HEAD clearing.
- Non-core routes do not get forced to upgrade mid-session.
- Lease diagnostics name the required refresh command.
- No distributed consensus or external service is introduced.

