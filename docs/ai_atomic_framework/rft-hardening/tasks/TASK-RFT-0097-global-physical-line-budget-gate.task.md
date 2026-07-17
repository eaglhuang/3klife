---
task_id: TASK-RFT-0097
title: Establish global physical-line-budget gate
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-RFT-0096
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0097-global-physical-line-budget-gate.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-physical-line-budget.ts
  - tests/cli/physical-line-budget-gate.test.ts
  - tests/cli/rft-atomization-rollout.test.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/core/src/broker/steward.ts
  - scripts/src/atomize-score.js
  - packages/core/src/manager/atom-generator.ts
  - scripts/generate-unfinished-plan-summary.ts
  - scripts/captain-dispatch-mailbox/render.ts
  - package.json
deliverables:
  - scripts/validate-physical-line-budget.ts
  - tests/cli/physical-line-budget-gate.test.ts
  - tests/cli/rft-atomization-rollout.test.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/core/src/broker/steward.ts
  - scripts/src/atomize-score.js
  - packages/core/src/manager/atom-generator.ts
  - scripts/generate-unfinished-plan-summary.ts
  - scripts/captain-dispatch-mailbox/render.ts
  - package.json
validators:
  - node --strip-types scripts/validate-physical-line-budget.ts --json
  - node --strip-types tests/cli/physical-line-budget-gate.test.ts
  - node --strip-types tests/cli/rft-atomization-rollout.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.global-physical-line-budget
  mapUpdates: []
  extractionCandidates:
    - atom: atm.global-physical-line-budget
      pattern: Global Gate
      source: scripts/validate-physical-line-budget.ts
      disposition: extract
      inlineReason: null
    - atom: atm.rft-residual-line-budget-closure
      pattern: Facade Cap Repair
      source: packages/cli/src/commands/next/claim-orchestration.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-17T05:30:50.587Z"
completed_by_agent: "codex-task-rft-0097"
closedAt: "2026-07-17T05:30:50.587Z"
closedByActor: "codex-task-rft-0097"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-17T05-30-50-587Z-close-42bcf71a93c3"
lastTransitionAt: "2026-07-17T05:30:50.587Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "20106deebb51b2edda3cbe69b9f818c8113bfcbc"
---

# TASK-RFT-0097 - Establish Global Physical-Line-Budget Gate

## Objective

Replace the RFT rollout inventory expectation with a repository-wide physical line-budget gate that scans canonical framework source roots and fails closed when any scanned `.ts`, `.js`, `.mjs`, or `.cjs` file exceeds 600 physical lines.

## Acceptance

- The new gate scans `packages/**`, `scripts/**`, and canonical `tests/**` sources while excluding generated, release, dist, fixture, and dependency paths.
- The hard limit is 600 physical lines and the report also exposes a 500-line soft-warning inventory for future splits.
- Current oversized residuals are reduced to 600 lines or fewer so the gate passes with zero hard violations.
- The old rollout test no longer requires oversized inventory to exist.
- Validation evidence includes the hard-violation count, soft-warning count, scanned file count, and top scanned file by line count.

## Notes

- This card establishes the invariant only. Touched-file admission wiring, semantic atomization metrics, auto continuation-card generation, and validator blocker owner/session projection are follow-up cards.
- Keep residual shrinkage behavior-preserving; do not redesign the affected command, broker, generator, mailbox, or summary surfaces.
