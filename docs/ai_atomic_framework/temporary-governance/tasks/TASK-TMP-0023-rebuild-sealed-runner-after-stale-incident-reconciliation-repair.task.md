---
task_id: TASK-TMP-0023
title: Rebuild sealed runner after stale incident reconciliation repair
status: done
owner: unassigned
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams:
    - sealed runner publication
    - frozen runner source seal
  causalImpactEdges:
    - source repair -> frozen runner consumers
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: runner-sync-steward
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/**
  - .atm/history/evidence/TASK-TMP-0023.*
  - .atm/history/task-events/TASK-TMP-0023/**
  - .atm/history/tasks/TASK-TMP-0023.json
deliverables:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/**
validators:
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - node atm.mjs doctor --json
  - node --strip-types packages/core/src/broker/__tests__/cross-task-mutation-guard.test.ts
  - node --strip-types packages/core/src/broker/__tests__/cross-task-mutation-terminal-entitlement.test.ts
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-05T12:19:57.198Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-05T12:19:57.198Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-05T12-19-57-198Z-close-145640673b8d"
lastTransitionAt: "2026-09-05T12:19:57.198Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7d660768ae56f055152180731e9510dd6a9f3870"
---

# TASK-TMP-0023 Rebuild sealed runner after stale incident reconciliation repair

## Intent

Rebuild the frozen onefile and root-drop runners from the current framework source after the stale incident reconciliation repair, preserving generated release manifests and producing a digest-bound publication receipt.

## Acceptance

- [ ] The sealed build completes under an active release-surface claim and changes only the declared release outputs plus this task's governed evidence.
- [ ] The frozen runner source seal matches the current framework source after the build.
- [ ] `node atm.mjs doctor --json` runs without `ATM_RUNNER_SYNC_REQUIRED`.
- [ ] The focused cross-task incident regressions remain green against the source and published runner.
- [ ] No foreign dirty or staged files are absorbed, deleted, or rewritten.

## Boundaries

Do not modify source files, backlog records, npm publication state, or other task history. Do not use `--no-verify`, `--force`, or an emergency lease unless the governed build explicitly returns that recovery path.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-05T12:02:45.746Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0023-rebuild-sealed-runner-after-stale-incident-reconciliation-repair.task.md","contentDigest":"sha256:d68c8e8a1704f934e8786ec3274666d418e61e5e8dab0566e270f8dec5eea9d6"} -->
