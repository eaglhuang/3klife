---
doc_id: doc_atm_gov_0142
task_id: ATM-GOV-0142
title: "Productize release publication ownership and sealed source receipts"
status: planned
owner: atm-core
priority: P2
milestone: GOVOPT-Operations
depends_on: [ATM-GOV-0127, ATM-GOV-0129]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/internal-release.ts"
  - "packages/cli/src/commands/build-release-hygiene.ts"
  - "tests/cli/release-publication-steward.test.ts"
deliverables:
  - "packages/cli/src/commands/internal-release.ts"
  - "tests/cli/release-publication-steward.test.ts"
validators:
  - "node --strip-types tests/cli/release-publication-steward.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.release-publication-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Unrelated refactors outside the declared scope."
---

# ATM-GOV-0142 - Productize release publication ownership and sealed source receipts

## Acceptance

- Release publication names one steward, sealed source commit, generated artifact digest, and publication receipt.
- Publication validation runs against the sealed source state, not an ambient dirty tree.
- Concurrent runner-sync work is refused unless active captains agree on release artifact ownership first.
