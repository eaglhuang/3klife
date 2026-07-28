---
task_id: TASK-RFT-0062
title: Split prompt scoped next validator below 600 lines
status: done
owner: atm-refactor
priority: P1
depends_on:
  - TASK-RFT-0061
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0062-validate-prompt-scoped-next-final-600.task.md
scopePaths:
  - scripts/validate-prompt-scoped-next.ts
  - scripts/validate-prompt-scoped-next/**/*.ts
  - tests/scripts/validate-prompt-scoped-next-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts*.json
deliverables:
  - scripts/validate-prompt-scoped-next.ts
  - scripts/validate-prompt-scoped-next/**/*.ts
  - tests/scripts/validate-prompt-scoped-next-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types tests/scripts/validate-prompt-scoped-next-final-600.test.ts
  - npm run validate:prompt-scoped-next
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the validator facade split and rebuild release artifacts only if ATM reports runner drift.
atomizationImpact:
  ownerAtomOrMap: atm.next-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.prompt-scoped-next-validator-facade
      pattern: Facade
      source: scripts/validate-prompt-scoped-next.ts
      disposition: extract
      inlineReason: null
    - atom: atm.prompt-scoped-next-validator-scenarios
      pattern: Strategy Map
      source: scripts/validate-prompt-scoped-next.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T04:44:23.067Z"
completed_by_agent: "codex-task-rft-0062"
closedAt: "2026-07-16T04:44:23.067Z"
closedByActor: "codex-task-rft-0062"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T04-44-22-956Z-close-4ecb65ef4ab6"
lastTransitionAt: "2026-07-16T04:44:23.067Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9ddaa1600e99e1fc21efddc4f91780510cf0fd7d"
---

# TASK-RFT-0062

Split `scripts/validate-prompt-scoped-next.ts` so the script remains the stable executable facade while reusable fixture helpers and route-scenario assertions move into owned helper modules. Every physical TypeScript file in this card's deliverable surface must be below 600 lines.

## Acceptance

- `npm run validate:prompt-scoped-next` remains the canonical regression command and exits successfully.
- `scripts/validate-prompt-scoped-next.ts` remains directly executable with `node --strip-types`.
- `tests/scripts/validate-prompt-scoped-next-final-600.test.ts` verifies the facade and extracted modules are below 600 lines and that the script owner shard maps the facade and module glob to `atm.next-router-map`.
- No next routing, tasks lifecycle, team, quickfix, or batch behavior is changed in this card.

## Atom Plan

Atom: `atm.next-router-map`
Pattern: Facade plus Strategy Map
Owner module: `scripts/validate-prompt-scoped-next/**`
Callers: `npm run validate:prompt-scoped-next`, `tests/cli/next-route-selector.test.ts`
Public surface: `scripts/validate-prompt-scoped-next.ts` command behavior and quiet success output stay stable
Focused test: `node --strip-types tests/scripts/validate-prompt-scoped-next-final-600.test.ts`
CLI regression: `npm run validate:prompt-scoped-next`
Out of scope: `packages/cli/src/commands/next.ts`, next route semantics, team runtime semantics, quickfix behavior
Commit split: source/test/map delivery, taskflow close bundle, release sync only if ATM reports runner drift
