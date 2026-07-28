---
task_id: TASK-RFT-0055
title: Split validate-governance-commands facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0054]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-governance-commands.ts
  - scripts/validate-governance-commands/**/*.ts
  - tests/cli/validate-governance-commands-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts*.json
deliverables:
  - scripts/validate-governance-commands.ts
  - scripts/validate-governance-commands/**/*.ts
  - tests/cli/validate-governance-commands-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts*.json
validators:
  - node --strip-types tests/cli/validate-governance-commands-final-600.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.validate-governance-commands-facade
      pattern: Facade
      source: scripts/validate-governance-commands.ts
      disposition: extract
      inlineReason: null
    - atom: atm.validate-governance-commands-implementation-carrier
      pattern: Strategy Map
      source: scripts/validate-governance-commands.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T03:03:00.852Z"
completed_by_agent: "codex-task-rft-0055"
closedAt: "2026-07-16T03:03:00.852Z"
closedByActor: "codex-task-rft-0055"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T03-03-00-750Z-close-0b1d2636dae8"
lastTransitionAt: "2026-07-16T03:03:00.852Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c1f7f1ae0bdcf5e5f95555d82f40f2bf24e9d21e"
---

# TASK-RFT-0055 - Split validate-governance-commands facade below 600 lines

## Acceptance

- Reduce `scripts/validate-governance-commands.ts` to at or below 600 physical lines.
- Move validator implementation glue into bounded modules under `scripts/validate-governance-commands/**`.
- Keep every new or touched validate-governance-commands support module at or below 600 physical lines.
- Preserve the existing `node --strip-types scripts/validate-governance-commands.ts --mode validate` behavior.
- Add a final-600 validator for the facade and `scripts/validate-governance-commands/**/*.ts`.
- Update scripts owner shard coverage for the extracted validate-governance-commands implementation module.

## Notes

- Current audit found `scripts/validate-governance-commands.ts` at 1489 physical lines after TASK-RFT-0054.
- This card continues the RFT large-file atom-map/facade split series toward the physical-file limit of 600 lines.
