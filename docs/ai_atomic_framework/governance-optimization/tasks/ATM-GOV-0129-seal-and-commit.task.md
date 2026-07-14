---
doc_id: doc_atm_gov_0129
task_id: ATM-GOV-0129
title: "Make sealed commit the close transaction truth"
status: planned
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: [ATM-GOV-0127, ATM-GOV-0128, ATM-GOV-0133]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/tasks/deliver-close-orchestrator.ts"
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-seal-and-commit.test.ts"
deliverables:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/deliver-close-orchestrator.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-seal-and-commit.test.ts"
validators:
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-seal-and-commit.test.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Keep the old close path canonical until shadow payload parity passes."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-command-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.seal-and-commit-transaction"
      pattern: "Transaction Script"
      source: "packages/cli/src/commands/taskflow.ts"
      disposition: extract
    - atom: "atm.batch-head-seal-adapter"
      pattern: "Adapter"
      source: "packages/cli/src/commands/batch.ts"
      disposition: extract
outOfScope:
  - "Team contribution manifests or obligation minimization."
---

# ATM-GOV-0129 - Make sealed commit the close transaction truth

## Acceptance

- Closed ledger, evidence, events, and payload assemble before commit.
- Commit trailers bind payload/evidence digests; publication is reconstructable.
- One TTL closer mutex owns commit and queue admission.
- Batch artifacts bind the captured old head before advance.
