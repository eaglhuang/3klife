---
task_id: ATM-GOV-0171
title: Governed runner-sync receipt and clean-close pathway
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0169
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  Opened after ATM-GOV-0169 exposed ATM-BUG-2026-07-18-005: runner-sync can
  clear broker state while leaving post-close receipt or release artifact
  residue outside a first-class taskflow path.
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - packages/cli/src/commands/broker.ts
  - packages/cli/src/commands/taskflow-close.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/git-governance.ts
  - tests/cli/runner-sync-clean-close-pathway.test.ts
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - docs/governance/command-surface.md
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-18-005.json
  - docs/governance/atm-bug-and-optimization-backlog.md
  - .atm/history/evidence/ATM-GOV-0171.*
  - .atm/history/task-events/ATM-GOV-0171/**
  - .atm/history/tasks/ATM-GOV-0171.json
deliverables:
  - scripts/run-sealed-runner-build.ts
  - packages/cli/src/commands/broker.ts
  - packages/cli/src/commands/taskflow-close.ts
  - tests/cli/runner-sync-clean-close-pathway.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-clean-close-pathway.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync.clean-close
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.runner-sync.receipt-publication
      pattern: Receipt Writer
      source: scripts/run-sealed-runner-build.ts
      disposition: extract
      inlineReason: null
    - atom: atm.taskflow.runner-sync-closeback
      pattern: Close Integration
      source: packages/cli/src/commands/taskflow-close.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T14:04:44.664Z"
completed_by_agent: "codex-gpt-5-captain"
closedAt: "2026-07-18T14:04:44.664Z"
closedByActor: "codex-gpt-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T14-04-44-664Z-close-e0e9491f9bd9"
lastTransitionAt: "2026-07-18T14:04:44.664Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b9933040415fabc49eb28bf37d7332aa6c52dcdc"
---

# ATM-GOV-0171 - Governed Runner-Sync Receipt and Clean-Close Pathway

## Context

ATM-GOV-0169 proved that runner-sync can be made safe enough to clear the
broker queue, but the close path still leaves a gap: `npm run build` updates
`release/**`, broker release accepts a receipt reference, and taskflow close can
finish before a governed receipt path exists. A manual receipt then fails
pre-commit with `ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT`.

## Required Behavior

- Sealed runner build must emit a deterministic `atm.runnerSyncReceipt.v1`
  receipt for the active runner-sync steward work when the build is admitted by
  broker queue-head ownership.
- Broker `runner-sync release` must validate that receipt against task id,
  actor id, stewardWorkId, sealedSourceSha, and requested surfaces before
  clearing the queue.
- Taskflow close or the documented post-close runner-sync lane must include the
  receipt in task evidence/event context so pre-commit accepts the bundle.
- The active task must not leave its own `release/**`, runner-sync queue, or
  runner-sync receipt residue after close and push.
- Foreign task receipts, such as an untracked `ATM-GOV-0168.runner-sync-receipt`
  created by another actor, must be diagnosed as foreign residue and excluded
  from the current task bundle.

## Acceptance

Use isolated fixtures to prove the happy path and failure cases: build emits a
receipt for the current queue head, release rejects mismatched receipts, the
receipt can be committed with task evidence or event context, and a taskflow
close report distinguishes current-task residue from foreign runner-sync
residue. After this card closes, `git status --short` for the target repo must
show no current-task dirty files.
