---
task_id: TASK-MEM-0007
title: "tasks reconcile accepts --historical-delivery-repo for cross-repo deliveries"
status: planned
owner: claude-fable-5
priority: P1
milestone: MEM-M2
depends_on: []
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
deliverables:
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the flag; local-repo reconcile behavior is byte-identical without it."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger"
  extractionCandidates:
    - atom: "atm.tasks-option-parsers"
      pattern: "inline"
      source: "packages/cli/src/commands/tasks/task-option-parsers.ts"
      disposition: "inline"
      inlineReason: "Adding one already-standardized flag to the existing parseReconcileOptions atom (TASK-AAO-0064 slice family); tasks close already owns the identical flag in the same module, so no new boundary is warranted."
---

# TASK-MEM-0007 reconcile cross-repo historical delivery

Discovered executing TASK-MEM-0003/0004: mirrored done cards in a second
ledger can only be reconciled with `tasks reconcile --delivery-commit <sha>`,
but the orchestrator verifies the sha with `rev-parse` against the LOCAL repo
only. Cross-repo deliveries (planning-repo card closed in another target
repo, e.g. 3KLife TASK-MEM-0001 delivery `bea3e885`) can never be attested,
while `tasks close` already supports exactly this via
`--historical-delivery-repo`. Sibling of BUG-ATM-0061 (dep gate is
local-ledger only).

## Acceptance

- `parseReconcileOptions` accepts `--historical-delivery-repo <path>`
  (same aliases as close: `--delivery-repo`, `--planning-delivery-repo`),
  resolved absolute, default null.
- `rev-parse` verification and `evaluateTaskDeliverableGate`'s
  `historicalDeliveryRepo` both use the provided repo root when set; without
  the flag, behavior is unchanged (local repo).
- The reconcile attestation records which repo root verified the commit.
- `npm run validate:cli` green; typecheck green.
