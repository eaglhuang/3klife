---
doc_id: task_rft_0027
task_id: TASK-RFT-0027
title: "apply configurable atomization line bound to existing RFT oversized modules"
status: done
owner: atm-core
priority: P2
milestone: RFT-M8
depends_on: [TASK-RFT-0026]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands"
  - "scripts"
  - "tests/cli/rft-atomization-rollout.test.ts"
deliverables:
  - "tests/cli/rft-atomization-rollout.test.ts"
validators:
  - "node --strip-types tests/cli/rft-atomization-rollout.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.rft-atomization-rollout-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Actually splitting every oversized module in this card."
---

# TASK-RFT-0027 - apply configurable atomization line bound to existing RFT oversized modules

## Acceptance

- Inventory all ATM framework files over the configured atomic line bound.
- Rank candidates by bug density, shared-surface risk, and map/facade extraction readiness.
- Open follow-up RFT cards without exceeding the configured max-lines rule for new atoms, maps, or scripts.
