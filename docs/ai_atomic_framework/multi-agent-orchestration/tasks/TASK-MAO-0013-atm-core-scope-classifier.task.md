---
task_id: TASK-MAO-0013
title: "runner sync steward classifier and stale gate"
status: planned
owner: atm-core
priority: P0
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0012"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "atm.mjs"
  - "packages/core/src/broker/atm-core-scope.ts"
  - "packages/core/src/broker/__tests__/atm-core-scope.test.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "scripts/validate-runner-entrypoints.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/atm-core-scope.ts"
  - "packages/core/src/broker/__tests__/atm-core-scope.test.ts"
  - "packages/cli/src/commands/framework-development.ts"
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

# TASK-MAO-0013 - runner sync steward classifier and stale gate

## Goal

Classify ATM core routes deterministically, close the current stale-runner detection gap, and provide the enforcement surface for `Runner Sync Steward v1`.

## Implementation Contract

- Add a classifier that consumes the runner build scope manifest and recognizes `atm-core` write intent.
- Include current runner-affecting roots: `packages/core/src`, `packages/cli/src`, `packages/plugin-governance-local/src`, relevant adapters, schemas, root launchers, package build config, release outputs, and declared `scripts/AtmCore` paths.
- Update stale-runner diagnostics so source changes outside `packages/cli/src` and `scripts` are not missed.
- Return structured diagnostics for undeclared core writes and scope drift without mutating route state.
- Make it explicit that ordinary source-writing tasks may mark `runner-sync-needed` but must not publish `release/**` themselves.
- Keep this v1 independent from the full Broker intent registry. The classifier should expose stable pure functions now; later Broker cards may adapt route intents into these functions without making `TASK-MAO-0013` depend on `TASK-MAO-0005`.

## Acceptance Criteria

- Tests prove classifier matches all current runner-affecting roots and does not match non-core docs-only changes.
- `ATM_RUNNER_SYNC_REQUIRED` coverage includes `packages/core/src` and `packages/plugin-governance-local/src`.
- Undeclared core writes can be rejected by later Broker steps with stable error codes.
- Existing `next` runner mode diagnostics remain intact.
- The classifier is sufficient to support a single-writer steward lane before any ref-stream implementation exists.
