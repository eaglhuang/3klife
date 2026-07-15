---
doc_id: doc_atm_gov_0124
task_id: ATM-GOV-0124
title: "Install the content-bound Charter authority bundle"
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
  - "templates/root-drop/.atm/charter/atomic-charter.template.md"
  - "templates/root-drop/.atm/charter/charter-invariants.template.json"
  - "templates/root-drop/.atm/charter/atm-first-principles.template.md"
  - "schemas/charter/charter-bundle.schema.json"
  - "packages/plugin-governance-local/src/bootstrap/bootstrap.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "packages/integrations-core/src/compiler/charter-block.ts"
  - "scripts/validate-charter.ts"
  - "tests/cli/charter-bundle.test.ts"
deliverables:
  - "templates/root-drop/.atm/charter/atm-first-principles.template.md"
  - "schemas/charter/charter-bundle.schema.json"
  - "packages/integrations-core/src/compiler/charter-block.ts"
  - "tests/cli/charter-bundle.test.ts"
validators:
  - "npm run validate:charter"
  - "node --strip-types tests/cli/charter-bundle.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Retain current repository Charter files and disable bundle loading."
atomizationImpact:
  ownerAtomOrMap: "atm.charter-authority-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.charter-bundle-loader"
      pattern: "Gateway"
      source: "packages/cli/src/commands/doctor.ts"
      disposition: extract
outOfScope:
  - "Adding host-specific rules or a second waiver authority."
---

# ATM-GOV-0124 - Install the content-bound Charter authority bundle

## Acceptance

- Bootstrap and templates install the framework repository authority bundle.
- One loader verifies Charter/schedule versions and hashes for every consumer.
- Schedule A defines actual monetary cost and end-to-end time as the hard economic ratios; raw token counts remain mandatory diagnostics rather than a cross-model price proxy.
- Machine-readable invariants expose production, preferred, and breakthrough Team thresholds without duplicating waiver authority in the planning document.
- Missing or mismatched schedules fail closed with a copyable repair command.
- Documentation does not claim machine enforcement before wiring exists.
