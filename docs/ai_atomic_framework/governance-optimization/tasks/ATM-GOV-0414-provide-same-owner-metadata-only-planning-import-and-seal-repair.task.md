---
task_id: ATM-GOV-0414
title: Provide same-owner metadata-only planning import and seal repair
status: done
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0273
causalGraph:
  causalDependencies:
    - ATM-GOV-0273
  startConditions:
    - Active same-owner claim exists and the planning source differs only in metadata or validator fields.
  softRelations:
    - ATM-BUG-2026-07-30-278
  changedPublicSeams:
    - atm.tasks.import.metadataOnlyPreserveClaim
  causalImpactEdges:
    - planning-source-seal-to-active-claim-continuity
  parallelFrontierInputs: []
  validatorReferences:
    - node --strip-types tests/cli/tasks-import-metadata-only-preserve-claim.test.ts
    - npm run typecheck
  phaseOwner: task-import
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - tests/cli/tasks-import-metadata-only-preserve-claim.test.ts
deliverables:
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - tests/cli/tasks-import-metadata-only-preserve-claim.test.ts
validators:
  - node --strip-types tests/cli/tasks-import-metadata-only-preserve-claim.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-06T03:23:58.553Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-06T03:23:58.553Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-06T03-23-58-553Z-close-86414d3317d0"
lastTransitionAt: "2026-09-06T03:23:58.553Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e1a09c3ed5b1a9ff36aa0bbf78314c89d57c13b6"
---

# ATM-GOV-0414 Provide same-owner metadata-only planning import and seal repair

## Intent

Provide a narrow governed import path for a planning-source metadata or seal
refresh when the same actor, lane, session, and lease still own an active
claim. The path must update only the planning metadata that differs, preserve
claim/lifecycle fields and evidence continuity, and remain fail-closed for a
different owner or a source/content change outside the declared metadata set.

## Acceptance

- [ ] `tasks import --metadata-only --preserve-active-claim` (or an equivalent
      governed command) is registered and returns a receipt naming the task,
      actor, lane/session, lease, before/after source digests, and changed keys.
- [ ] Same-owner metadata-only import updates the planning source seal and
      validator metadata without changing status, claim state, lease, lane,
      scope, deliverables, or evidence references.
- [ ] A different actor, lane, session, or non-metadata content change fails
      closed and leaves the task ledger and claim bytes unchanged.
- [ ] Red/green regression reproduces `IMPORT_SKIPPED_ACTIVE_CLAIM`, then
      proves the narrow route succeeds only for the same-owner metadata case.
- [ ] Existing default import behavior remains unchanged when the new flag is
      absent, including active-claim protection and force-overwrite gates.
- [ ] The target repository imports the card through the governed planning
      source path before implementation; no direct `.atm/history/**` edits.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-06T02:51:47.172Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0414-provide-same-owner-metadata-only-planning-import-and-seal-repair.task.md","contentDigest":"sha256:6e8b50a765653f83688377f9ade67a8fa39b3b66af3081bca60c5f511322b385"} -->
