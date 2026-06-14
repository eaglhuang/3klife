---
task_id: TASK-MAO-0013
title: "ATM core scope classifier"
status: planned
owner: atm-core
priority: P0
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0005"
  - "TASK-MAO-0012"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "atm.mjs"
  - "packages/core/src/broker/intent-registry.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/atm-core-scope.ts"
  - "packages/core/src/broker/__tests__/atm-core-scope.test.ts"
  - "scripts/validate-runner-entrypoints.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/atm-core-scope.ts"
  - "packages/core/src/broker/__tests__/atm-core-scope.test.ts"
  - "scripts/validate-runner-entrypoints.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/atm-core-scope.test.ts"
  - "npm run validate:runner-entrypoints"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert classifier, tests, stale-runner detection changes, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-core-scope-classifier-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Runner ref publication"
  - "Patch submission pipeline"
  - "Changing non-core route behavior"
---

# TASK-MAO-0013 - ATM core scope classifier

## Goal

Classify ATM core routes deterministically and close the current stale-runner detection gap.

## Implementation Contract

- Add a classifier that consumes the runner build scope manifest and recognizes `atm-core` write intent.
- Include current runner-affecting roots: `packages/core/src`, `packages/cli/src`, `packages/plugin-governance-local/src`, relevant adapters, schemas, root launchers, package build config, release outputs, and declared `scripts/AtmCore` paths.
- Update stale-runner diagnostics so source changes outside `packages/cli/src` and `scripts` are not missed.
- Return structured diagnostics for undeclared core writes and scope drift without mutating route state.

## Acceptance Criteria

- Tests prove classifier matches all current runner-affecting roots and does not match non-core docs-only changes.
- `ATM_RUNNER_SYNC_REQUIRED` coverage includes `packages/core/src` and `packages/plugin-governance-local/src`.
- Undeclared core writes can be rejected by later Broker steps with stable error codes.
- Existing `next` runner mode diagnostics remain intact.

