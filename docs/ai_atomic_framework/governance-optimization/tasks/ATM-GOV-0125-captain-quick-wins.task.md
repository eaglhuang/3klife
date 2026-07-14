---
doc_id: doc_atm_gov_0125
task_id: ATM-GOV-0125
title: "Land low-risk Captain guidance and recovery quick wins"
status: planned
owner: atm-core
priority: P1
milestone: GOVOPT-Foundation
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "packages/cli/src/commands/team/provider-preflight.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "packages/cli/src/commands/next/__tests__/active-work-summary.spec.ts"
  - "packages/cli/src/commands/next/__tests__/fresh-task-reservation.spec.ts"
  - "tests/cli/team-provider-preflight.test.ts"
  - "tests/cli/integration-raw-git-command-guard.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "packages/cli/src/commands/team/provider-preflight.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "tests/cli/team-provider-preflight.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/team-provider-preflight.test.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/active-work-summary.spec.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/fresh-task-reservation.spec.ts"
  - "node --strip-types tests/cli/integration-raw-git-command-guard.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert guidance rendering without changing runtime state."
atomizationImpact:
  ownerAtomOrMap: "atm.cli-command-router-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.precommit-failure-summary"
      pattern: "Presenter"
      source: "packages/cli/src/commands/hook/pre-commit.ts"
      disposition: follow-up-card
outOfScope:
  - "Changing close state, index contents, or evidence truth."
---

# ATM-GOV-0125 - Land low-risk Captain guidance and recovery quick wins

## Acceptance

- Batch help exposes `deliver-and-close` and copyable recovery.
- Hook failure output is summary-first.
- Paid provider Team execution runs one minimal provider preflight and classifies auth, model, schema, quota, billing, stale-price, currency, and plan failures before expensive work.
- Preflight binds provider/model/plan, canonical catalog version and a projected spending ceiling; routing prefers the cheapest model that satisfies capability, risk and data-policy requirements.
- Active-work/fresh-reservation tests verify existing behavior and backlog status.
- Operator hints contain no raw destructive Git remediation.
