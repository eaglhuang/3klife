---
task_id: TASK-RFT-0107
title: Extract bounded semantic modules from tasks legacy implementation
status: done
owner: atm-core
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/legacy.ts
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/tasks/legacy/**/*.ts
  - tests/cli/tasks-legacy-impl-extraction.test.ts
deliverables:
  - packages/cli/src/commands/tasks/legacy.ts
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/tasks/legacy/**/*.ts
  - tests/cli/tasks-legacy-impl-extraction.test.ts
validators:
  - node --strip-types tests/cli/tasks-legacy-impl-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-06T17:37:27.662Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-06T17:37:27.662Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-06T17-37-27-662Z-close-a73fbd6092cf"
lastTransitionAt: "2026-09-06T17:37:27.662Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "54fab0250dca5d12739ec8e5f43ad7f502c47cb7"
---

# TASK-RFT-0107 Extract bounded semantic modules from tasks legacy implementation

## Intent

TBD.

## Acceptance

- Extract at least one complete semantic command family into readable modules,
  keeping every touched source and test module at or below 600 physical lines
  and no individual line above 1000 characters.
- Preserve the public facade exports and task command behavior; add a
  deterministic red-to-green extraction-boundary receipt.

## Boundaries

- Do not change release artifacts, npm publication, backlog projections, or
  unrelated task command behavior.
- Do not delete, restore, stage, or absorb foreign residue.
- Do not reopen TASK-RFT-0033 history.

- [ ] Deliverables and validators are filled before import or implementation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-06T17:22:25.385Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"rft-hardening/tasks/TASK-RFT-0107-extract-bounded-semantic-modules-from-tasks-legacy-implementation.task.md","contentDigest":"sha256:19b45bee7f0c71c14dad8d21f63d7ccb7ecedbfc4980140b9773dbfc576763a8"} -->
