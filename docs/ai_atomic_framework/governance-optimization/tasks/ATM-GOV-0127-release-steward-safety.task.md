---
doc_id: doc_atm_gov_0127
task_id: ATM-GOV-0127
title: "Protect foreign WIP with an exclusive release steward lane"
status: planned
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/internal-release.ts"
  - "packages/cli/src/commands/build-release-hygiene.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
  - "scripts/build-release-hygiene.ts"
  - "tests/cli/build-release-hygiene.test.ts"
  - "tests/cli/runner-sync-foreign-dirty-owner.test.ts"
deliverables:
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
  - "tests/cli/runner-sync-foreign-dirty-owner.test.ts"
validators:
  - "node --strip-types tests/cli/build-release-hygiene.test.ts"
  - "node --strip-types tests/cli/runner-sync-foreign-dirty-owner.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Return to one manual steward and fail closed on any dirty owner."
atomizationImpact:
  ownerAtomOrMap: "atm.release-steward-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.runner-sync-admission"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/internal-release.ts"
      disposition: extract
outOfScope:
  - "A general-purpose worktree snapshot system."
---

# ATM-GOV-0127 - Protect foreign WIP with an exclusive release steward lane

## Acceptance

- Runner sync refuses foreign non-release WIP before any mutation.
- Ordinary cards cannot admit or auto-stage `release/**`.
- Validation-only builds restore the release tree they generated.
- Publication names one steward and exact sealed source SHA.
