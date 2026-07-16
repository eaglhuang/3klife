---
task_id: TASK-RFT-0058
title: Split shared command facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0057]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/shared.ts
  - packages/cli/src/commands/shared/**/*.ts
  - tests/cli/shared-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
deliverables:
  - packages/cli/src/commands/shared.ts
  - packages/cli/src/commands/shared/**/*.ts
  - tests/cli/shared-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
validators:
  - node --strip-types tests/cli/shared-final-600.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.shared-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.shared-command-facade
      pattern: Facade
      source: packages/cli/src/commands/shared.ts
      disposition: extract
      inlineReason: null
    - atom: atm.shared-implementation-carrier
      pattern: Shared Utility Map
      source: packages/cli/src/commands/shared.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T03:32:29.489Z"
completed_by_agent: "codex-task-rft-0058"
closedAt: "2026-07-16T03:32:29.489Z"
closedByActor: "codex-task-rft-0058"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T03-32-29-489Z-close-73ea3e622a51"
lastTransitionAt: "2026-07-16T03:32:29.489Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ac0930d13a9702a3a6e04ce39573489ae142f70e"
---

# TASK-RFT-0058 - Split shared command facade below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/shared.ts` to at or below 600 physical lines.
- Move shared command implementation glue into bounded modules under `packages/cli/src/commands/shared/**`.
- Keep every new or touched shared support module at or below 600 physical lines.
- Preserve the existing public exports used by command registry, hooks, scripts, and tests.
- Add a final-600 validator for the facade and `packages/cli/src/commands/shared/**/*.ts`.
- Update CLI owner shard coverage for the extracted shared implementation module.

## Notes

- Current audit found `packages/cli/src/commands/shared.ts` at 1155 physical lines after TASK-RFT-0057.
- This card continues the RFT large-file atom-map/facade split series toward the physical-file limit of 600 lines.
