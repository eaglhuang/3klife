---
task_id: TASK-RFT-0063
title: Split police family validator below 600 lines
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0062
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-handoff.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-police-family.ts
  - scripts/validate-police-family/**/*.ts
  - tests/scripts/validate-police-family-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts*.json
deliverables:
  - scripts/validate-police-family.ts
  - scripts/validate-police-family/**/*.ts
  - tests/scripts/validate-police-family-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types tests/scripts/validate-police-family-final-600.test.ts
  - npm run validate:police-family
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the validator facade/module split and owner-shard mapping if police-family validation regresses.
atomizationImpact:
  ownerAtomOrMap: atm.police-family-validator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.police-family-validator-map
      pattern: Facade
      source: scripts/validate-police-family.ts
      disposition: extract
      inlineReason: null
    - atom: atm.police-family-result-contract-fixtures
      pattern: Result Contract Object
      source: scripts/validate-police-family.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T04:56:31.682Z"
completed_by_agent: "codex-task-rft-0063"
closedAt: "2026-07-16T04:56:31.682Z"
closedByActor: "codex-task-rft-0063"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T04-56-31-682Z-close-70a4f3af94f9"
lastTransitionAt: "2026-07-16T04:56:31.682Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "08077b8df74c4e06ad918d8ea3b935cd1966f38a"
---

# TASK-RFT-0063

Split `scripts/validate-police-family.ts` into a thin facade plus bounded scenario/helper modules so every physical TypeScript file in the validator surface stays below 600 lines.

## Acceptance

- `scripts/validate-police-family.ts` remains the stable entrypoint for `npm run validate:police-family`.
- Extracted modules live under `scripts/validate-police-family/` and preserve existing police family assertions.
- Every physical file in `scripts/validate-police-family.ts` and `scripts/validate-police-family/**/*.ts` is at or below 600 lines.
- `owner-shard-scripts.json` maps the facade and module glob to `atm.police-family-validator-map`.
- Command-backed validators pass.
