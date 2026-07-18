---
task_id: TASK-RFT-0098
title: Touched-file physical-line admission gate
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-RFT-0097
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - package.json
  - scripts/validate-physical-line-budget.ts
  - tests/cli/physical-line-budget-gate.test.ts
  - tests/cli/touched-physical-line-admission.test.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
deliverables:
  - scripts/validate-physical-line-budget.ts
  - tests/cli/touched-physical-line-admission.test.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
validators:
  - node --strip-types scripts/validate-physical-line-budget.ts --json
  - node --strip-types tests/cli/physical-line-budget-gate.test.ts
  - node --strip-types tests/cli/touched-physical-line-admission.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the touched-file line admission wiring and focused regression if legitimate <=600-line touched files are blocked.
atomizationImpact:
  ownerAtomOrMap: atm.touched-physical-line-admission
  mapUpdates: []
  extractionCandidates:
    - atom: atm.touched-physical-line-admission
      pattern: Policy Object
      source: scripts/validate-physical-line-budget.ts
      disposition: extract
      inlineReason: null
    - atom: atm.claim-line-budget-gate
      pattern: Gate Adapter
      source: packages/cli/src/commands/next/claim-orchestration.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - Lowering the global 600-line cap.
  - Rewriting unrelated claim, close, or commit lifecycle behavior.
  - Opening continuation cards automatically.
completed_at: "2026-07-18T02:16:04.121Z"
completed_by_agent: "codex-main"
closedAt: "2026-07-18T02:16:04.121Z"
closedByActor: "codex-main"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T02-16-04-121Z-close-deac479414c2"
lastTransitionAt: "2026-07-18T02:16:04.121Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "27a3b978dba10346d88fd9a394afc242c27ac78a"
---

# TASK-RFT-0098 - Touched-File Physical-Line Admission Gate

## Objective

Extend the global physical-line-budget invariant from TASK-RFT-0097 into the
actual mutation lifecycle. Any file touched by claim, pre-close, or governed
commit must be checked against the 600-line physical cap before ATM accepts the
step.

## Acceptance

- Claim admission reports or blocks touched files above the physical line cap.
- Pre-close and governed commit paths run the same touched-file check before
  accepting source delivery.
- The check ignores generated, release, fixture, dependency, and ATM-managed
  ledger artifacts consistently with `scripts/validate-physical-line-budget.ts`.
- Diagnostics name each offending file, line count, hard limit, actor/task
  context when available, and the command needed to reproduce the report.
- Focused regression covers at least one passing touched file and one blocked
  oversized touched file without requiring a real oversized source file in the
  repository.

## Notes

- Reuse the global scanner/policy from TASK-RFT-0097; do not create a second
  line-budget implementation.
- Keep touched-file admission separate from semantic atomization scoring; that
  belongs to TASK-RFT-0099.
