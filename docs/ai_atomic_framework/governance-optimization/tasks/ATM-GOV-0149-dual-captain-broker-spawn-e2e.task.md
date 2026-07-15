---
doc_id: doc_atm_gov_0149
task_id: ATM-GOV-0149
title: "Add true dual-Captain Broker spawn E2E"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation-Gate
depends_on: [ATM-GOV-0128, ATM-GOV-0137, ATM-GOV-0145, ATM-GOV-0148]
related_plan: docs/ai_atomic_framework/governance-optimization/
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "tests/cli/pre-team-dual-captain-e2e.test.ts"
  - "tests/cli/pre-team-foundation-gate.test.ts"
deliverables:
  - "tests/cli/pre-team-dual-captain-e2e.test.ts"
validators:
  - "node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts"
  - "node --strip-types tests/cli/pre-team-foundation-gate.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the E2E fixture extension if it destabilizes the foundation gate."
atomizationImpact:
  ownerAtomOrMap: "atm.pre-team-foundation-gate-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "TASK-RFT-0037 and all RFT implementation surfaces."
  - "release/atm-onefile/** and release/atm-root-drop/** artifact sync."
  - "Runner-sync steward queue implementation."
  - "Generated projection steward implementation."
completed_at: "2026-07-15T15:25:10.658Z"
completed_by_agent: "codex-gpt-5-5-captain"
closedAt: "2026-07-15T15:25:10.658Z"
closedByActor: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T15-25-10-658Z-close-568301740a58"
lastTransitionAt: "2026-07-15T15:25:10.658Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f018095c6362e673b287bb31761376052d368274"
---

# ATM-GOV-0149 - Add true dual-Captain Broker spawn E2E

## Why

ATM-GOV-0145 replaced the old meta-test with a real index-isolation fixture, and ATM-GOV-0148 projected global resources into Broker shared surfaces. The remaining Foundation Gate gap is an end-to-end fixture that uses spawned ATM CLI processes to prove two Captain lanes can coexist when one actor holds an RFT Team Broker surface and another actor performs an unrelated governance/backlog admission path.

## Acceptance

- The test must spawn ATM CLI processes, not call only in-process helpers.
- Actor A must register or hold an RFT-like Team surface through the Broker registry: `packages/cli/src/commands/team-legacy.ts`, `packages/cli/src/commands/team/legacy/**/*.ts`, `tests/cli/team-*.test.ts`, and the atom-map owner shard.
- Actor B must present a non-overlapping backlog item shard intent and receive `parallel-safe` / `allow` without manual index operations.
- Actor B must present a generated backlog Markdown projection rebuild intent and receive a shared-surface block on the canonical generated projection key.
- The fixture must fail if it is reduced to source-text inspection or a pure unit test that bypasses spawned CLI processes.
- `pre-team-foundation-gate` must keep executing this E2E directly.

## Required Evidence

- `node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts`
- `node --strip-types tests/cli/pre-team-foundation-gate.test.ts`
- `npm run typecheck`
- `node atm.mjs tasks audit --json`
