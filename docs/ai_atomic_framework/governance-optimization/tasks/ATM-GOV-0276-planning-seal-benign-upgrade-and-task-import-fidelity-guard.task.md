---
task_id: ATM-GOV-0276
title: Planning seal benign upgrade and task import fidelity guard
status: done
owner: unassigned
assignee: Claude-005
priority: P0
amendment_epoch: 1
depends_on:
  - ATM-GOV-0274
  - ATM-GOV-0275
causalGraph:
  causalDependencies:
    - ATM-GOV-0274
    - ATM-GOV-0275
  startConditions:
    - ATM-GOV-0269 claim is blocked by ATM_PLANNING_SOURCE_IDENTITY_DRIFT after the external planning card changed from untracked to committed while contentDigest stayed identical.
    - ATM-GOV-0269 has failed-claim reserve/promote residue and must not be used for live dual-captain overlap testing until this card lands.
  softRelations:
    - ATM-GOV-0269
    - ATM-BUG-2026-07-30-275
    - ATM-BUG-2026-07-30-276
  changedPublicSeams:
    - atm.planningSourceSeal.v1
    - atm.tasksImportFrontmatterContract.v1
    - atm.claimLifecyclePreflightTransaction.v1
  causalImpactEdges:
    - source: packages/cli/src/commands/tasks/import-task.ts
      target: tests/cli/planning-source-seal.test.ts
      reason: planningCommitSha null to committed sha with identical contentDigest must be a benign seal upgrade, not source drift.
    - source: packages/cli/src/commands/tasks/task-import-validators.ts
      target: tests/cli/task-import-diagnostic-contract.test.ts
      reason: machine-readable task frontmatter such as causalGraph and test-id/exam-authority fields must round-trip or fail closed instead of silently dropping fields.
    - source: packages/cli/src/commands/tasks/claim-orchestrator.ts
      target: tests/cli/tasks-reserve-planning-precheck.test.ts
      reason: claim seal validation must occur before reserve/promote/owner ledger mutation or be transactionally rolled back on failure.
  parallelFrontierInputs:
    - Claude report for ATM-GOV-0269 claim failure on 2026-07-30T10:18:39Z.
    - Deep-module readiness fingerprint deep-module-review:9433b14b.
  validatorReferences:
    - node --strip-types tests/cli/planning-source-seal.test.ts
    - node --strip-types tests/cli/task-import-diagnostic-contract.test.ts
    - node --strip-types tests/cli/tasks-reserve-planning-precheck.test.ts
    - npm run typecheck
  phaseOwner: Claude-005
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/import-task.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/task-card-writer.ts
  - atomic_workbench/atoms/ATM-GOV-0001/atom.spec.json
  - atomic_workbench/atoms/ATM-GOV-0001/atom.source.mjs
  - atomic_workbench/atoms/ATM-GOV-0001/atom.test.ts
  - tests/cli/planning-source-seal.test.ts
  - tests/cli/task-import-diagnostic-contract.test.ts
  - tests/cli/tasks-reserve-planning-precheck.test.ts
deliverables:
  - packages/cli/src/commands/tasks/import-task.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - atomic_workbench/atoms/ATM-GOV-0001/atom.spec.json
  - atomic_workbench/atoms/ATM-GOV-0001/atom.source.mjs
  - atomic_workbench/atoms/ATM-GOV-0001/atom.test.ts
  - tests/cli/planning-source-seal.test.ts
  - tests/cli/task-import-diagnostic-contract.test.ts
  - tests/cli/tasks-reserve-planning-precheck.test.ts
validators:
  - node --strip-types tests/cli/planning-source-seal.test.ts
  - node --strip-types tests/cli/task-import-diagnostic-contract.test.ts
  - node --strip-types tests/cli/tasks-reserve-planning-precheck.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes:
    - Revert the planning seal classifier, import fidelity parser, and claim lifecycle transaction changes together.
    - If any temporary 0269 residue cleanup is needed, perform it through a separate governed TMP repair card; this card must not raw-reset 0269 state.
atomizationImpact:
  ownerAtomOrMap: atm.work-coordination-authority
  mapUpdates:
    - atomic_workbench/atoms/ATM-GOV-0001/atom.spec.json
    - atomic_workbench/atoms/ATM-GOV-0001/atom.source.mjs
    - atomic_workbench/atoms/ATM-GOV-0001/atom.test.ts
  extractionCandidates:
    - atom: atm.planning-source-seal-policy
      pattern: Policy Object / Result Contract
      source: packages/cli/src/commands/tasks/import-task.ts
      disposition: extract
      inlineReason: null
    - atom: atm.task-frontmatter-fidelity
      pattern: Parser Facade / Fidelity Contract
      source: packages/cli/src/commands/tasks/task-import-validators.ts
      disposition: extract
      inlineReason: null
    - atom: atm.claim-lifecycle-preflight-transaction
      pattern: Transaction Coordinator
      source: packages/cli/src/commands/tasks/claim-orchestrator.ts
      disposition: follow-up-card
      inlineReason: null
