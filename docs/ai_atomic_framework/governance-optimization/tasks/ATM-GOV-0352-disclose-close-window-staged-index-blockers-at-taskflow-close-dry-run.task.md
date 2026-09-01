---
task_id: ATM-GOV-0352
title: Disclose close-window staged-index blockers at taskflow close dry-run
status: planned
owner: unassigned
priority: P1
depends_on: []
causalGraph:
  startConditions:
    - A governed close runs while paths outside the task's own close bundle sit in the shared index.
  softRelations: [TASK-CID-0080, ATM-GOV-0344, ATM-GOV-0348, ATM-GOV-0350, ATM-GOV-0351]
  changedPublicSeams: [atm.closeWindowStagedIndexAdmission.v1]
  causalImpactEdges:
    - close-window-staged-index-state-to-write-readiness-disclosure
    - undisclosed-blocker-to-partially-applied-close-attempt
  parallelFrontierInputs: [canonical-git-index, close-window-staged-index-lock, taskflow-preview-commit-bundle]
  validatorReferences: [test_atm_gov_0352_close_window_dryrun_disclosure]
  phaseOwner: wave-3-validator-and-lifecycle-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/close-window-staged-index-admission.ts
  - packages/cli/src/commands/tasks/close-window-lock.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/__tests__/dryrun/close-window-staged-index-disclosure.spec.ts
deliverables:
  - packages/cli/src/commands/tasks/close-window-staged-index-admission.ts
  - packages/cli/src/commands/tasks/close-window-lock.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/__tests__/dryrun/close-window-staged-index-disclosure.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/dryrun/close-window-staged-index-disclosure.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-window-lock.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0352_close_window_dryrun_disclosure
    targetGroupId: null
    semanticKey: close_window_staged_index_blockers_are_disclosed_before_write
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges:
      - close-window-staged-index-state-to-write-readiness-disclosure
      - undisclosed-blocker-to-partially-applied-close-attempt
    contributionResourceKey: taskflow-close-window-dryrun-disclosure
    responsibility: task-required
    contractEdge: atm.closeWindowStagedIndexAdmission.v1
    resourceKey: taskflow-close-window-dryrun-disclosure
    expectedRedPredicate: taskflow close --dry-run reports zero blockers for an index state whose --write attempt is refused with ATM_CLOSE_WINDOW_FOREIGN_STAGED_TASKS
  - caseId: test_atm_gov_0352_dryrun_disclosure_is_non_mutating
    targetGroupId: null
    semanticKey: close_window_disclosure_never_touches_index_lock_or_snapshot
    coversAcceptance: [ACC-4]
    coversImpactEdges: [close-window-staged-index-state-to-write-readiness-disclosure]
    contributionResourceKey: taskflow-close-window-dryrun-purity
    responsibility: task-required
    contractEdge: atm.closeWindowStagedIndexAdmission.v1
    resourceKey: taskflow-close-window-dryrun-purity
    expectedRedPredicate: the close-window verdict is only reachable through the acquiring path, so evaluating it writes a lock record and can defer foreign staged entries
  - caseId: test_atm_gov_0352_acquire_refusal_parity
    targetGroupId: null
    semanticKey: acquire_time_refusal_survives_the_shared_predicate
    coversAcceptance: [ACC-5]
    coversImpactEdges: [undisclosed-blocker-to-partially-applied-close-attempt]
    contributionResourceKey: taskflow-close-window-acquire-parity
    responsibility: task-required
    contractEdge: atm.closeWindowStagedIndexAdmission.v1
    resourceKey: taskflow-close-window-acquire-parity
    expectedRedPredicate: the acquire path owns its own inline verdict, so nothing proves disclosure and refusal read the same rule
requiredTestCaseIds:
  - test_atm_gov_0352_close_window_dryrun_disclosure
  - test_atm_gov_0352_dryrun_disclosure_is_non_mutating
  - test_atm_gov_0352_acquire_refusal_parity
phaseTestCaseIds: [typecheck, validate:cli]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the shared admission predicate together with both consumers. The write path must stay fail-closed and authoritative; never resolve a regression here by relaxing the acquire-time refusal.
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-write-readiness
  mapUpdates: []
  extractionCandidates:
    - atom: atm.close-window-staged-index-admission
      pattern: Policy Object
      source: packages/cli/src/commands/tasks/close-window-lock.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_CLOSE_WINDOW_FOREIGN_STAGED_TASKS
    disposition: reuse
    category: task-close
    trigger: staged entries outside the governed close bundle are present and deferral was not requested
    retryable: false
  - code: ATM_CLOSE_WINDOW_STAGED_INDEX_LOCKED
    disposition: reuse
    category: task-close
    trigger: another task holds the active close-window staged-index lock
    retryable: true
