---
task_id: ATM-GOV-0394
title: Guarantee dry-run purity across every lifecycle branch
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - A governed commit dry-run created a real commit because the branch it fell through to never evaluated the flag.
  changedPublicSeams:
    - governed-commit-dry-run-contract
  causalImpactEdges:
    - dry-run-flag -> lifecycle-branch-selection -> repository-mutation
    - unauthorized-dry-run-mutation -> explicit-fail-closed-refusal
  parallelFrontierInputs:
    - ATM-GOV-0370 and ATM-GOV-0391 publication work is unrelated and must not be touched
  validatorReferences:
    - tests/cli/git-commit-task-scoped-staging.test.ts
    - npm run typecheck
  phaseOwner: Wave-1-framework-foundation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
validators:
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - npm run typecheck
testContributions:
  - caseId: dry_run_never_mutates_on_any_lifecycle_branch_0394
    targetGroupId: null
    semanticKey: dry-run-is-pure-on-every-branch
    coversAcceptance: [ACC-1, ACC-2, ACC-4]
    coversImpactEdges: [dry-run-flag -> lifecycle-branch-selection -> repository-mutation]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: governed-commit-dry-run-contract
    resourceKey: null
    expectedRedPredicate: a dry-run invocation that matches no live claim reaches the commit executor and advances HEAD
  - caseId: dry_run_without_authority_fails_closed_0394
    targetGroupId: null
    semanticKey: authorityless-dry-run-is-refused-not-executed
    coversAcceptance: [ACC-3]
    coversImpactEdges: [unauthorized-dry-run-mutation -> explicit-fail-closed-refusal]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: governed-commit-dry-run-contract
    resourceKey: null
    expectedRedPredicate: an invocation with no resolvable claim reports a commit result instead of naming the missing authority
requiredTestCaseIds:
  - dry_run_never_mutates_on_any_lifecycle_branch_0394
  - dry_run_without_authority_fails_closed_0394
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-commit
  mapUpdates: []
  extractionCandidates:
    - atom: atm.git-governance-commit
      pattern: Guard Clause
      source: packages/cli/src/commands/git-governance/implementation/commit-command.ts
      disposition: inline
      inlineReason: The repair is to evaluate one existing flag before branch selection rather than to add a second commit authority.
errorCodes: []
outOfScope:
  - release
  - templates
nonGoals:
  - Changing which claims authorize a commit. This card changes only whether --dry-run can mutate, never who may commit.
  - Repairing the closed-task residue that exposed the defect; that is ATM-GOV-0395.
createdByCommand: atm plan card create
completed_at: "2026-08-20T17:18:50.163Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-20T17:18:50.163Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-20T17-18-50-163Z-close-9a55a861e7f6"
lastTransitionAt: "2026-08-20T17:18:50.163Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "81a7d6619f1ed74c13e0373febba79488de68424"
---

# ATM-GOV-0394 Guarantee dry-run purity across every lifecycle branch

## Intent

`--dry-run` is the flag an operator uses to look before acting. It must be
inert on every path, or it is worse than absent: an operator who cannot trust
a preview will stop previewing.

`packages/cli/src/commands/git-governance/implementation/commit-command.ts`
evaluates the flag inside two branch-local guards rather than once, before the
branches are chosen. The task-scoped branch returns early at line 200 under a
plain `if (options.dryRun)`. The framework-claim branch returns early at line
365, but only under `options.dryRun && options.autoStage`. An invocation that
matches neither branch — no live task claim, no live framework claim — reaches
the commit executor, which never asks about the flag at all, and commits.

Observed on 2026-08-14: `node atm.mjs git commit --actor claude-008 --task
ATM-GOV-0392 --auto-stage --dry-run --json` was run after ATM-GOV-0392 had
closed and its claim had been released. It returned `ATM_GIT_COMMIT_OK` and
advanced HEAD to `60ced0732`. Earlier invocations of the same command in the
same session, while the claim was live, honoured the flag correctly and
returned `ATM_GIT_COMMIT_BUNDLE_DRY_RUN`. The commit's contents happened to be
correct and no damage resulted, which is precisely why this must be fixed by
contract rather than by inspection: the next occurrence will not be lucky.

The repair is general. Do not add a third branch, do not special-case the
closed-task state, and do not name a task id or actor. Decide purity once, from
the flag, before authority resolution selects a path; every branch inherits it.

## Design direction

Two properties must hold together, and neither implies the other:

1. A dry-run mutates nothing — not HEAD, index, worktree, ledger, lease
   consumption, or receipts — regardless of which branch resolution selects,
   including a resolution that selects none.
2. An invocation with no resolvable authority is refused with a code naming the
   missing authority. It must not be silently downgraded into "a dry-run that
   did nothing", because an operator cannot distinguish that from success.

The second property is what makes the first safe: without it, the fix could be
read as "commit quietly became a no-op", which is a different false green.

## Acceptance

- [ ] ACC-1: A `--dry-run` invocation leaves HEAD, the index, the worktree,
  the task ledger, emergency lease consumption counts, and evidence receipts
  byte-identical, on every lifecycle branch — task-claimed, framework-claimed,
  and unresolved — and with and without `--auto-stage`.
- [ ] ACC-2: Purity is decided from the flag before branch selection, so a
  future branch cannot reintroduce the gap by omitting a local guard. No test
  or implementation names a task id, actor, file path, or closed-state check.
- [ ] ACC-3: An invocation whose authority resolves to no branch fails closed
  with an error code naming the missing claim, rather than committing or
  reporting an empty success.
- [ ] ACC-4: `dry_run_never_mutates_on_any_lifecycle_branch_0394` is red before
  the fix against the reproduction above and green after; `60ced0732` is cited
  in the test as the observed regression.

## Evidence and rollback

Record the red run, the green run, the commit SHA of the repair, and a
before/after `git rev-parse HEAD` around a dry-run on each branch.

Rollback is a single revert of the delivery commit; it restores the previous
branch-local guards. Nothing depends on the new guard's position.

## Emergency policy

Use the normal governed lane. If the frozen runner's own bootstrap circularity
blocks the commit, the narrowest official emergency lease is authorized under
the owner ruling of 2026-08-15, on these conditions: reproducible diagnosis and
focused tests are preserved first; the lease commits only this card's validated
bundle; no foreign staged or dirty bytes are touched; the lease is revoked
immediately after use and the root cause is recorded in the ATM backlog.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-15T00:53:41.781Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0394-guarantee-dry-run-purity-across-every-lifecycle-branch.task.md","contentDigest":"sha256:82151d2db46593acf060f60e320b97df6b4096fb07887e169521d1641082e773"} -->
