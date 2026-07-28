---
task_id: TASK-RFT-0053
title: Split run-validators orchestrator below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0052]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM瘝餌?瘚??eam-Agents????急.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-validators.ts
  - scripts/run-validators/**/*.ts
  - tests/cli/run-validators-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
deliverables:
  - scripts/run-validators.ts
  - scripts/run-validators/**/*.ts
  - tests/cli/run-validators-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types tests/cli/run-validators-final-600.test.ts
  - node --strip-types scripts/run-validators.ts --profile quick --json
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.validator-envelope-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.validator-runner-facade
      pattern: Facade
      source: scripts/run-validators.ts
      disposition: extract
      inlineReason: null
    - atom: atm.validator-runner-cli-and-selection-map
      pattern: Strategy Map
      source: scripts/run-validators.ts
      disposition: extract
      inlineReason: null
    - atom: atm.validator-runner-receipt-and-summary-map
      pattern: Result Contract Object
      source: scripts/run-validators.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T02:33:55.715Z"
completed_by_agent: "codex-task-rft-0053"
closedAt: "2026-07-16T02:33:55.715Z"
closedByActor: "codex-task-rft-0053"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T02-33-55-635Z-close-f9722f2cb0fa"
lastTransitionAt: "2026-07-16T02:33:55.715Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b19d101d7"
---

# TASK-RFT-0053 - Split run-validators orchestrator below 600 lines

## Acceptance

- Reduce `scripts/run-validators.ts` to at or below 600 physical lines.
- Extract CLI parsing, selection/profile resolution, validator execution, receipt persistence, summary/performance reporting, and git/cache helpers into bounded modules under `scripts/run-validators/**`.
- Keep every new or touched run-validators support module at or below 600 physical lines.
- Preserve quick profile validator behavior, JSON output behavior, status/resume behavior, cache behavior, and receipt reuse semantics.
- Add a final-600 validator that checks `scripts/run-validators.ts` and `scripts/run-validators/**/*.ts`.
- Update the scripts owner shard so both the facade and extracted modules remain covered by `atm.validator-envelope-map`.
- Do not touch `release/**` artifacts or unrelated runner-sync work.

## Notes

- Current audit found `scripts/run-validators.ts` at 1699 physical lines after TASK-RFT-0052 was done.
- This card continues the RFT large-file atom-map/facade split series after the >2000 source-file threshold was cleared, moving the same governance line toward the physical-file limit of 600 lines.
