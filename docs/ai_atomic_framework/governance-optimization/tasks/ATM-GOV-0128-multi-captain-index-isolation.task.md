---
doc_id: doc_atm_gov_0128
task_id: ATM-GOV-0128
title: "Isolate the multi-Captain close index lane"
status: planned
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-index-ownership.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "tests/cli/git-index-close-isolation.test.ts"
deliverables:
  - "packages/cli/src/commands/git-index-ownership.ts"
  - "tests/cli/git-index-close-isolation.test.ts"
validators:
  - "node --strip-types tests/cli/git-index-close-isolation.test.ts"
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Serialize close under the existing branch queue and fail closed."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.foreign-index-park-restore"
      pattern: "Transaction Script"
      source: "packages/cli/src/commands/git-governance.ts"
      disposition: extract
    - atom: "atm.close-ownership-proof"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/hook/pre-commit.ts"
      disposition: extract
outOfScope:
  - "In-flight file ownership transfer or shadow Team implementation."
---

# ATM-GOV-0128 - Converge multi-Captain serialization and index isolation

## Acceptance

- Inventory branch commit queue, close-window lock, index ownership, Broker queue, and temporary-index commit assembly before adding any new serialization primitive.
- The new primitive must absorb or retire an existing primitive, or document why it cannot.
- Dry-run and real hook classify foreign active state identically.
- Complete foreign bundles park/restore under an index lease.
- Two-Captain fixtures require no manual unstage, stash, or restore.
- Approved partial-staged blobs remain byte-identical.
