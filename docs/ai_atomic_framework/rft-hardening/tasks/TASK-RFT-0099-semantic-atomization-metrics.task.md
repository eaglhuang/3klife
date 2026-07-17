---
task_id: TASK-RFT-0099
title: Semantic atomization metrics for RFT gate evidence
status: planned
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0098
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - package.json
  - scripts/validate-physical-line-budget.ts
  - scripts/validate-rft-atomization-metrics.ts
  - tests/cli/rft-atomization-metrics.test.ts
  - tests/cli/physical-line-budget-gate.test.ts
  - atomic_workbench/atomization-coverage/**
deliverables:
  - scripts/validate-rft-atomization-metrics.ts
  - tests/cli/rft-atomization-metrics.test.ts
  - scripts/validate-physical-line-budget.ts
validators:
  - node --strip-types scripts/validate-rft-atomization-metrics.ts --json
  - node --strip-types tests/cli/rft-atomization-metrics.test.ts
  - node --strip-types scripts/validate-physical-line-budget.ts --json
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the semantic metric validator and remove any generated metric projection if scoring creates false blockers for valid RFT splits.
atomizationImpact:
  ownerAtomOrMap: atm.rft-semantic-atomization-metrics
  mapUpdates:
    - atomic_workbench/atomization-coverage/**
  extractionCandidates:
    - atom: atm.rft-semantic-atomization-metrics
      pattern: Metric Adapter
      source: scripts/validate-rft-atomization-metrics.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - Enforcing touched-file physical admission; owned by TASK-RFT-0098.
  - Automatically opening continuation cards; owned by TASK-RFT-0100.
  - Changing the semantic meaning of existing atom/map ids.
---

# TASK-RFT-0099 - Semantic Atomization Metrics for RFT Gate Evidence

## Objective

Add command-backed semantic atomization metrics to RFT evidence so a passing
physical line-budget report is not mistaken for proof that a split preserved or
improved atom/map semantics.

## Acceptance

- A validator emits JSON with at least owner atom/map id, touched source count,
  extracted atom count, inline-exception count, follow-up-card count, and files
  lacking atomization ownership.
- The RFT line-budget report or companion evidence clearly distinguishes hard
  physical violations from semantic atomization warnings.
- The validator can run on the current repository without requiring new RFT
  violations to exist.
- Focused regression covers a healthy metric sample and a missing-owner sample.
- Evidence output is stable enough for closure packets and future dashboards to
  consume without scraping prose.

## Notes

- This card creates evidence and metrics only. It does not decide whether a
  semantic warning blocks commit; enforcement can be a later policy card.
- Prefer reading existing atomization coverage projections over duplicating map
  discovery logic.
