---
task_id: TASK-TMP-0010
title: Publish planning-mirror reconciliation and drain proven residue
status: done
owner: unassigned
priority: P2
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
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/planning-mirror-reconcile.ts
  - packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts
  - packages/cli/dist/atm.js
  - release/atm-onefile/atm.mjs
  - release/atm-root-drop/atm.mjs
deliverables:
  - release/atm-onefile/atm.mjs
validators:
  - node --experimental-strip-types packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts
  - npx tsc --noEmit
  - node atm.mjs --version
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-29T12:39:48.406Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-29T12:39:48.406Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-29T12-39-48-406Z-close-7ec37b10ad07"
lastTransitionAt: "2026-08-29T12:39:48.406Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2d3af263f7b5c55eeaf83d72802fb05c6714946c"
---

# TASK-TMP-0010 Publish planning-mirror reconciliation and drain proven residue

## Intent

Publish the frozen runner that contains the planning-mirror reconciliation repair, while leaving unrelated worktree residue untouched.

## Acceptance

- [ ] The frozen onefile runner includes the reconciliation implementation.
- [ ] The runner-sync receipt records a successful publication from the sealed source.
- [ ] The focused regression test, typecheck, and frozen runner version check pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-29T12:25:21.562Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0010-publish-planning-mirror-reconciliation-and-drain-proven-residue.task.md","contentDigest":"sha256:538011b22791b53e5eaa22879a6ca7c9cbda79e654596195c971cdf23d9d3573"} -->
