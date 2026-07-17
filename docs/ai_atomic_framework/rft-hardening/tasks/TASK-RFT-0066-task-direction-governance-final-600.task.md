---
task_id: TASK-RFT-0066
title: Split task direction governance validator below 600 lines
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0065
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOVERNANCE-OPTIMIZATION-HANDOFF.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-task-direction-governance.ts
  - scripts/validate-task-direction-governance/**/*.ts
  - tests/scripts/validate-task-direction-governance-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-16-011.json
  - docs/governance/atm-bug-and-optimization-backlog.md
deliverables:
  - scripts/validate-task-direction-governance.ts
  - scripts/validate-task-direction-governance/**/*.ts
  - tests/scripts/validate-task-direction-governance-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-16-011.json
  - docs/governance/atm-bug-and-optimization-backlog.md
validators:
  - node --strip-types tests/scripts/validate-task-direction-governance-final-600.test.ts
  - npm run validate:task-direction-governance
  - npm run validate:governance-projections
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-direction-governance-validator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.task-direction-governance-validator-facade
      pattern: Facade
      source: scripts/validate-task-direction-governance.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T05:48:52.362Z"
completed_by_agent: "codex-task-rft-0066"
closedAt: "2026-07-16T05:48:52.362Z"
closedByActor: "codex-task-rft-0066"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T05-48-52-362Z-close-858247bfcdf4"
lastTransitionAt: "2026-07-16T05:48:52.362Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e541ba1aadbd3b1e80ba06123db8714352ea2271"
---

# TASK-RFT-0066

## Goal

Split the `validate-task-direction-governance` validator into a bounded module tree while preserving task-direction, batch, framework-development, same-file claim, and pre-commit governance coverage.

## Scope

- Keep `scripts/validate-task-direction-governance.ts` as the operator-facing validator facade.
- Move shared assertions, fixture builders, adopter/batch journeys, framework-development checks, same-file claim admission, and same-file pre-commit ownership scenarios into modules under `scripts/validate-task-direction-governance/`.
- Keep every touched physical TypeScript file at or below 600 lines.
- Register the facade and module tree under `atm.task-direction-governance-validator-map`.
- Record the repeated stale framework lock/pre-push noise as an ATM governance optimization backlog item.

## Acceptance

- `node --strip-types tests/scripts/validate-task-direction-governance-final-600.test.ts` passes.
- `npm run validate:task-direction-governance` passes.
- `npm run validate:governance-projections` passes.
- `npm run typecheck` passes.
- Existing package.json validator wiring does not need command changes.
