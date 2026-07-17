---
task_id: TASK-RFT-0057
title: Split batch command facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0056]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/batch.ts
  - packages/cli/src/commands/batch/**/*.ts
  - tests/cli/batch-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
deliverables:
  - packages/cli/src/commands/batch.ts
  - packages/cli/src/commands/batch/**/*.ts
  - tests/cli/batch-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
validators:
  - node --strip-types tests/cli/batch-final-600.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.batch-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.batch-command-facade
      pattern: Facade
      source: packages/cli/src/commands/batch.ts
      disposition: extract
      inlineReason: null
    - atom: atm.batch-implementation-carrier
      pattern: Strategy Map
      source: packages/cli/src/commands/batch.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T03:19:16.921Z"
completed_by_agent: "codex-task-rft-0057"
closedAt: "2026-07-16T03:19:16.921Z"
closedByActor: "codex-task-rft-0057"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T03-19-16-921Z-close-8725d9e4ee22"
lastTransitionAt: "2026-07-16T03:19:16.921Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "715cad04aa716563e1800c14970338dee856931c"
---

# TASK-RFT-0057 - Split batch command facade below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/batch.ts` to at or below 600 physical lines.
- Move batch command implementation glue into bounded modules under `packages/cli/src/commands/batch/**`.
- Keep every new or touched batch support module at or below 600 physical lines.
- Preserve the existing public exports used by command registry, hooks, scripts, and tests.
- Add a final-600 validator for the facade and `packages/cli/src/commands/batch/**/*.ts`.
- Update CLI owner shard coverage for the extracted batch implementation module.

## Notes

- Current audit found `packages/cli/src/commands/batch.ts` at 1496 physical lines after TASK-RFT-0056.
- This card continues the RFT large-file atom-map/facade split series toward the physical-file limit of 600 lines.
