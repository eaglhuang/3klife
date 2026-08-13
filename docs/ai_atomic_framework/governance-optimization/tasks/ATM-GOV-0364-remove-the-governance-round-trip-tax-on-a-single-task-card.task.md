---
task_id: ATM-GOV-0364
title: Remove the governance round-trip tax on a single task card
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - A scope amendment can authorise an edit that the delivery bundle will never carry, and the forced re-import used to work around it discards the claim that authorised the work.
  softRelations: [ATM-GOV-0352, ATM-GOV-0360, ATM-GOV-0363]
  changedPublicSeams: [atm.scopeAmendment.v1, atm.commandSpecOutput.v1]
  causalImpactEdges:
    - scope-amendment-not-reaching-delivery-bundle
    - import-refresh-erasing-its-own-claim
    - help-returning-the-whole-namespace
  parallelFrontierInputs: [scope-amendment-lane, task-import-lane, cli-help]
  validatorReferences: [governance-round-trip-cost, tasks-scope-amendment, tasks-import]
  phaseOwner: governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/shared/command-spec-output.ts
  - tests/cli/governance-round-trip-cost.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-007.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-008.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-009.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-010.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-011.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-012.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-12-001.json
deliverables:
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/shared/command-spec-output.ts
  - tests/cli/governance-round-trip-cost.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-007.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-008.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-009.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-010.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-011.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-012.json
validators:
  - node --strip-types tests/cli/governance-round-trip-cost.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0364_scope_amendment_reaches_the_delivery_bundle
    targetGroupId: null
    semanticKey: an_amended_scope_path_can_actually_be_delivered
    coversAcceptance: [ACC-1]
    coversImpactEdges: [scope-amendment-not-reaching-delivery-bundle]
    contributionResourceKey: governance-round-trip-scope
    responsibility: task-required
    contractEdge: atm.scopeAmendment.v1
    resourceKey: governance-round-trip-scope
    expectedRedPredicate: tasks scope add reports success but the added path is excluded from the governed commit bundle because the bundle reads ledger scopePaths
  - caseId: test_atm_gov_0364_import_refresh_preserves_its_own_claim
    targetGroupId: null
    semanticKey: refreshing_a_ledger_record_does_not_silently_release_the_claim
    coversAcceptance: [ACC-2]
    coversImpactEdges: [import-refresh-erasing-its-own-claim]
    contributionResourceKey: governance-round-trip-import
    responsibility: task-required
    contractEdge: atm.scopeAmendment.v1
    resourceKey: governance-round-trip-import
    expectedRedPredicate: a live claim whose record does not parse cleanly is read as no claim at all and is dropped by tasks import --force without --force-overwrite-claims
  - caseId: test_atm_gov_0364_help_is_scoped_to_the_subcommand
    targetGroupId: null
    semanticKey: subcommand_help_lists_that_subcommands_flags
    coversAcceptance: [ACC-3]
    coversImpactEdges: [help-returning-the-whole-namespace]
    contributionResourceKey: governance-round-trip-help
    responsibility: task-required
    contractEdge: atm.commandSpecOutput.v1
    resourceKey: governance-round-trip-help
    expectedRedPredicate: tasks import --help returns every flag in the tasks namespace, so the caller cannot tell which ones the subcommand accepts
  - caseId: test_atm_gov_0364_withdrawn_findings_stay_withdrawn
    targetGroupId: null
    semanticKey: a_backlog_item_withdrawn_as_an_observation_error_is_not_silently_reopened
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [scope-amendment-not-reaching-delivery-bundle]
    contributionResourceKey: governance-round-trip-withdrawn
    responsibility: task-required
    contractEdge: atm.commandSpecOutput.v1
    resourceKey: governance-round-trip-withdrawn
    expectedRedPredicate: pre-close discloses its blockers in batches and a delivery commit expires card validator evidence, as this card originally asserted
requiredTestCaseIds:
  - test_atm_gov_0364_scope_amendment_reaches_the_delivery_bundle
  - test_atm_gov_0364_import_refresh_preserves_its_own_claim
  - test_atm_gov_0364_help_is_scoped_to_the_subcommand
  - test_atm_gov_0364_withdrawn_findings_stay_withdrawn
