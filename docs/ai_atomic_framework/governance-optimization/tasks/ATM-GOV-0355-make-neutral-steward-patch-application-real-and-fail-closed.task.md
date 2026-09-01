---
task_id: ATM-GOV-0355
title: Make neutral steward patch application real and fail closed
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The neutral steward reports applied for patch proposals it never applied, and validate-brokered-write is red at origin/main.
  softRelations: [ATM-GOV-0330, ATM-GOV-0331, ATM-GOV-0354]
  changedPublicSeams: [atm.unifiedPatchApplication.v1]
  causalImpactEdges:
    - stub-patch-apply-to-false-steward-evidence
    - false-steward-evidence-to-shared-write-authority-loss
  parallelFrontierInputs: [patch-proposal, transactional-composition-plan, canonical-worktree]
  validatorReferences: [validate-brokered-write, validate-broker-steward, test_atm_gov_0355_unified_patch_application_is_real]
  phaseOwner: wave-4-evidence-engine-replacement
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/unified-patch.ts
  - packages/core/src/broker/steward-transactional-apply.ts
  - tests/cli/unified-patch-application.test.ts
deliverables:
  - packages/core/src/broker/unified-patch.ts
  - packages/core/src/broker/steward-transactional-apply.ts
  - tests/cli/unified-patch-application.test.ts
validators:
  - node --strip-types tests/cli/unified-patch-application.test.ts
  - node --strip-types scripts/validate-brokered-write.ts --mode validate
  - node --strip-types scripts/validate-broker-steward.ts --mode validate
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0355_unified_patch_application_is_real
    targetGroupId: null
    semanticKey: a_unified_diff_replaces_lines_in_place_instead_of_appending_additions
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [stub-patch-apply-to-false-steward-evidence]
    contributionResourceKey: unified-patch-application
    responsibility: task-required
    contractEdge: atm.unifiedPatchApplication.v1
    resourceKey: unified-patch-application
    expectedRedPredicate: applying a replacement hunk leaves the original line in place and appends the replacement to the end of the file
  - caseId: test_atm_gov_0355_patch_application_fails_closed
    targetGroupId: null
    semanticKey: a_patch_that_does_not_match_its_context_is_refused_not_silently_absorbed
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [false-steward-evidence-to-shared-write-authority-loss]
    contributionResourceKey: unified-patch-fail-closed
    responsibility: task-required
    contractEdge: atm.unifiedPatchApplication.v1
    resourceKey: unified-patch-fail-closed
    expectedRedPredicate: a hunk whose context does not match the file still reports success because the applier never inspects context
  - caseId: test_atm_gov_0355_boundary_bytes_preserved
    targetGroupId: null
    semanticKey: line_endings_and_trailing_newline_state_survive_a_steward_apply
    coversAcceptance: [ACC-4]
    coversImpactEdges: [stub-patch-apply-to-false-steward-evidence]
    contributionResourceKey: unified-patch-boundary-bytes
    responsibility: task-required
    contractEdge: atm.unifiedPatchApplication.v1
    resourceKey: unified-patch-boundary-bytes
    expectedRedPredicate: applying a patch rewrites line endings or adds a trailing newline the file did not have
  - caseId: test_atm_gov_0355_shipped_broker_validators_green
    targetGroupId: null
    semanticKey: the_two_broker_write_validators_pass_with_unchanged_fixtures
    coversAcceptance: [ACC-5]
    coversImpactEdges: [false-steward-evidence-to-shared-write-authority-loss]
    contributionResourceKey: unified-patch-broker-validators
    responsibility: task-required
    contractEdge: atm.unifiedPatchApplication.v1
    resourceKey: unified-patch-broker-validators
    expectedRedPredicate: validate-brokered-write fails its disjoint-same-file scenario at current HEAD
