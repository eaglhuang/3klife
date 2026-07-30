---
task_id: ATM-GOV-0275
title: Preserve foreign work during dual-captain governed commit
status: done
owner: unassigned
assignee: Claude-005
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Plan 3.2 has not started implementation.
    - Deep-module review fingerprint deep-module-review:9433b14b is accepted as the design baseline.
    - ATM-GOV-0274 may run in parallel but must not edit this card's primary files without Captain review.
  softRelations:
    - ATM-GOV-0274
  changedPublicSeams:
    - atm.gitGovernanceCommit
    - atm.workAdmissionTicket
    - atm.sharedWriteProvenance
  causalImpactEdges:
    - source: packages/cli/src/commands/git-governance/implementation.ts
      target: tests/cli/pre-team-dual-captain-e2e.test.ts
      reason: Governed commit must preserve foreign staged and unstaged work while committing only active task scope.
    - source: packages/core/src/broker/steward.ts
      target: tests/core/transactional-steward-single-write.test.ts
      reason: Shared-scope delivery must keep the neutral-steward canonical writer invariant.
  parallelFrontierInputs:
    - ATM-GOV-0274
  validatorReferences:
    - node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts
    - node --strip-types tests/cli/work-admission-ticket-deferred-index-parity.test.ts
    - node --strip-types tests/core/transactional-steward-single-write.test.ts
    - node --strip-types tests/cli/parallel-proposal-lane-admission.test.ts
  phaseOwner: Claude-005
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/implementation/
  - tests/cli/pre-team-dual-captain-e2e.test.ts
  - tests/cli/work-admission-ticket-deferred-index-parity.test.ts
  - tests/core/transactional-steward-single-write.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/implementation/
  - tests/cli/pre-team-dual-captain-e2e.test.ts
validators:
  - node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts
  - node --strip-types tests/cli/work-admission-ticket-deferred-index-parity.test.ts
  - node --strip-types tests/core/transactional-steward-single-write.test.ts
  - node --strip-types tests/cli/parallel-proposal-lane-admission.test.ts
errorCodes: []
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes:
    - Revert the git-governance commit adapter changes.
    - Rerun the four causal validators to prove foreign staged and unstaged preservation behavior.
atomizationImpact:
  ownerAtomOrMap: atm.work-coordination-authority
  mapUpdates:
    - atomic_workbench/atoms/ATM-GOV-0001/atom.spec.json
    - atomic_workbench/atoms/ATM-GOV-0001/atom.source.mjs
    - atomic_workbench/atoms/ATM-GOV-0001/atom.test.ts
  extractionCandidates:
    - atom: atm.work-coordination-authority
      pattern: Commit Adapter / Neutral Steward Facade
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: follow-up-card
      inlineReason: null
createdByCommand: atm plan card create
completed_at: "2026-07-30T09:07:07.965Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-30T09:07:07.965Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-30T09-07-07-965Z-close-73622e859215"
lastTransitionAt: "2026-07-30T09:07:07.965Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2ddfd007a19fc6db1bfc32406a8622974f1e03a3"
---

# ATM-GOV-0275 Preserve foreign work during dual-captain governed commit

## Intent

Close the second pre-Plan 3.2 dual-captain readiness gap. In the real
dual-captain fixture, governed commit currently fails while foreign staged and
foreign unstaged work exists. The active task commit must be able to proceed
without consuming, unstaging, overwriting, or normalizing another captain's
work.

This card keeps shared physical write authority with the governed commit adapter
and neutral-steward invariants. It must not create a second commit policy or
fall back to raw Git.

## Acceptance

- [ ] `--auto-stage --defer-foreign-staged` commits only active task scope.
- [ ] Foreign staged blob identity remains byte-identical and remains staged.
- [ ] Foreign unstaged content remains byte-identical and remains dirty.
- [ ] Active task deliverable is included in the governed commit.
- [ ] `tests/cli/pre-team-dual-captain-e2e.test.ts` passes.
- [ ] `tests/cli/work-admission-ticket-deferred-index-parity.test.ts` passes.
- [ ] `tests/core/transactional-steward-single-write.test.ts` passes.
- [ ] `tests/cli/parallel-proposal-lane-admission.test.ts` passes.

## Dispatch

Assigned captain: Claude-005.

Do not modify `ATM-GOV-0274` primary files. If claim ownership behavior blocks
this card, report the dependency to Captain instead of expanding scope.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T07:35:12.664Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0275-preserve-foreign-work-during-dual-captain-governed-commit.task.md","contentDigest":"sha256:b88715e715e13272f1da459a6b9e55f6c66de0080d3faf3d317cbc5f30538e45"} -->
