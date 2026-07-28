---
task_id: ATM-GOV-0260
title: Staged candidate line-budget and nested commit recovery
status: done
owner: atm-governance
priority: P0
milestone: ATM-3.1-R0.12
severity: P0
depends_on:
  - ATM-GOV-0255
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 shared-write governance and transactional commit behavior. This is not a standalone error-governance card: exact error-code registry updates are required, but the product fix is the governed commit candidate, line-budget, and recovery path."
scopePaths:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
  - packages/cli/src/commands/git.ts
  - packages/cli/src/commands/command-specs/git.spec.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - docs/governance/error-code-registry.json
  - tests/cli/git-commit-staged-line-budget-isolation.test.ts
  - tests/cli/git-commit-nested-failure-recovery.test.ts
  - tests/cli/dirty-release-wip-recovery-0258.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
  - packages/cli/src/commands/git.ts
  - packages/cli/src/commands/command-specs/git.spec.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - docs/governance/error-code-registry.json
  - tests/cli/git-commit-staged-line-budget-isolation.test.ts
  - tests/cli/git-commit-nested-failure-recovery.test.ts
validators:
  - node --strip-types tests/cli/git-commit-staged-line-budget-isolation.test.ts
  - node --strip-types tests/cli/git-commit-nested-failure-recovery.test.ts
  - node --strip-types tests/cli/dirty-release-wip-recovery-0258.test.ts
  - node --strip-types tests/cli/claim-foreign-unstaged-wip.test.ts
  - npm run validate:cli
  - npm run typecheck
errorCodes:
  - ATM_GIT_COMMIT_FAILED
  - ATM_TOUCHED_PHYSICAL_LINE_BUDGET_BLOCKED
  - ATM_GIT_COMMIT_CANDIDATE_LINE_BUDGET_BLOCKED
evidence:
  required: gemini-0258-line-budget-counterexample-replay
rollback:
  strategy: revert-commit-and-retain-existing-commit-gates
  notes: "Rollback must restore conservative line-budget blocking, but cannot hide nested commit failure diagnostics or remove exact error-code registry coverage without a follow-up regression entry."
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-commit-candidate
  mapUpdates: []
  extractionCandidates:
    - atom: atm.commit-candidate-line-budget-policy
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/commit-scope-policy.ts
      disposition: extract
    - atom: atm.git-commit-nested-failure-recovery
      pattern: Recovery Reporter
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: follow-up-card
createdByCommand: atm plan card create
completed_at: "2026-07-23T02:55:46.205Z"
completed_by_agent: "cursor-002-plan31-captain"
closedAt: "2026-07-23T02:55:46.205Z"
closedByActor: "cursor-002-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-23T02-55-45-988Z-close-cefe473d6018"
lastTransitionAt: "2026-07-23T02:55:46.205Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "37c752f44aaee0e819c70975aa4f5d83e71ea676"
---

# ATM-GOV-0260 Staged candidate line-budget and nested commit recovery

## Intent

Fix the Plan 3.1 dogfood blocker exposed while retrying `ATM-GOV-0258` after
Codex rebuilt the formatter-contaminated patch into a minimal semantic diff.
Gemini 3.6 staged exactly the intended nine-file delivery candidate and all
focused validators passed, but governed commit still failed with wrapper code
`ATM_GIT_COMMIT_FAILED`; the attempt file revealed
`ATM_TOUCHED_PHYSICAL_LINE_BUDGET_BLOCKED`.

The observed failure means the commit line-budget gate is counting dirty
worktree residue outside the staged delivery candidate. In a real parallel
worktree, unrelated uncommitted WIP from another lane must not prevent a small,
correctly staged, in-scope delivery candidate from entering the governed commit
queue. Whole-worktree dirty state may remain advisory or trigger separate
foreign-WIP gates, but the physical line budget that decides whether this
commit is too large must be based on the commit candidate being submitted.

Dependency note: `ATM-GOV-0260` is intentionally not blocked by `ATM-GOV-0258`
or `ATM-GOV-0259`. It exists to unblock the 0258 retry path and to provide
evidence later consumed by 0259 / the Plan 3.1 final verdict. Treat 0258 and
0259 as replay/verification context, not claim-admission prerequisites.

