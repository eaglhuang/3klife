---
task_id: TASK-RFT-0056
title: Split integration-hooks command facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0055]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/integration-hooks.ts
  - packages/cli/src/commands/integration-hooks/**/*.ts
  - tests/cli/integration-hooks-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
deliverables:
  - packages/cli/src/commands/integration-hooks.ts
  - packages/cli/src/commands/integration-hooks/**/*.ts
  - tests/cli/integration-hooks-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
validators:
  - node --strip-types tests/cli/integration-hooks-final-600.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-integration-hooks-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.integration-hooks-command-facade
      pattern: Facade
      source: packages/cli/src/commands/integration-hooks.ts
      disposition: extract
      inlineReason: null
    - atom: atm.integration-hooks-implementation-carrier
      pattern: Strategy Map
      source: packages/cli/src/commands/integration-hooks.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T03:11:17.722Z"
completed_by_agent: "codex-task-rft-0056"
closedAt: "2026-07-16T03:11:17.722Z"
closedByActor: "codex-task-rft-0056"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T03-11-17-639Z-close-7c41f91ddf81"
lastTransitionAt: "2026-07-16T03:11:17.722Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "09aabaa656b677628085928299cbe9fd9205a884"
---

# TASK-RFT-0056 - Split integration-hooks command facade below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/integration-hooks.ts` to at or below 600 physical lines.
- Move command implementation glue into bounded modules under `packages/cli/src/commands/integration-hooks/**`.
- Keep every new or touched integration-hooks support module at or below 600 physical lines.
- Preserve the existing integration-hooks command import/public command behavior.
- Add a final-600 validator for the facade and `packages/cli/src/commands/integration-hooks/**/*.ts`.
- Update CLI owner shard coverage for the extracted integration-hooks implementation module.

## Notes

- Current audit found `packages/cli/src/commands/integration-hooks.ts` at 1540 physical lines after TASK-RFT-0055.
- This card continues the RFT large-file atom-map/facade split series toward the physical-file limit of 600 lines.