requiredTestCaseIds:
  - test_atm_gov_0355_unified_patch_application_is_real
  - test_atm_gov_0355_patch_application_fails_closed
  - test_atm_gov_0355_boundary_bytes_preserved
  - test_atm_gov_0355_shipped_broker_validators_green
phaseTestCaseIds: [typecheck]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the applier and its single call site together. A steward that cannot apply a patch must block; it must never fall back to the appending behaviour this card removes.
atomizationImpact:
  ownerAtomOrMap: atm.broker-steward
  mapUpdates: []
  extractionCandidates:
    - atom: atm.unified-patch-application
      pattern: Pure Transform
      source: packages/core/src/broker/steward-transactional-apply.ts
      disposition: extract
      inlineReason: null
errorCodes: []
outOfScope:
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/compose.ts
  - scripts/validate-brokered-write.ts
nonGoals:
  - Adding fuzzy or offset-tolerant patch matching. A steward write is arbitrated, not guessed; an inexact patch must be refused.
  - Changing the compose or merge-plan verdicts. This card only makes the write the plan authorises actually happen.
---

# ATM-GOV-0355 Make neutral steward patch application real and fail closed

## Problem

`applyUnifiedPatch` in `packages/core/src/broker/steward-transactional-apply.ts`
is a stub:

```ts
const additions = patchText.split(/\r?\n/)
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .map((line) => line.slice(1));
if (additions.length === 0) return before;
return `${before}${suffix}${additions.join('\n')}\n`;
```

It ignores hunk headers, removed lines and context. It appends every added line
to the end of the file and cannot fail. `applyStewardPlan` therefore reports
`verdict: 'applied'` with before/after hashes for a write that did not happen as
specified.

Observed on the shipped `disjoint-same-file` fixture: two proposals replace
lines 1 and 3 of a three-line file. Compose returns `parallel-safe` with
`applyMethod: patch-apply`, apply returns `ok: true`, and the result is

```
export const alpha = 'alpha';
export const beta = 'beta';
export const gamma = 'gamma';
export const alpha = 'alpha-updated';
export const gamma = 'gamma-updated';
```

The originals survive and the replacements are appended, producing duplicate
declarations that would not compile. `validate-brokered-write` is red for this
exact reason and is correct to be.

This is not a cosmetic defect. INV-ATM-010 makes neutral-steward compose the
only sanctioned way to land a contended shared write, so every steward apply
receipt in the ledger currently attests to an application that never occurred —
the false-evidence shape this plan's Wave 4 exists to remove.

## Acceptance

- ACC-1 A unified diff that replaces lines produces exactly the file that `git
  apply` would produce: replaced in place, no surviving original, no appended
  duplicate. The shipped `disjoint-same-file` scenario reaches its declared
  `expected.fileAfter`.
- ACC-2 Multiple hunks in one patch, and multiple proposals composed onto one
  file, apply at their correct positions with later offsets accounted for.
- ACC-3 A hunk whose context or removed lines do not match the file at its
  declared position is refused. The refusal surfaces as a blocked steward apply
  with a reason, never as a silent success and never as an append.
- ACC-4 A patch that adds a file-final line, and a file with no trailing
  newline, are both handled without corrupting the surrounding bytes.
- ACC-5 `validate-brokered-write` and `validate-broker-steward` pass with their
  fixtures unchanged.

## Notes for the implementer

Extract the applier as a pure transform in its own module and give it one
contract: return the exact resulting text, or throw. Do not add a fallback
path — the appending behaviour being removed here is precisely what let a
failed application look successful, and any "best effort" branch reintroduces
it under a new name.

Do not reach for fuzzy matching. A steward write is arbitrated, not guessed: if
a proposal's context no longer matches the base it was authored against, the
correct outcome is a blocked apply that sends the proposal back for rebase.

Preserve the file's existing line ending and trailing-newline state. The
composer feeds the output straight into canonical writes, so a normalisation
here would show up as an unrelated whole-file diff in someone else's commit.
