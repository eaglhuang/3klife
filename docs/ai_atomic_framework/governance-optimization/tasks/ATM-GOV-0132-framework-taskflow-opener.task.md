---
doc_id: doc_atm_gov_0132
task_id: ATM-GOV-0132
title: "Provide a safe framework taskflow opener lane"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: [ATM-GOV-0124]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/host-opener-policy.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/framework-opener.spec.ts"
deliverables:
  - "packages/cli/src/commands/taskflow/host-opener-policy.ts"
  - "packages/cli/src/commands/taskflow/__tests__/framework-opener.spec.ts"
validators:
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/framework-opener.spec.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Restore template-only fallback with complete safe authoring guidance."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-command-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.framework-taskflow-opener-policy"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/taskflow.ts"
      disposition: extract
outOfScope:
  - "Writing or closing framework deliverables from a planning repository."
---

# ATM-GOV-0132 - Provide a safe framework taskflow opener lane

## Acceptance

- Framework task authoring works with a shipped profile or safe no-profile lane.
- No placeholder ledger/import drift or emergency overwrite is required.
- Output names the planning card, target repository, and next dry-run/import command.
- Opener/import warns or fails with ATM_TASK_ID_FAMILY_DRIFT when a new task family duplicates an existing semantic family.
- atm-task-card-authoring guidance scans existing task families before minting IDs.
- Framework mutation and closure still require target-repository authority.
