---
task_id: ATM-GOV-0397
title: Make cross-task mutation admission resolve terminal ownership canonically and restore index atomically on failure
status: abandoned
superseded_by: ATM-GOV-0369
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - A task's history files stay permanently blocked by their own filename once the task has ever existed, so a terminal task's generated residue has no governed writer.
    - A refused governed commit leaves part of what it staged behind, so a failed admission is not a no-op.
  changedPublicSeams:
    - cross-task-mutation-admission-terminal-ownership
    - governed-commit-failure-index-restoration
  causalImpactEdges:
    - history-filename-ownership -> admission-verdict -> terminal-residue-unwritable
    - admission-failure -> partial-index-rollback -> unowned-residue
  parallelFrontierInputs:
    - ATM-GOV-0395 lane-ownership repair is committed and verified live; this card is its downstream seam and must not re-open it
  validatorReferences:
    - packages/core/src/broker/__tests__/cross-task-mutation-terminal-ownership.spec.ts
    - npm run typecheck
  phaseOwner: Wave-1-framework-foundation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/cross-task-mutation-guard.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-attempt-boundary.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-terminal-ownership.spec.ts
  - tests/cli/git-commit-failure-index-restoration.test.ts
deliverables:
  - packages/core/src/broker/cross-task-mutation-guard.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-terminal-ownership.spec.ts
  - tests/cli/git-commit-failure-index-restoration.test.ts
validators:
  - node --strip-types packages/core/src/broker/__tests__/cross-task-mutation-terminal-ownership.spec.ts
  - npm run typecheck
testContributions:
  - caseId: terminal_history_ownership_resolves_through_lifecycle_0397
    targetGroupId: null
    semanticKey: history-ownership-is-a-lifecycle-fact
    coversAcceptance: [ACC-1, ACC-3]
    coversImpactEdges: [history-filename-ownership -> admission-verdict -> terminal-residue-unwritable]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: cross-task-mutation-admission-terminal-ownership
    resourceKey: null
    expectedRedPredicate: a done task whose claim and lock are both released still blocks mutation of its own history files, and the refusal calls it active without having checked
  - caseId: admission_failure_restores_index_exactly_0397
    targetGroupId: null
    semanticKey: a-refused-commit-is-a-no-op
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [admission-failure -> partial-index-rollback -> unowned-residue]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: governed-commit-failure-index-restoration
    resourceKey: null
    expectedRedPredicate: after a refused governed commit the index retains a staged entry the operation created, while an unchanged HEAD is reported as evidence of no residue
requiredTestCaseIds:
  - terminal_history_ownership_resolves_through_lifecycle_0397
  - admission_failure_restores_index_exactly_0397
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
atomizationImpact:
  ownerAtomOrMap: atm.cross-task-mutation-guard
  mapUpdates: []
  extractionCandidates:
    - atom: atm.cross-task-mutation-guard
      pattern: Policy Object
      source: packages/core/src/broker/cross-task-mutation-guard.ts
      disposition: inline
      inlineReason: The lifecycle authority already exists in this file as getActiveTasks; the repair is to route the task-history surface through it, not to add a second ownership resolver.
    - atom: atm.git-governance-commit
      pattern: Transaction Boundary
      source: packages/cli/src/commands/git-governance/implementation/commit-execution.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - ATM_CROSS_TASK_MUTATION_BLOCKED
outOfScope:
  - release
  - templates
nonGoals:
  - Hand-cleaning the two ATM-GOV-0392 residue records, or any per-file remedy. They are preserved reproduction evidence, not the deliverable.
  - Relaxing who may write. A terminal task's artifacts must become reachable to an entitled successor, not generally writable.
  - Re-opening ATM-GOV-0395. Its lane-ownership repair is committed and was verified live during this incident.
  - Any runner build, runner-sync enqueue, or release mirror write.
createdByCommand: atm plan card create
---

# ATM-GOV-0397 Make cross-task mutation admission resolve terminal ownership canonically and restore index atomically on failure

## Supersession disposition

This card was not independently claimed or implemented. Its two public-seam
contracts were incorporated into the amended ATM-GOV-0369 acceptance contract
and delivered there: terminal task-history admission now requires a live,
bounded reconciliation entitlement, and refused governed commits restore the
index from an exact blob snapshot. The terminal state is therefore
`abandoned`, rather than `done`: this card must not imply a separate delivery.
ATM-GOV-0369 is the authoritative delivery and evidence owner.

## Intent

Two defects on two adjacent public seams were observed in one governed operation.
They are one card because neither is safely fixable alone: repairing admission
without repairing the failure boundary leaves every future refusal shredding the
index, and repairing the failure boundary without repairing admission leaves the
refusal itself unreachable to fix.

### Seam 1 — admission resolves ownership from a filename, not from lifecycle

`detectCrossTaskMutation` already has a correct lifecycle authority:
`getActiveTasks` reads task status, `claim.state`, and runtime lock release, runs
`classifyTerminalLifecycleOwnership`, and deliberately excludes terminal records
because "a scope declaration is not write authority". The `task-history` surface
bypasses all of it. For any path under `.atm/history/{evidence,task-events,tasks}/`
it extracts a task id from the *filename*, and blocks whenever `isKnownTaskId`
is true and the id differs from the committing task. A task that has ever
existed therefore owns its history files permanently, regardless of status,
claim state, or lock state.

The message compounds this by asserting a fact the code never checked: it says
"files owned by **active** task X" for a task that admission never tested for
activity. The three recoveries it offers — handoff, release, repair-claim — have
no applicable object on a task that is already `done` with an already-`released`
claim and an already-`released` lock, so the refusal is unactionable by
construction.

