---
task_id: TASK-PRF-0020
title: Repair sealed runner publication transaction and stable entrypoint sync
status: done
owner: unassigned
priority: P2
depends_on: [TASK-PRF-0018]
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: owner
scopePaths:
  - packages/cli/src/commands/internal-release
  - packages/cli/src/commands/framework-mode
  - scripts/run-sealed-runner-build.ts
  - release/atm-onefile/atm.mjs
  - release/atm-root-drop
  - tests/cli/runner-sync-steward-release.test.ts
  - tests/cli/internal-release-sync.test.ts
deliverables:
  - Stable root atm.mjs and release/atm-onefile/atm.mjs share the same sealed source digest.
  - Internal-release readiness accepts exactly one governed publication receipt and rejects stale/dirty artifacts.
  - Regression tests cover build, receipt, digest, and sync transaction failure modes.
validators:
  - node --strip-types tests/cli/runner-sync-steward-release.test.ts
  - node --strip-types tests/cli/internal-release-sync.test.ts
  - node atm.mjs doctor --json
  - npm run validate:internal-release-sync -- --mode validate
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T06:40:15.193Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-13T06:40:15.193Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T06-40-15-193Z-close-6c30e5102a55"
lastTransitionAt: "2026-09-13T06:40:15.193Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "08e28d7973e8443bb11e91a77adcd25f3ea69afb"
---

# TASK-PRF-0020 Repair sealed runner publication transaction and stable entrypoint sync

## Intent

Make the frozen runner publication atomic and observable. A successful sealed
build must update the stable entrypoint, release manifests, source seal, and
publication receipt as one governed transaction; partial publication must leave
the system fail-closed and diagnosable rather than reporting success while
`atm.mjs` still has source drift.

## Acceptance

- [ ] A fresh sealed build produces matching source digests for the stable and
      one-file entrypoints.
- [ ] Internal-release dry-run succeeds on the clean governed artifact set and
      fails with a specific error when any receipt/digest/dirty-state invariant
      is violated.
- [ ] No npm publish or Git push is performed by this card; those remain owner
      authorized release actions.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T01:07:51.566Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0020-repair-sealed-runner-publication-transaction-and-stable-entrypoint-sync.task.md","contentDigest":"sha256:36f55820708def75dd17d54c6ff031c028a4b390bc5ac7a961c7add60855ee46"} -->