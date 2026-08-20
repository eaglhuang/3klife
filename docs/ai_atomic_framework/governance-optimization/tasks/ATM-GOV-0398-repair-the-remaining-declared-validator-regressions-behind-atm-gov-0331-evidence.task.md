---
task_id: ATM-GOV-0398
title: Repair the remaining declared validator regressions behind ATM-GOV-0331 evidence
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - ATM-GOV-0331 is already done; its historical evidence recorded two declared validators red and must not be rewritten as never-red
    - npm run validate:governance-commands fails on takeover live-claim-state drift
    - npm run validate:taskflow-close-atomicity fails on ATM_TASKFLOW_PRECLOSE_SCOPE_TRACKED_DIRTY for close-owned tracked delivery dirty
  softRelations:
    - ATM-GOV-0331 historical evidence remains the reproduction record, not a live green certificate
    - ATM-GOV-0397 owns cross-task mutation and commit-failure index restore; overlapping files require broker resolve
  changedPublicSeams:
    - tasks-takeover-live-claim-state
    - taskflow-close-owned-non-runner-delivery-dirty-admission
  causalImpactEdges:
    - takeover-successor-live-authority -> claim-state-active-and-takeover-in-transition-evidence
    - close-owned-non-runner-tracked-delivery-dirty -> not-preclose-scope-tracked-dirty-blocker
    - accepted-publication-plus-runner-affecting-dirty -> keep-preclose-scope-tracked-dirty
    - two-declared-validators-now-green -> distinct-from-0331-historical-red-evidence
  parallelFrontierInputs:
    - ATM-GOV-0397 must not share-write the same files; broker resolve on overlap
    - ATM-GOV-0341 remains claimed elsewhere and must not be closed or rewritten
    - Do not build, enqueue, or runner-publish; joint publication with 0397 comes later
  validatorReferences:
    - npm run validate:governance-commands
    - npm run validate:taskflow-close-atomicity
    - node --strip-types packages/cli/src/commands/taskflow/__tests__/close-owned-delivery-dirty-admission.spec.ts
    - node --strip-types packages/cli/src/commands/tasks/__tests__/takeover-successor-live-claim-state.spec.ts
  phaseOwner: Wave-1-framework-foundation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-governance-commands/implementation.ts
  - packages/cli/src/commands/taskflow/close-owned-delivery-dirty-admission.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/__tests__/close-owned-delivery-dirty-admission.spec.ts
  - packages/cli/src/commands/tasks/__tests__/takeover-successor-live-claim-state.spec.ts
deliverables:
  - scripts/validate-governance-commands/implementation.ts
  - packages/cli/src/commands/taskflow/close-owned-delivery-dirty-admission.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/__tests__/close-owned-delivery-dirty-admission.spec.ts
  - packages/cli/src/commands/tasks/__tests__/takeover-successor-live-claim-state.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/tasks/__tests__/takeover-successor-live-claim-state.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/close-owned-delivery-dirty-admission.spec.ts
  - npm run validate:governance-commands
  - npm run validate:taskflow-close-atomicity
testContributions:
  - caseId: takeover_successor_claim_state_is_live_active_0398
    targetGroupId: null
    semanticKey: takeover-live-claim-state
    coversAcceptance: [ACC-1]
    coversImpactEdges: [takeover-successor-live-authority -> claim-state-active-and-takeover-in-transition-evidence]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: tasks-takeover-live-claim-state
    resourceKey: null
    expectedRedPredicate: governance-commands asserts claim.state === taken_over after a successful takeover
  - caseId: close_owned_non_runner_tracked_delivery_dirty_is_not_preclose_blocker_0398
    targetGroupId: null
    semanticKey: close-owned-delivery-dirty-admission
    coversAcceptance: [ACC-2]
    coversImpactEdges: [close-owned-non-runner-tracked-delivery-dirty -> not-preclose-scope-tracked-dirty-blocker]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: taskflow-close-owned-non-runner-delivery-dirty-admission
    resourceKey: null
    expectedRedPredicate: tracked in-scope non-runner delivery dirty that the close bundle already owns still emits ATM_TASKFLOW_PRECLOSE_SCOPE_TRACKED_DIRTY
  - caseId: runner_affecting_tracked_dirty_keeps_preclose_blocker_0398
    targetGroupId: null
    semanticKey: runner-affecting-dirty-remains-blocked
    coversAcceptance: [ACC-3]
    coversImpactEdges: [accepted-publication-plus-runner-affecting-dirty -> keep-preclose-scope-tracked-dirty]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: taskflow-close-owned-non-runner-delivery-dirty-admission
    resourceKey: null
    expectedRedPredicate: runner-affecting tracked dirty is admitted as close-owned payload and drops ATM_TASKFLOW_PRECLOSE_SCOPE_TRACKED_DIRTY
  - caseId: declared_validators_green_tuple_distinct_from_0331_history_0398
    targetGroupId: null
    semanticKey: current-green-is-not-historical-rewrite
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [two-declared-validators-now-green -> distinct-from-0331-historical-red-evidence]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: tasks-takeover-live-claim-state
    resourceKey: null
    expectedRedPredicate: a green validator run is written back onto ATM-GOV-0331 historical evidence as if it had never been red
