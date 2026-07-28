---
doc_id: doc_atm_gov_0146
task_id: ATM-GOV-0146
title: "Align close transaction mutex TTL with governed commit window"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation-Gate
depends_on: [ATM-GOV-0129, ATM-GOV-0130, ATM-GOV-0145]
related_plan: docs/ai_atomic_framework/governance-optimization/
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow/close-transaction-mutex.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/close-transaction-mutex.spec.ts"
deliverables:
  - "packages/cli/src/commands/taskflow/close-transaction-mutex.ts"
  - "packages/cli/src/commands/taskflow/__tests__/close-transaction-mutex.spec.ts"
validators:
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/close-transaction-mutex.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert TTL/heartbeat changes if close transaction admission regresses."
atomizationImpact:
  ownerAtomOrMap: "atm.close-transaction-mutex"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "TASK-RFT-* cards and RFT source surfaces."
  - "Team Agents production promotion or paired-run dogfood measurement."
  - "Changing git commit timeout semantics outside close transaction mutex protection."
completed_at: "2026-07-15T14:17:58.832Z"
completed_by_agent: "codex-gpt-5-5-captain"
closedAt: "2026-07-15T14:17:58.832Z"
closedByActor: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T14-19-32-927Z-lock-cleanup-528816077488"
lastTransitionAt: "2026-07-15T14:17:58.832Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ff23d9086d774bba9b560003302cf58b3d434409"
---

# ATM-GOV-0146 - Align close transaction mutex TTL with governed commit window

## Why

The 2026-07-15 recheck found a P0 governance race: the close transaction mutex defaults to 120 seconds, while governed commit/pre-commit work has been observed near 406 seconds. If the mutex expires before the protected commit window finishes, a second closer can acquire the same task lock and enter the close transaction.

## Acceptance

- The default close transaction mutex TTL must be at least as long as the governed git wrapper timeout used by close commits, with a small safety margin.
- The mutex lease must expose enough diagnostics to explain the configured TTL and remaining owner.
- A focused test must prove the default TTL is not shorter than the protected commit window.
- A focused test must prove an expired lease can still be reclaimed and a live lease still blocks a second closer.
- Existing close bundle behavior must continue to release the mutex after a successful close commit.
- No RFT task, RFT source file, or `TASK-RFT-0037` artifact may be modified.

## Required Evidence

- `node --strip-types packages/cli/src/commands/taskflow/__tests__/close-transaction-mutex.spec.ts`
- `node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts`
- `npm run typecheck`
- `node atm.mjs broker status --json` showing this card did not conflict with active RFT work.
