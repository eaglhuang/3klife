---
doc_id: doc_atm_gov_0139
task_id: ATM-GOV-0139
title: "Introduce path-to-validator obligations with sealed-commit canary lane"
status: done
owner: atm-core
priority: P1
milestone: GOVOPT-Team
depends_on: [ATM-GOV-0131]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/validation-obligations.ts"
  - "scripts/run-validators.ts"
  - "tests/cli/validation-obligation-map.test.ts"
deliverables:
  - "packages/cli/src/commands/validation-obligations.ts"
  - "tests/cli/validation-obligation-map.test.ts"
validators:
  - "node --strip-types tests/cli/validation-obligation-map.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.validation-obligation-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Unrelated refactors outside the declared scope."
---

# ATM-GOV-0139 - Introduce path-to-validator obligations with sealed-commit canary lane

## Acceptance

- Phase 1 uses declarative path-to-validator mapping that humans can review.
- Full-suite canary runs non-blocking against an exact sealed commit SHA in a clean checkout.
- Canary failures produce mapping-gap incidents tied to commit SHA and mapping version.
- Symbol-level minimization is deferred until import graph or fs-trace evidence exists.
