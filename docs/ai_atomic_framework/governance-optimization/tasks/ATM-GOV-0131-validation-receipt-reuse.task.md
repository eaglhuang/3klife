---
doc_id: doc_atm_gov_0131
task_id: ATM-GOV-0131
title: "Unify wrapper-generated content-addressed validation receipts"
status: planned
owner: atm-core
priority: P1
milestone: GOVOPT-Foundation
depends_on: [ATM-GOV-0129]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/run-validators.ts"
  - "packages/cli/src/commands/evidence/bundle-io.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/core/src/evidence/validation-receipt.ts"
  - "schemas/evidence/micro-evidence-receipt.schema.json"
  - "tests/cli/validation-receipt-reuse.test.ts"
deliverables:
  - "packages/core/src/evidence/validation-receipt.ts"
  - "schemas/evidence/micro-evidence-receipt.schema.json"
  - "tests/cli/validation-receipt-reuse.test.ts"
validators:
  - "node --strip-types tests/cli/validation-receipt-reuse.test.ts"
  - "node --strip-types tests/cli/validator-run-resume-and-status.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Reject cache reuse and rerun through the current wrapper."
atomizationImpact:
  ownerAtomOrMap: "atm.evidence-runtime-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.validation-receipt-store"
      pattern: "Repository"
      source: "scripts/run-validators.ts"
      disposition: extract
    - atom: "atm.evidence-reuse-policy"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/evidence/bundle-io.ts"
      disposition: extract
outOfScope:
  - "Symbol-level read-set minimization."
---

# ATM-GOV-0131 - Unify wrapper-generated validation receipts

## Acceptance

- Agents reference receipt IDs but cannot author canonical receipts; only the ATM validator wrapper writes canonical receipt storage.
- Reuse binds validator, command, environment, base, payload, and scope.
- Any changed file in the conservative package or directory scope invalidates reuse until import graph or fs-trace support exists.
- Legacy validator cache either becomes authenticated by the new receipt contract or is retired from canonical close gates.
- Receipt storage has atomic writes, retention/GC policy, and Windows-safe retry.
- A valid receipt prevents duplicate hook execution without weakening gates.
