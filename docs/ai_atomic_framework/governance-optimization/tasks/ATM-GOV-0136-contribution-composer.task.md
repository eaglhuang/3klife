---
doc_id: doc_atm_gov_0136
task_id: ATM-GOV-0136
title: "Compose Team contribution manifests into one final tree"
status: done
owner: atm-core
priority: P1
milestone: GOVOPT-Team
depends_on: [ATM-GOV-0135]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team/composer.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "tests/cli/team-contribution-composer.test.ts"
deliverables:
  - "packages/cli/src/commands/team/composer.ts"
  - "tests/cli/team-contribution-composer.test.ts"
validators:
  - "node --strip-types tests/cli/team-contribution-composer.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.team-contribution-composer-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Unrelated refactors outside the declared scope."
---

# ATM-GOV-0136 - Compose Team contribution manifests into one final tree

## Acceptance

- Closer materializes compatible contribution manifests into a temporary index final tree.
- Conflicting file hashes fail closed with a precise conflict report.
- Composer owns scope expansion reconciliation; workers do not transfer file ownership in flight.
