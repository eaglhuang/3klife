---
task_id: ATM-GOV-0150
title: Implement runner-sync coalescing steward queue
status: done
owner: atm-governance
priority: P0
depends_on: [ATM-GOV-0127, ATM-GOV-0142, ATM-GOV-0148, ATM-GOV-0149]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/runner-sync-steward-queue.ts"
  - "packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
deliverables:
  - "packages/core/src/broker/runner-sync-steward-queue.ts"
  - "packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
validators:
  - "node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts"
  - "node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync.coalescing-steward-queue
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.runner-sync.coalescing-steward-queue
      pattern: Policy Object
      source: packages/core/src/broker/runner-sync-steward-queue.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - "TASK-RFT-0037 and all pre-commit hook extraction surfaces."
  - "Generated projection steward implementation; owned by ATM-GOV-0151."
  - "Changing release/atm-onefile/** or release/atm-root-drop/** artifacts as the delivery."
completed_at: "2026-07-15T15:48:17.654Z"
completed_by_agent: "codex-gpt-5-5-captain"
closedAt: "2026-07-15T15:48:17.654Z"
closedByActor: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T15-48-17-575Z-close-3ede04651e15"
lastTransitionAt: "2026-07-15T15:48:17.654Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "216315cf1976d866667c4075bc90653135d2e00f"
---

# ATM-GOV-0150 - Implement runner-sync coalescing steward queue

## Context

ATM-BUG-2026-07-15-202 and ATM-GOV-0149 left runner-sync/build as metadata-only admission. This card adds the real steward queue model so multiple captains submit runner-sync requests to one coalescing lane keyed by sealed source SHA instead of pretending per-file release leases can serialize a whole-repo build.

## Acceptance Criteria

- A runner-sync request records requester task, actor, sealed source SHA, requested surfaces, createdAt, heartbeatAt, expiresAt, queue position, and suggested next action.
- Requests with the same sealed source SHA coalesce under one steward work item and expose all waiting tasks instead of creating duplicate build lanes.
- Requests for different sealed source SHAs remain ordered and report queue-head versus waiting position.
- Expired owners are released or marked stale by deterministic cleanup; stale-owner diagnostics include owner, position, and the safe retry command.
- The CLI exposes a read/write path through `broker runner-sync ...` or an equivalent broker subcommand; tests must exercise this through source helpers and at least one CLI-facing JSON shape.
- No release mirror artifact is committed as the deliverable for this card.

## Validation

- node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
- node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts
- npm run typecheck

## Rollback

Revert the delivery commit and any target ledger close bundle for ATM-GOV-0150. Do not hand-edit runtime state.
