---
doc_id: doc_atm_gov_0141
task_id: ATM-GOV-0141
title: "Integrate Batch mode with sealed close and Team admission"
status: done
owner: atm-core
priority: P2
milestone: GOVOPT-Operations
depends_on: [ATM-GOV-0129, ATM-GOV-0140]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/team.ts"
  - "tests/cli/batch-team-integration.test.ts"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "tests/cli/batch-team-integration.test.ts"
validators:
  - "node --strip-types tests/cli/batch-team-integration.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.batch-team-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Unrelated refactors outside the declared scope."
---

# ATM-GOV-0141 - Integrate Batch mode with sealed close and Team admission

## Acceptance

- Batch queue head uses the same seal-and-commit transaction as normal close.
- Batch may use Team only for the current queue head and only when admission proves structural parallelism.
- Batch checkpoint refuses commits whose evidence does not match the sealed payload.
- Batch aggregates provider usage and fully-loaded monetary cost across all attempts, including retries and discarded contributions.
- Queue-head latency, batch makespan and throughput are reported separately; throughput improvement cannot be presented as a single-task latency improvement.
- Batch stop-loss may switch later queue heads to a cheaper qualified model mix or single Agent without changing close semantics.
