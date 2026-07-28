---
task_id: TASK-RFT-0065
title: Split team brokered write validator below 600 lines
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0064
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOVERNANCE-OPTIMIZATION-HANDOFF.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-team-brokered-write.ts
  - scripts/validate-team-brokered-write/**/*.ts
  - tests/scripts/validate-team-brokered-write-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
deliverables:
  - scripts/validate-team-brokered-write.ts
  - scripts/validate-team-brokered-write/**/*.ts
  - tests/scripts/validate-team-brokered-write-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types tests/scripts/validate-team-brokered-write-final-600.test.ts
  - npm run validate:team-brokered-write
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-brokered-write-validator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.team-brokered-write-validator-facade
      pattern: Facade
      source: scripts/validate-team-brokered-write.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T05:26:49.455Z"
completed_by_agent: "codex-task-rft-0065"
closedAt: "2026-07-16T05:26:49.455Z"
closedByActor: "codex-task-rft-0065"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T05-26-49-371Z-close-3c632d0dd12c"
lastTransitionAt: "2026-07-16T05:26:49.455Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "24d4872f31259693eba262d3e7f67066b703d8b9"
---

# TASK-RFT-0065

## Goal

Split the `validate-team-brokered-write` validator into a bounded module tree while preserving the validator command behavior and brokered write scenario coverage.

## Scope

- Keep `scripts/validate-team-brokered-write.ts` as the operator-facing validator facade.
- Move schema helpers, filesystem/git fixture helpers, broker linkage assertions, and scenario execution into modules under `scripts/validate-team-brokered-write/`.
- Keep every touched physical TypeScript file at or below 600 lines.
- Register the facade and module tree under `atm.team-brokered-write-validator-map`.

## Acceptance

- `node --strip-types tests/scripts/validate-team-brokered-write-final-600.test.ts` passes.
- `npm run validate:team-brokered-write` passes.
- `npm run typecheck` passes.
- Existing package.json validator wiring does not need command changes.