phaseTestCaseIds: [typecheck]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert per seam. None of these may be rolled back by weakening a check, only by restoring the extra round trip.
atomizationImpact:
  ownerAtomOrMap: atm.governance-lifecycle
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - packages/cli/src/commands/tasks/close-window-staged-index-admission.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
  - packages/cli/src/commands/evidence/command-runs.ts
  - .atm/charter/**
nonGoals:
  - Weakening any gate. Every check named here must still refuse exactly what it refuses today; only how many round trips it takes to learn that changes.
  - Reworking close-time index isolation. That is the sealed-candidate-index family and is tracked separately.
  - Changing pre-close disclosure or evidence freshness. Both were investigated and found correct as built; see ACC-4.
createdByCommand: atm plan card create
completed_at: "2026-08-13T16:29:19.921Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-13T16:29:19.921Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T16-29-19-921Z-close-b59017884b29"
lastTransitionAt: "2026-08-13T16:29:19.921Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7846949e6584ad54041eb24b2017f1819549e427"
---

# ATM-GOV-0364 Remove the governance round-trip tax on a single task card

## Problem

Landing ATM-GOV-0360 — one compiler hardened, one script added, two tests
rewritten — took roughly twice as many governed round trips as the engineering
inside it. Investigating why produced five candidate defects. Three survived
verification. Two did not, and the two that did not are the more useful finding.

### What is actually broken

**A scope amendment does not reach the delivery bundle.** `tasks scope add`
extends the direction lock's `allowedFiles` and the claim's `files`, but not the
ledger's `scopePaths`, and the governed commit bundle resolves from
`scopePaths`. The amended path is therefore authorised for editing and then
silently excluded from the commit. Reproduced cleanly on this card:
`scope add --write` returned `ATM_SCOPE_AMENDMENT_APPLIED`, and the immediately
following `git commit --auto-stage --dry-run` sealed a four-entry bundle
containing only governance records — the amended path was absent. The workaround
is `tasks import --force`, a protected surface needing an emergency lease.

**A forced re-import drops a live claim.** `writeTaskFiles` does preserve claims
across `--force`, but only when `parseClaimRecord` returns a fully-formed record.
A claim that is live but whose record does not parse cleanly reads as no claim at
all, so the preservation branch never runs, the ledger is rewritten to `planned`,
and the runtime lock is left orphaned — the next `next --claim` fails with
`ATM_LOCK_CONFLICT` and needs `tasks repair-claim --write` first. On
ATM-GOV-0360 this chain ran twice. Whether a record parses is a question about
its shape; whether it is someone's live hold is a question about its state, and
only the second may decide whether `--force` discards it.

**Help returns the whole namespace.** `tasks import --help` lists every flag
registered for `tasks`, roughly ninety of them, spanning claim, close, audit,
scope, queue, roster and mirror. Finding that the flag is `--from` and not
`--task` or `--card` cost two failed invocations and one very large response.

### What was not broken

Two of the original five findings were the author's error, not the system's,
and are recorded as withdrawn rather than quietly dropped.

**Pre-close does disclose everything at once.** The first pre-close run returned
four blockers, the fourth being `staleEvidence` with the exact list
`['validate:cli','validate:git-head-evidence']`. It looked batched only because
the response was read through a 3000-character truncation, so the last two
blockers were never seen.

**A delivery commit does not expire card evidence.** `staleEvidence` was that
same repo-level pair on every run across two commits. The four card validators
recorded before the first commit were never reported stale; re-recording them
was the author's inference, not the system's requirement.

Both are worth keeping visible. Truncating a governance response and then
reasoning about what is missing produces a confident, wrong conclusion, and it
is a cheaper mistake to make than either of the real defects above.

## Tracked backlog items

Each finding has its own entry so it can be resolved and later monitored for
regression independently. Closing this card means setting each open entry to
Resolved with the commit that fixed it; a Resolved entry whose focused test has
since gone red is the regression signal.

| Backlog | Finding | Status | Acceptance |
| --- | --- | --- | --- |
| ATM-BUG-2026-08-13-007 | scope amendment never reaches the delivery bundle | Open | ACC-1 |
| ATM-BUG-2026-08-13-008 | `import --force` drops a live claim | Open | ACC-2 |
| ATM-BUG-2026-08-13-011 | subcommand help returns the whole namespace | Open | ACC-3 |
| ATM-BUG-2026-08-13-009 | pre-close batches disclosure | Withdrawn | ACC-4 |
| ATM-BUG-2026-08-13-010 | commit expires card evidence | Withdrawn | ACC-4 |
| ATM-BUG-2026-08-13-012 | stage-override cannot express a staged deletion | Open, not this card | — |

007 and 008 compound: 007 forces the `import --force` that 008 punishes. 012 is
carried here as a file only; it belongs to the sealed-candidate-index family
with ATM-GOV-0352, and this card is merely where it was discovered.

## Acceptance

- ACC-1 A path added by `tasks scope add` appears in the governed delivery
  bundle for that task with no further command. The direction lock and the
  ledger must agree; which one the bundle reads is an implementation choice.
- ACC-2 `tasks import --force` preserves an existing claim and task status
  unless `--force-overwrite-claims` is passed, and does so based on the claim's
  state rather than on whether its record parses cleanly. When it does displace
  a claim, the existing displacement event is still written.
- ACC-3 `<command> <subcommand> --help` lists the flags that subcommand accepts.
  A flag belonging only to a sibling subcommand does not appear. Where a
  subcommand has not yet declared its flags, help says so rather than silently
  returning everything.
- ACC-4 The two withdrawn findings stay withdrawn: a focused test asserts that
  one pre-close call carries the complete blocker list, and that evidence for a
  validator whose subject a commit did not touch survives that commit. These
  guard the behaviour that was found correct.
- ACC-5 Every tracked backlog entry above is left in a state that matches
  reality — Resolved with its fixing commit, or Withdrawn with the reason —
  and each names the focused test that will report a regression.

## Implementation boundary

Fix each defect where it is decided, not at the call site. Do not add a fast
path, a bypass flag, or a "skip prerequisite" escape: the point is that
satisfying the gates becomes cheap, never that fewer gates run.

Close-time index isolation, pre-close disclosure and evidence freshness are all
explicitly out of scope — the first belongs to another family, and the other two
were investigated and found correct.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T14:05:54.398Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0364-remove-the-governance-round-trip-tax-on-a-single-task-card.task.md","contentDigest":"sha256:2fe38dfd4a5eded595126d6be713cb380e2875f9bb1beb51852a3fe1dc4285f1"} -->
