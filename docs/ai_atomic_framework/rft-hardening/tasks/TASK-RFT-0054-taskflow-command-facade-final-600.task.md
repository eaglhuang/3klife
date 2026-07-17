---
task_id: TASK-RFT-0054
title: Split taskflow command facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0053]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM瘝餌?瘚??eam-Agents????急.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/taskflow/**/*.ts
  - tests/cli/taskflow-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
deliverables:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/taskflow/**/*.ts
  - tests/cli/taskflow-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
validators:
  - node --strip-types tests/cli/taskflow-final-600.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-closure-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.taskflow-command-facade
      pattern: Facade
      source: packages/cli/src/commands/taskflow.ts
      disposition: extract
      inlineReason: null
    - atom: atm.taskflow-command-implementation-carrier
      pattern: Strategy Map
      source: packages/cli/src/commands/taskflow.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T02:49:00.172Z"
completed_by_agent: "codex-task-rft-0054"
closedAt: "2026-07-16T02:49:00.172Z"
closedByActor: "codex-task-rft-0054"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T02-49-00-172Z-close-ada152d8fa37"
lastTransitionAt: "2026-07-16T02:49:00.172Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "dab343cc2765dd3872a1026f64315f22fe0a67ad"
---

# TASK-RFT-0054 - Split taskflow command facade below 600 lines

## Acceptance

- Reduce `packages/cli/src/commands/taskflow.ts` to at or below 600 physical lines.
- Move taskflow command implementation glue into bounded modules under `packages/cli/src/commands/taskflow/**`.
- Keep every new or touched taskflow command support module at or below 600 physical lines.
- Preserve the public exports `runTaskflow`, `buildTaskflowCloseResidueAdvisory`, and `buildTaskflowPlanningIndexAdvisory`.
- Preserve taskflow open, pre-close, close, and auto-evidence behavior.
- Add a final-600 validator for the facade and `packages/cli/src/commands/taskflow/**/*.ts`.
- Update CLI owner shard coverage for the extracted taskflow implementation module.

## Notes

- Current audit found `packages/cli/src/commands/taskflow.ts` at 1635 physical lines after TASK-RFT-0053.
- This card continues the RFT large-file atom-map/facade split series toward the physical-file limit of 600 lines.
