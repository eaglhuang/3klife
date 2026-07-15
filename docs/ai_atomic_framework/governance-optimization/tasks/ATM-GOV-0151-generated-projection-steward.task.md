---
task_id: ATM-GOV-0151
title: Move generated projection rebuilds to steward lane
status: planned
owner: atm-governance
priority: P0
depends_on: [ATM-GOV-0134, ATM-GOV-0148, ATM-GOV-0149]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/generated-projection-steward.ts"
  - "packages/core/src/broker/__tests__/generated-projection-steward.test.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.items/**"
deliverables:
  - "packages/core/src/broker/generated-projection-steward.ts"
  - "packages/core/src/broker/__tests__/generated-projection-steward.test.ts"
  - "packages/cli/src/commands/broker.ts"
validators:
  - "node --strip-types packages/core/src/broker/__tests__/generated-projection-steward.test.ts"
  - "node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.generated-projection.steward-lane
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.generated-projection.steward-lane
      pattern: Policy Object
      source: packages/core/src/broker/generated-projection-steward.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - "TASK-RFT-0037."
  - "Runner-sync steward queue implementation; owned by ATM-GOV-0150."
  - "Rebuilding or committing docs/governance/atm-bug-and-optimization-backlog.md as this card delivery."
---

# ATM-GOV-0151 - Move generated projection rebuilds to steward lane

## Context

ATM-GOV-0134 made backlog item JSON append-only but the Markdown projection remains a shared hot path. This card moves generated projection rebuild ownership behind a steward or commit-time owner lane so journaling claims can write item shards without touching the projection.

## Acceptance Criteria

- Backlog item shard writes can be represented as private append-only work without requiring the Markdown projection key.
- Projection rebuild requests are enqueued under the canonical generated projection key and report owner, queue position, stale-owner release, and suggested retry command.
- A waiting projection rebuild must not block unrelated backlog item shard writes.
- Tests prove the Markdown projection is treated as generated output and cannot be required in a normal backlog item close bundle.
- The steward model records enough source item identity to rebuild deterministically later.

## Validation

- node --strip-types packages/core/src/broker/__tests__/generated-projection-steward.test.ts
- node --strip-types packages/core/src/broker/__tests__/global-resource-projection.test.ts
- npm run typecheck

## Rollback

Revert the delivery commit and any target ledger close bundle for ATM-GOV-0151. Do not hand-edit runtime state.
