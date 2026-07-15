---
doc_id: doc_atm_gov_0145
task_id: ATM-GOV-0145
title: "Replace Pre-Team Foundation Gate meta-test with real dual-Captain E2E"
status: planned
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation-Gate
depends_on: [ATM-GOV-0128, ATM-GOV-0129, ATM-GOV-0130]
related_plan: docs/ai_atomic_framework/governance-optimization/
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "tests/cli/pre-team-foundation-gate.test.ts"
  - "tests/cli/pre-team-dual-captain-e2e.test.ts"
  - "scripts/validators.config.json"
deliverables:
  - "tests/cli/pre-team-foundation-gate.test.ts"
  - "tests/cli/pre-team-dual-captain-e2e.test.ts"
validators:
  - "node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts"
  - "node --strip-types tests/cli/pre-team-foundation-gate.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the E2E gate and validator catalog wiring if it blocks unrelated governance flows."
atomizationImpact:
  ownerAtomOrMap: "atm.pre-team-foundation-gate-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "TASK-RFT-* cards, large module atomization, and any RFT source edits."
  - "Team production/default promotion."
  - "Provider billing or real dogfood paired-run measurement."
---

# ATM-GOV-0145 - Replace Pre-Team Foundation Gate meta-test with real dual-Captain E2E

## Why

The 2026-07-15 recheck found that the Pre-Team Foundation Gate still gave a false sense of safety: `tests/cli/pre-team-foundation-gate.test.ts` inspected other test files with regex instead of executing the missing hard requirement from the plan.

This card closes the plan section 8 gap: two Captains share one repository, one close/commit lane runs while the other owns both staged and unstaged work, and the foreign staged/unstaged state remains intact without manual index surgery.

## Acceptance

- Add a real fixture-backed dual-Captain E2E test that creates a temporary git repository with two actors' work represented in the same live index/worktree.
- The fixture must include one foreign staged file and one foreign unstaged file before the governed close/commit operation.
- The governed close/commit path must commit only the active task deliverable and must leave the foreign staged blob staged byte-identically.
- The foreign unstaged worktree content must remain byte-identical after the operation.
- The test must fail if the implementation relies only on reading other tests' source text or only checks for string tokens.
- `pre-team-foundation-gate` must execute or import the dual-Captain E2E assertion directly, not merely grep for its source text.
- Validator catalog registration for `pre-team-foundation-gate` must remain intact.

## Required Evidence

- `node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts`
- `node --strip-types tests/cli/pre-team-foundation-gate.test.ts`
- `npm run typecheck`
- A final `node atm.mjs broker status --json` or equivalent showing no active conflict introduced by the card.

## Notes

This is deliberately non-RFT work. Do not touch `TASK-RFT-0037`, the RFT wave cards, or oversized module extraction surfaces while implementing this card.