This card also makes nested commit failures operator-actionable. A captain
should not need to inspect `.atm/runtime/git-commit-attempts/**` manually to
discover the true root cause, and exact recurring codes must be registered in
the error-code registry.

2026-07-23 escalation: the Gemini 0258 owner attempted the planned
source-first WIP park route with `node atm.dev.mjs tasks release --wip-commit`.
The source runner recognized the new release option, but the inner Git
pre-commit hook still invoked the frozen `node atm.mjs hook pre-commit`, whose
older hook implementation did not recognize `ATM_COMMIT_WIP=1`; the WIP park
therefore failed again with nested `ATM_TOUCHED_PHYSICAL_LINE_BUDGET_BLOCKED`.
This proves 0260 must cover both the explicit governed commit command and the
hook pre-commit path. Source-first recovery is not complete if a frozen hook can
reapply the stale line-budget policy during the inner commit.

## Acceptance

- [ ] Governed commit line-budget calculation is based on the staged commit
  candidate or ATM's explicit commit candidate file set, not unrelated
  unstaged dirty files from other lanes.
- [ ] Unstaged foreign or unowned dirty WIP can still be reported by the dirty
  WIP gates, but it does not inflate the physical line count of an otherwise
  precise staged delivery commit.
- [ ] `ATM_GIT_COMMIT_FAILED` surfaces the nested root cause from the commit
  attempt record in the top-level JSON response, including exact nested code,
  summary, attempt path, affected files or numstat when available, and the
  smallest safe next action.
- [ ] Commit wrapper dry-run, real wrapper execution, and pre-commit hook consume the same candidate/ownership/residue policy; a dry-run pass followed by hook-only foreign-residue failure reproduces `ATM-BUG-2026-07-13-162` and must fail parity tests.
- [ ] Exact registry entries exist for `ATM_GIT_COMMIT_FAILED` and
  `ATM_TOUCHED_PHYSICAL_LINE_BUDGET_BLOCKED`; if a new candidate-specific code
  is introduced, `ATM_GIT_COMMIT_CANDIDATE_LINE_BUDGET_BLOCKED` is also
  registered with retryability, approval requirements, recovery command shape,
  source owner, and focused tests.
- [ ] The Gemini 0258 counterexample is replayed: a small staged 0258 candidate
  is committed or admitted past line-budget while large unrelated unstaged
  formatter/residue WIP remains visible in the worktree.
- [ ] If the staged candidate itself exceeds the physical line budget, ATM
  fail-closes with the exact line-budget code and emits a recoveryCommand or
  copyable split/minimal-patch guidance; retrying the same command without
  changing the candidate must not be presented as meaningful recovery.
- [ ] `git commit-status` or an equivalent status command accepts the same
  actor/task context and reports the latest failed attempt without returning a
  usage error.
- [ ] No native git fallback, stash, restore, temp worktree, or branch is
  required for the normal recovery path.
- [ ] `ATM-GOV-0258` can retry its existing minimal delivery commit after this
  card lands, without cleaning Cursor 0257 WIP or unrelated runner-sync receipt
  residue first.
- [ ] Source-first WIP recovery cannot be re-blocked by a stale frozen
  pre-commit hook: when `tasks release --wip-commit` or `git commit --wip`
  sets `ATM_COMMIT_WIP=1`, the hook path either honors the WIP bypass policy or
  delegates to the same candidate-scoped line-budget policy used by governed
  commit.
- [ ] The replay includes the frozen-hook self-hosting deadlock: `atm.dev.mjs`
  starts the recovery command, inner Git invokes `atm.mjs hook pre-commit`, and
  the result no longer fails merely because the hook inspected whole-worktree
  dirty lines instead of the WIP/candidate commit set.
- [ ] Plan 3.1 final verdict cannot claim autonomous high-coupling parallel
  development until this replay has command-backed evidence.
- [ ] Delivery evidence gives terminal dispositions to `ATM-BUG-2026-07-22-230` and `ATM-BUG-2026-07-22-233`; stale frozen-hook bootstrap is tested as a generalized source/frozen policy mismatch, not a Gemini/task-specific exception.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T15:57:17.783Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0260-staged-candidate-line-budget-and-nested-commit-recovery.task.md","contentDigest":"sha256:f8371f59734be01070270c6327496bfa8015031572554f0c66c3ecaa16dcbee1"} -->