requiredTestCaseIds:
  - takeover_successor_claim_state_is_live_active_0398
  - close_owned_non_runner_tracked_delivery_dirty_is_not_preclose_blocker_0398
  - runner_affecting_tracked_dirty_keeps_preclose_blocker_0398
  - declared_validators_green_tuple_distinct_from_0331_history_0398
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
errorCodes:
  - ATM_TASKFLOW_PRECLOSE_SCOPE_TRACKED_DIRTY
outOfScope:
  - release
  - templates
  - Reopening or rewriting ATM-GOV-0331 ledger or historical evidence as never-red
  - Runner build, runner-sync enqueue, or joint publication
nonGoals:
  - Special-casing ATM-GOV-0331, any task id, actor, or live filename
  - Putting taken_over back into live claim.state
  - Treating timeout or retry as pass
  - Formal close or runner publication of this card
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-preflight
  mapUpdates: []
  extractionCandidates:
    - atom: atm.taskflow-close-owned-delivery-dirty-admission
      pattern: Policy Object
      source: packages/cli/src/commands/taskflow/close-owned-delivery-dirty-admission.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
completed_at: "2026-08-20T17:21:19.369Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-20T17:21:19.369Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-20T17-21-19-369Z-close-e3e1e2cd539e"
lastTransitionAt: "2026-08-20T17:21:19.369Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4c802207ff4ca5d1446581be1962855329a46875"
---

# ATM-GOV-0398 Repair the remaining declared validator regressions behind ATM-GOV-0331 evidence

## Intent

ATM-GOV-0331 is already done. Do not reopen it. Repair the two remaining declared-validator regressions that its evidence recorded, as two work packages on different public seams. Keep 0331 historical red evidence distinct from a later green run of the same commands.

## Diagnosis (do not merge the packages)

These are not one root cause. They do not share one public seam.

### WP-A — `tasks-takeover-live-claim-state`

- Command: `npm run validate:governance-commands`
- Failure: `tasks takeover must persist taken_over claim state`
- Product: takeover constructs a live successor claim (`claim.state === 'active'`). `taken_over` belongs in transition/evidence history because consumers treat only `active` as live authority.
- Repair: make the declared validator observe that live-authority contract (active successor claim + takeover recorded in transition/evidence). Do not put a non-live state on the successor claim just to satisfy the old assertion.

### WP-B — `taskflow-close-owned-non-runner-delivery-dirty-admission`

- Command: `npm run validate:taskflow-close-atomicity`
- Failure code: `ATM_TASKFLOW_PRECLOSE_SCOPE_TRACKED_DIRTY`
- Minimal case: tracked in-scope deliverable is dirty; `taskflow close --write` should commit it inside the close transaction (`commitTaskflowDeliveryFiles`), not fail closed before write.
- Contrast that must stay red: runner-affecting tracked dirty remains a preclose blocker so close cannot swallow an uncommitted runner rebuild.
- Untracked new deliverables already take the delivery-commit path; this package repairs the tracked-modification hole.
- Keep `historical-close-preflight.ts` out of this card's touched set (it already exceeds the 600-line claim budget). Own the admission policy in a new module and apply it from `close-preflight.ts`.

## Required Work

1. Focused red/green for each package before claiming the original declared validators green.
2. No special cases on ATM-GOV-0331, task ids, actors, or live filenames.
3. Record each original declared validator with command, exit code, output digest, artifact, observed time, and source SHA. That SHA is the repair HEAD, not a rewrite of 0331 history.
4. Source commit only. Do not build, enqueue, formal-close, or publish the runner.

## Acceptance

- [ ] ACC-1: After takeover, successor `claim.state` is `active`, ownership is transferred, and takeover is recorded in transition id and/or evidence. `npm run validate:governance-commands` exits 0.
- [ ] ACC-2: Close-owned non-runner tracked delivery dirty is not `ATM_TASKFLOW_PRECLOSE_SCOPE_TRACKED_DIRTY`. `taskflow close --write` remains atomic for that payload. `npm run validate:taskflow-close-atomicity` exits 0.
- [ ] ACC-3: Runner-affecting tracked dirty still emits `ATM_TASKFLOW_PRECLOSE_SCOPE_TRACKED_DIRTY`.
- [ ] ACC-4: Each original declared validator has a command-backed tuple (command, exit code 0, output digest, artifact, observed time, source SHA). 0331 historical evidence is not rewritten as never-red.
- [ ] ACC-5: No build, enqueue, formal close, or runner publication from this card.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-15T13:49:29.680Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0398-repair-the-remaining-declared-validator-regressions-behind-atm-gov-0331-evidence.task.md","contentDigest":"sha256:13bcd7b6c51e036315b2252c3c409e61e6cd34bd2aa94f1898fd898d805a023f"} -->