createdByCommand: atm plan card create
completed_at: "2026-07-30T17:45:04.962Z"
completed_by_agent: "claude-006"
closedAt: "2026-07-30T17:45:04.962Z"
closedByActor: "claude-006"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-30T17-45-04-962Z-close-9b80946edfca"
lastTransitionAt: "2026-07-30T17:45:04.962Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e5754637228fd496abcbea3a17e730cd3988e062"
---

# ATM-GOV-0276 Planning seal benign upgrade and task import fidelity guard

## Intent

Unblock ATM-GOV-0269 and the Plan 3.2 dual-captain rollout by making planning
source identity, task-card import fidelity, and claim-time ledger mutation obey
one fail-closed authority.

The observed blocker is not a real planning amendment: the external 3KLife task
card was imported while untracked, then committed later. Its `contentDigest`
remained identical, but the sealed `planningCommitSha` moved from `null` to a
real commit. ATM currently treats that as `ATM_PLANNING_SOURCE_IDENTITY_DRIFT`,
forcing operators toward either a lossy `tasks import --force` path or a false
`amendment_epoch` workaround.

This card must implement the product fix, not a task-id exception.

## Deep-module contract

Public seams:

- `planningSourceSeal` classifies source identity as unchanged, governed
  amendment, benign seal upgrade, or blocking drift.
- `tasks import` preserves machine-readable task-card fields such as
  `causalGraph` and fails closed when a declared governance field cannot be
  represented.
- `next --claim` performs source-seal validation before reserve/promote/owner
  mutation, or rolls back those lifecycle writes atomically on failure.

Deletion test: deleting these seams would push seal identity rules, parser
fidelity rules, and claim transaction ordering back into ad hoc adapter code.

## Acceptance

- [ ] A task imported from an untracked planning card can later be claimed after
      the same card is committed, when `contentDigest` is unchanged and the only
      identity delta is `planningCommitSha: null -> <sha>`.
- [ ] The benign seal upgrade is recorded as explicit evidence/result metadata;
      it must not require `amendment_epoch` and must not be reported as
      `governed-amendment`.
- [ ] `tasks import --dry-run` and `tasks import --write` preserve
      `causalGraph` from frontmatter, including `softRelations`,
      `changedPublicSeams`, `causalImpactEdges`, `parallelFrontierInputs`,
      `validatorReferences`, and `phaseOwner`.
- [ ] `tasks import --dry-run` and `tasks import --write` also preserve
      Plan 4.0 exam-contract fields when present, including
      `testContributions`, `requiredTestCaseIds`, `advisoryTestCaseIds`,
      `phaseTestCaseIds`, and future exam-authority metadata. Dropping these
      fields while preserving only `validatorReferences` is a fidelity failure.
- [ ] If an unsupported machine-readable frontmatter field would be dropped by
      import, the command fails closed with a diagnostic instead of silently
      writing a reduced ledger record.
- [ ] A failed claim source-seal check leaves no reserve/promote/owner mutation
      in `.atm/history/tasks/<task>.json` and creates no lifecycle event files;
      or, if lifecycle writes are unavoidable, rollback evidence restores the
      pre-claim ledger state.
- [ ] Regression coverage reproduces the ATM-GOV-0269 failure shape without
      hard-coding ATM-GOV-0269, the 3KLife local path, or the observed commit
      SHA.
- [ ] `node --strip-types tests/cli/planning-source-seal.test.ts` passes.
- [ ] `node --strip-types tests/cli/task-import-diagnostic-contract.test.ts`
      passes.
- [ ] `node --strip-types tests/cli/tasks-reserve-planning-precheck.test.ts`
      passes.
- [ ] `npm run typecheck` passes.

## Dispatch

Assigned captain: Claude-005.

Do not continue ATM-GOV-0269 implementation until this card is delivered and
imported into the target ledger. Do not use `tasks import --force` or
`amendment_epoch` as a workaround for the 0269 blocker.

The implementation should favor extracting small policy/fidelity modules over
adding more inline branches to `task-import-validators.ts`, which is already
over the 600-line review budget.

## Owner amendment 2026-07-30

Owner clarified that Plan 3.2 already owns validator execution economy, but
Plan 4.0 will rely on task cards as the sealed exam contract. Therefore this
card's import-fidelity work must preserve test case id ranges and
exam-authority metadata, not only `causalGraph`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T12:01:12.574Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0276-planning-seal-benign-upgrade-and-task-import-fidelity-guard.task.md","contentDigest":"sha256:4457268da91b63e6e6361111168099954cda199f30019028b98c02b960bc7ad7"} -->
