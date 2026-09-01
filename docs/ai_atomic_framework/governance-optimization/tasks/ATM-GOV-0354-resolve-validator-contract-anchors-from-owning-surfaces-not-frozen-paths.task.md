---
task_id: ATM-GOV-0354
title: Resolve validator contract anchors from owning surfaces not frozen paths
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The standard validator profile is red because contract anchors are pinned to file paths and CI step labels that a legitimate refactor moved.
  softRelations: [ATM-GOV-0329, ATM-GOV-0331, ATM-GOV-0353]
  changedPublicSeams: [atm.validatorContractSubject.v1]
  causalImpactEdges:
    - module-split-to-contract-anchor-false-red
    - ci-step-rename-to-workflow-order-false-red
  parallelFrontierInputs: [validator-envelope-library, git-governance-module-tree, release-workflow]
  validatorReferences: [validate-branch-commit-queue, validate-bridge-minor, test_atm_gov_0354_contract_subject_follows_owning_surface]
  phaseOwner: wave-3-validator-and-ci-baseline
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/lib/validator-contract-subject.ts
  - scripts/validate-branch-commit-queue.ts
  - scripts/validate-bridge-minor.ts
  - tests/cli/validator-contract-subject.test.ts
deliverables:
  - scripts/lib/validator-contract-subject.ts
  - scripts/validate-branch-commit-queue.ts
  - scripts/validate-bridge-minor.ts
  - tests/cli/validator-contract-subject.test.ts
validators:
  - node --strip-types tests/cli/validator-contract-subject.test.ts
  - node --strip-types scripts/validate-branch-commit-queue.ts --mode validate
  - node --strip-types scripts/validate-bridge-minor.ts --mode validate
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0354_contract_subject_follows_owning_surface
    targetGroupId: null
    semanticKey: contract_anchors_survive_a_move_inside_the_owning_surface
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [module-split-to-contract-anchor-false-red]
    contributionResourceKey: validator-contract-subject
    responsibility: task-required
    contractEdge: atm.validatorContractSubject.v1
    resourceKey: validator-contract-subject
    expectedRedPredicate: moving a contract token to a sibling file inside the same owning module makes the anchor check fail even though the contract still holds
  - caseId: test_atm_gov_0354_missing_subject_fails_closed
    targetGroupId: null
    semanticKey: an_absent_or_empty_contract_subject_is_a_red_not_a_silent_pass
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [module-split-to-contract-anchor-false-red, ci-step-rename-to-workflow-order-false-red]
    contributionResourceKey: validator-contract-subject-fail-closed
    responsibility: task-required
    contractEdge: atm.validatorContractSubject.v1
    resourceKey: validator-contract-subject-fail-closed
    expectedRedPredicate: a missing subject path or an absent CI gate step is treated as satisfied because indexOf returns -1 or the read yields empty text
  - caseId: test_atm_gov_0354_both_validators_green_with_unchanged_tokens
    targetGroupId: null
    semanticKey: the_two_repaired_validators_pass_without_weakening_their_token_lists
    coversAcceptance: [ACC-5]
    coversImpactEdges: [module-split-to-contract-anchor-false-red, ci-step-rename-to-workflow-order-false-red]
    contributionResourceKey: validator-contract-subject-regression
    responsibility: task-required
    contractEdge: atm.validatorContractSubject.v1
    resourceKey: validator-contract-subject-regression
    expectedRedPredicate: validate-branch-commit-queue and validate-bridge-minor exit non-zero at current HEAD
requiredTestCaseIds:
  - test_atm_gov_0354_contract_subject_follows_owning_surface
  - test_atm_gov_0354_missing_subject_fails_closed
  - test_atm_gov_0354_both_validators_green_with_unchanged_tokens
phaseTestCaseIds: [typecheck]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the subject resolver together with both consumers. Widening a subject must never be used to make a genuinely deleted contract look present.
atomizationImpact:
  ownerAtomOrMap: atm.validator-envelope
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-contract-subject
      pattern: Result Contract Object
      source: scripts/validate-branch-commit-queue.ts
      disposition: extract
      inlineReason: null
errorCodes: []
outOfScope:
  - packages/cli/src/commands/git-governance/**
  - .github/workflows/**
nonGoals:
  - Relaxing what the anchors assert. Every token this card touches must still be required; only where it is looked for changes.
  - Fixing the other standard-profile failures. The hook, broker, and ledger reds are separate behaviours with their own owners.
---

# ATM-GOV-0354 Resolve validator contract anchors from owning surfaces not frozen paths

## Problem

Two validators in the `standard` profile are red for the same reason: they
assert a source contract against a hard-coded file list or CI step label, and a
legitimate refactor moved the subject without weakening the contract.

`validate-branch-commit-queue` builds its subject text from exactly two files:

```ts
const gitGovernanceSource = [
  read('packages/cli/src/commands/git-governance.ts'),
  read('packages/cli/src/commands/git-governance/implementation.ts')
].join('\n');
```

`ATM_GIT_COMMIT_BRANCH_QUEUE_BUSY` now lives in
`git-governance/implementation/branch-commit-window.ts` and
`git-governance/implementation/commit-execution.ts`; `implementation.ts` is a
939-byte barrel. The contract is intact — the validator is looking in the wrong
place, and reports `git-governance must keep the branch queue busy retry code`.

`validate-bridge-minor` asserts ordering by label:

```ts
assert(workflow.indexOf('Validate bridge minor policy') < workflow.indexOf('Compute gate standard'), ...)
```

`release-npm.yml` now runs `Compute gate full with resumable receipt`, so
`indexOf` returns `-1` and the comparison is false. The gate still runs before
the heavy validator step; only its name changed.

Both are the anti-pattern this plan's engineering method forbids: incident IDs,
paths and thresholds hard-coded into control flow (INV-ATM-009). The failure
mode is worse than noise — a validator that goes red for a rename teaches its
owners to stop believing it, and the same literal would go *green* if the code
were deleted and a comment happened to mention the token.

## Acceptance

- ACC-1 A contract token that moves to another file inside the same declared
  owning surface keeps `validate-branch-commit-queue` green, with no change to
  the token list.
- ACC-2 Deleting the token from the owning surface entirely still fails, with
  the same detail message.
- ACC-3 A declared subject path that does not exist, or that resolves to no
  readable source, fails closed and names the missing subject. It must never
  reduce to an empty string that satisfies every anchor.
- ACC-4 `validate-bridge-minor` asserts that the bridge-minor gate precedes the
  workflow's heavy validator gate whatever that step is called, and fails closed
  when no such step can be identified.
- ACC-5 Both validators pass at current HEAD and their token lists are
  unchanged.

## Notes for the implementer

Extract one subject resolver rather than patching both call sites. It takes
declared roots — a file or a directory — expands directories over source files,
and returns a result carrying both the concatenated text and the resolved file
list so a caller can report what it actually inspected. Returning the file list
is what makes ACC-3 checkable; a bare string cannot distinguish "no match" from
"nothing was read".

Scope the expansion to the owning module directory, not to `packages/`. The
point is to survive a move *within* the surface that owns the behaviour, not to
find the token anywhere in the repository. A token found in an unrelated module
is not evidence that this module still honours the contract.

For the workflow ordering, identify the heavy gate by what it runs — the
validator-profile command — rather than by its display name. Names are prose;
the command is the contract.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T01:09:11.707Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0354-resolve-validator-contract-anchors-from-owning-surfaces-not-frozen-paths.task.md","contentDigest":"sha256:16542d87da1f5bf8cd99e1d28d32202b9e8f2a3e7caae38ffce3d886fe31308d"} -->