outOfScope:
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/git-governance/**
nonGoals:
  - Making dry-run mutate anything. Disclosure must stay a pure read of index and lock state.
  - Weakening or removing the acquire-time refusal. The write path stays the authority; dry-run only stops hiding what it will decide.
  - Turning the disclosure into a guarantee. Index state can change between preview and write, and the blocker is advisory in exactly that window.
---

# ATM-GOV-0352 Disclose close-window staged-index blockers at taskflow close dry-run

## Problem

`taskflow close --dry-run` reports a clean, zero-blocker preview and then
`taskflow close --write`, run immediately afterwards with identical arguments
and an unchanged index, refuses with `ATM_CLOSE_WINDOW_FOREIGN_STAGED_TASKS`.

The cause is structural, not incidental. `runTaskflowClose` assembles the
`writeReadinessHint` blocker list from write-readiness, stale-runner, and
historical-preflight sources
(`packages/cli/src/commands/taskflow/implementation.ts`), and that hint is the
entire dry-run disclosure surface. The close-window staged-index admission is
evaluated somewhere else entirely: `acquireCloseWindowStagedIndexLock` is only
reached inside the `if (writeRequested && writeSupport.allowed)` branch, after
the preview has already been returned. Dry-run therefore never asks the
question at all.

Nothing about that check needs write mode. Its three inputs are all resolved
earlier in the same function:

- `expectedCloseWindowStageFiles`, derived from `previewCommitBundle`, which
  dry-run already builds;
- `readStagedFiles(cwd)`, a pure read;
- the existing close-window lock record, also a pure read.

`ATM_CLOSE_WINDOW_STAGED_INDEX_LOCKED` — another lane holding the active
close-window lock — is undisclosed for the same reason and belongs to the same
blocker class.

This is a gap in the contract TASK-CID-0080 established: dry-run must disclose
the predictable blockers the write path will later enforce. That card promoted
active-claim, historical-delivery, and waiver blockers. The close-window
staged-index class was never covered, so the parity contract holds everywhere
except here.

The cost is not only a wasted invocation. The write path performs real work
before it reaches the refusal — `deferGovernanceDirtyFiles` runs first — so an
operator who trusted the preview lands mid-transaction and is then pushed
toward index surgery to make progress. That is the same operator-coercion
shape ATM-GOV-0348 corrected in the commit path.

## Observed

2026-08-12, closing ATM-GOV-0348. Same task, same actor, same claim, seconds
apart, no intervening index change:

- `taskflow close --task ATM-GOV-0348 --actor claude-008-gov-0348 --dry-run`
  → `ok: true`, zero blockers.
- `taskflow close --task ATM-GOV-0348 --actor claude-008-gov-0348 --write`
  → `ATM_CLOSE_WINDOW_FOREIGN_STAGED_TASKS`.

Progress required `--defer-foreign-state`, which the preview had given no
reason to expect.

Same family as `ATM-BUG-2026-08-09-008` (close readiness and override issuer
disagreeing about staged-index ownership) and ATM-GOV-0348 (a gate judging a
surface wider than the transaction it governs).

## Acceptance

- ACC-1 With staged entries outside the governed close bundle and no deferral
  flag, `taskflow close --dry-run` reports a blocker carrying
  `ATM_CLOSE_WINDOW_FOREIGN_STAGED_TASKS`, the offending paths, and the
  deferral `requiredCommand` — the same verdict `--write` would reach.
- ACC-2 An active close-window staged-index lock held by another task is
  likewise disclosed at dry-run as `ATM_CLOSE_WINDOW_STAGED_INDEX_LOCKED`.
- ACC-3 When the index is clean, or when the deferral flag is supplied, dry-run
  adds no close-window blocker and the previous preview outcome is unchanged.
- ACC-4 Dry-run performs no mutation: index entries, the lock file, and any
  foreign staged snapshot are byte-identical before and after a disclosing
  dry-run.
- ACC-5 `acquireCloseWindowStagedIndexLock` keeps refusing exactly as it does
  today. Disclosure must not become permission; both paths read one predicate,
  and the write path remains authoritative.

## Notes for the implementer

Extract the decision, not the effect. `acquireCloseWindowStagedIndexLock`
currently interleaves a pure verdict (existing lock, unexpected staged files,
deferral) with side effects (writing the lock record, deferring foreign staged
entries). Lift only the verdict into
`close-window-staged-index-admission.ts` as a Policy Object returning a small
result contract, then have the acquire path consume it and write-readiness
consume it too. Two call sites, one predicate — a second copy of this rule in
the readiness layer would drift back apart within a wave.

Preview and write observe the index at different instants, and in write mode
the delivery commit happens after the lock is taken. Perfect equality is not
achievable and must not be claimed; the contract is that dry-run discloses the
verdict for the state it observed. State that boundary in the hint text rather
than implying a guarantee.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-12T12:23:39.210Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0352-disclose-close-window-staged-index-blockers-at-taskflow-close-dry-run.task.md","contentDigest":"sha256:6df2e0b4d170d0d7fdfbff90f26143bb328b249c8ba66984c441ac25ba1f94d5"} -->
