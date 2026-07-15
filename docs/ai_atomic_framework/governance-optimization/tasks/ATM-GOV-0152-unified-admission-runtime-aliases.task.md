---
task_id: ATM-GOV-0152
title: Alias legacy global locks into unified Broker admission
status: planned
owner: atm-governance
priority: P0
depends_on: [ATM-GOV-0128, ATM-GOV-0129, ATM-GOV-0137, ATM-GOV-0148, ATM-GOV-0150, ATM-GOV-0151]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/global-resource-projection.ts"
  - "packages/core/src/broker/__tests__/global-resource-projection.test.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/taskflow/close-transaction-mutex.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "tests/cli/pre-team-dual-captain-e2e.test.ts"
deliverables:
  - "packages/core/src/broker/global-resource-projection.ts"
  - "packages/core/src/broker/__tests__/global-resource-projection.test.ts"
  - "tests/cli/pre-team-dual-captain-e2e.test.ts"
validators:
  - "node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts"
  - "node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.unified-admission.global-runtime-aliases
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.unified-admission.global-runtime-aliases
      pattern: Policy Object
      source: packages/core/src/broker/global-resource-projection.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - "TASK-RFT-0037."
  - "New independent lock semantics outside the Broker keyspace."
  - "Release mirror artifact sync."
---

# ATM-GOV-0152 - Alias legacy global locks into unified Broker admission

## Context

ATM-GOV-0148 introduced global resource keys, but existing close-window, branch commit queue, and git index lanes can still behave like separate arbiters. This card aliases those runtime surfaces into one Broker projection so admission answers source overlap, index ownership, release stewardship, generated projections, and branch queue position from the same keyspace.

## Acceptance Criteria

- The global projection maps existing git-index lease files, branch commit queue locks, close transaction mutex windows, release mirror outputs, and generated projections to canonical Broker keys.
- Tests prove no duplicate arbiter exists for git-index and branch commit queue surfaces: the same runtime path resolves to exactly one canonical key.
- Dual Captain E2E continues to pass and reports queue owner/position/suggested action when blocked.
- The implementation does not create a new lock directory, new registry document, or second queue semantics.

## Validation

- node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts
- node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts
- npm run typecheck

## Rollback

Revert the delivery commit and any target ledger close bundle for ATM-GOV-0152. Do not hand-edit runtime state.
