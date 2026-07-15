---
doc_id: doc_atm_gov_0133
task_id: ATM-GOV-0133
title: "Seal external planning-source identity before claim and close"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/import-task.ts"
  - "packages/cli/src/commands/tasks/claim-orchestrator.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "tests/cli/planning-source-seal.test.ts"
deliverables:
  - "packages/cli/src/commands/tasks/import-task.ts"
  - "tests/cli/planning-source-seal.test.ts"
validators:
  - "node --strip-types tests/cli/planning-source-seal.test.ts"
  - "npm run typecheck"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.task-planning-source-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Changing 3KLife planning authority rules."
---

# ATM-GOV-0133 - Seal external planning-source identity before claim and close

## Acceptance

- Import records planning repository identity, task-card path, planning commit SHA, content digest, and amendment epoch.
- Claim and close revalidate the external planning card identity and reject drift unless a governed amendment is present.
- Current ledgers no longer rely on empty planningReadOnlyPaths when source cards live in 3KLife.
- Diagnostics explain whether drift is path, commit, content, repo identity, or amendment epoch.
