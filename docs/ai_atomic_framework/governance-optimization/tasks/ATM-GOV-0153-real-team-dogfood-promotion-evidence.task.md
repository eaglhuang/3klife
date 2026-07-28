---
task_id: ATM-GOV-0153
title: Collect real Team dogfood promotion evidence
status: done
owner: atm-core
priority: P0
depends_on: [ATM-GOV-0140, ATM-GOV-0143, ATM-GOV-0144, TASK-RFT-0028]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - tests/cli/team-agents-dogfood.test.ts
  - tests/cli/governance-cost-bench.test.ts
  - artifacts/generated/team-dogfood/**
  - docs/governance/atm-bug-and-optimization-backlog.items/**
deliverables:
  - artifacts/generated/team-dogfood/real-paired-sample.json
  - tests/cli/team-agents-dogfood.test.ts
validators:
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - node --strip-types tests/cli/governance-cost-bench.test.ts
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-efficiency-controller
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-real-dogfood-promotion-evidence
      pattern: Result Contract Object
      source: tests/cli/team-agents-dogfood.test.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T06:04:56.736Z"
completed_by_agent: "atm-core"
closedAt: "2026-07-18T06:04:56.736Z"
closedByActor: "atm-core"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T06-04-56-026Z-close-40516be31625"
lastTransitionAt: "2026-07-18T06:04:56.736Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "fbd5499967a3d40dbc6144ca601909b96adcb31d"
---

# ATM-GOV-0153 - Collect real Team dogfood promotion evidence

## Acceptance

- Produce at least one real paired single-Agent versus Team Agents dogfood sample with provider billable usage, model identities, pricing catalog version, wall-clock time, and quality outcome.
- Keep `measurement-incomplete` and `promotionEligible: false` when any provider usage, billing, pricing, wall-clock, or quality field is missing.
- Team promotion to production/default is allowed only when the real paired sample proves cost and time thresholds from the plan.
- Simulated fixture data may remain diagnostic but must not be counted as promotion evidence.
- If paid/provider execution cannot be run in the current environment, close is forbidden; update backlog with the blocker and leave the task open.

## Notes

- This card closes the residual gap from TASK-RFT-0028, ATM-GOV-0126, and ATM-GOV-0140: fake or fixture cost data must never be treated as production Team promotion evidence.