The generalization is the point: **terminal ownership must be resolved through
the same canonical lifecycle authority as active ownership.** A filename is an
identifier, not an authority record.

### Seam 2 — a refused commit leaves a partially mutated index

The governed commit wrapper auto-staged both in-scope files, the pre-commit hook
refused, and the wrapper's `liveIndexResidueRollback` restored exactly one of
them. HEAD was correctly unchanged and correctly reported, but the index was
left in a state the operation created and did not own on exit — a staged
deletion that existed in neither the pre-operation state nor any committed
state. `headAdvancedDuringAttempt: false` was reported as if it were sufficient
evidence of no residue; it is not, because HEAD is only one of the three mutable
surfaces a commit attempt touches. This is INV-ATM-014 (operation-owned
transient artifact lifecycle) applied to the index.

## Acceptance

### ACC-1 Canonical ownership admission

- [ ] Cross-task mutation of files owned by a task with live write authority
      (active claim, or unreleased lock) stays fail-closed exactly as today.
- [ ] A `done` task whose claim and lock are both `released` is no longer
      treated as an active owner by the `task-history` surface. Ownership on
      that surface resolves through the same lifecycle authority
      (`getActiveTasks` / `classifyTerminalLifecycleOwnership`) that the
      `active-task-scope` surface already uses.
- [ ] A terminal task's artifacts are still not freely writable. Mutation is
      admitted only for a successor holding an explicit governed reconciliation
      entitlement; anything without one remains fail-closed.
- [ ] The refusal text and `details` state which authority was consulted and
      what it found, and never assert "active" for a task whose activity was not
      evaluated. Recovery commands offered must have an applicable object in the
      state being refused.
- [ ] No fix may key on a task id, a filename, a path glob, ATM-GOV-0392, or any
      other special case. The rule is stated over lifecycle state.

### ACC-2 Failure transactionality

- [ ] After any pre-commit or admission failure, the index is restored blob by
      blob to its exact pre-operation state.
- [ ] Restoration covers staged deletions, staged modifications, unstaged
      modifications, and foreign staged entries that the operation did not
      create — foreign entries must be preserved unchanged, never "restored"
      into someone else's work.
- [ ] Success is not claimed from an unchanged HEAD alone. The operation
      compares a full pre/post snapshot of index and worktree, and any residue
      it cannot restore is retained under a durable owner-bound recovery receipt
      rather than left unowned.

### ACC-3 Focused regressions

- [ ] Active owner (live claim) still blocks.
- [ ] Terminal/released claim with **no** reconciliation entitlement still blocks.
- [ ] Terminal/released claim **with** a valid reconciliation entitlement is admitted.
- [ ] The real ATM-GOV-0395 sequence, reproduced in an isolated fixture: a
      framework-mode claim over `.atm/history/evidence/<terminal-task>.*`
      followed by a governed commit.
- [ ] `git ls-files -s`, `git diff --cached`, and a worktree snapshot are byte
      identical before and after a forced admission failure.

All regressions build their own fixture repository. None may read, depend on, or
mutate the shared canonical worktree.

## Reproduction evidence

Preserved live at time of filing, and **not to be unstaged, restored, stashed,
or hand-edited**:

```
HEAD  3d01b963dbc1523ad75db90845660352790a78b3   (did not advance)
D  .atm/history/evidence/ATM-GOV-0392.bundle-manifest.json
 M .atm/history/evidence/ATM-GOV-0392.live-index-reconciliation.json
```

Refusal payload:

```json
{
  "code": "ATM_CROSS_TASK_MUTATION_BLOCKED",
  "taskId": "ATM-FRAMEWORK-TEMP-claude-008-lane-lane-20260815102038-claude-008-955b69ad0b",
  "conflictTaskId": "ATM-GOV-0392",
  "conflictFiles": [".atm/history/evidence/ATM-GOV-0392.live-index-reconciliation.json"],
  "recoveryLane": "Stop write-path work, inspect the named task owners, and use task handoff, release, or repair-claim before mutating these files."
}
```

Contradicting ledger facts, read at the same moment:

- `.atm/history/tasks/ATM-GOV-0392.json` — `status: done`, `claim.state: released`
- `.atm/runtime/locks/ATM-GOV-0392.lock.json` — `released: true`, `status: released`

Source anchors: `packages/core/src/broker/cross-task-mutation-guard.ts:243-255`
(task-history surface, filename-derived ownership) against the same file's
`getActiveTasks` at `:111-181` (the lifecycle authority it bypasses); refusal
raised at `packages/cli/src/commands/hook/pre-commit/implementation.ts:192-202`.
The partial rollback is reported as `liveIndexResidueRollback` by the governed
commit wrapper.

## Notes

The framework-temp claim identity
(`ATM-FRAMEWORK-TEMP-<actor>-lane-<lane>`) can never equal a card id, so under
the current rule no framework-mode claim can ever satisfy the `task-history`
surface for another task's history files. Any entitlement design must therefore
be expressed over the claim's declared scope and its governed linkage
(`linkedTaskId`), not over id equality.

ATM-GOV-0395 is a soft relation, not a dependency: its lane-ownership repair is
committed and was independently verified live during this incident (the
framework claim's on-disk lock carried its `laneSessionId` correctly). This card
is a distinct downstream seam.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-15T13:25:59.067Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0397-make-cross-task-mutation-admission-resolve-terminal-ownership-canonically-and-restore-index-atomically-on-failure.task.md","contentDigest":"sha256:39ddfbde6b783128266c74a17f9dd94926555588cbc17eb0431b713708c68b80"} -->
