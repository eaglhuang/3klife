---
doc_id: doc_atm_gov_0138
task_id: ATM-GOV-0138
title: "Make Broker registry updates atomic and thin under shadow-first Team"
status: planned
owner: atm-core
priority: P2
milestone: GOVOPT-Team
depends_on: [ATM-GOV-0137]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/shared-surface-queue.ts"
  - "packages/cli/src/commands/broker.ts"
  - "tests/cli/broker-registry-transaction.test.ts"
deliverables:
  - "packages/core/src/broker/shared-surface-queue.ts"
  - "tests/cli/broker-registry-transaction.test.ts"
validators:
  - "node --strip-types tests/cli/broker-registry-transaction.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-transaction-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Unrelated refactors outside the declared scope."
---

# ATM-GOV-0138 - Make Broker registry updates atomic and thin under shadow-first Team

## Acceptance

- Broker registry writes are atomic, idempotent, and recoverable after process crash.
- Under shadow-first Team, Broker records scheduling intents and barrier conflicts rather than policing live writes.
- Stale broker intents are diagnosable and releasable before new planning or claiming.
