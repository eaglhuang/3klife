---
task_id: ATM-GOV-0357
title: Land validator contract subject resolver deliverables
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The validator contract subject resolver is verified green but unattributed because its original card lost its planning creation seal.
  softRelations: [ATM-GOV-0354, ATM-GOV-0356]
  changedPublicSeams: [atm.validatorContractSubject.v1]
  causalImpactEdges: [module-split-to-contract-anchor-false-red]
  parallelFrontierInputs: [validator-envelope-library]
  validatorReferences: [validate-branch-commit-queue, validate-bridge-minor]
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
  - caseId: test_atm_gov_0357_contract_subject_resolver_landed
    targetGroupId: null
    semanticKey: contract_anchors_resolve_from_the_owning_surface_and_fail_closed_when_absent
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [module-split-to-contract-anchor-false-red]
    contributionResourceKey: validator-contract-subject-landing
    responsibility: task-required
    contractEdge: atm.validatorContractSubject.v1
    resourceKey: validator-contract-subject-landing
    expectedRedPredicate: the resolver and its regression test exist only in the working tree, so neither validator repair is reproducible from HEAD
requiredTestCaseIds:
  - test_atm_gov_0357_contract_subject_resolver_landed
phaseTestCaseIds: [typecheck]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the resolver with both consumers. Widening a subject must never be used to make a genuinely deleted contract look present.
atomizationImpact:
  ownerAtomOrMap: atm.validator-envelope
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - packages/cli/src/commands/git-governance/**
nonGoals:
  - Re-litigating the anchor decisions already made and verified under ATM-GOV-0354.
---

# ATM-GOV-0357 Land validator contract subject resolver deliverables

## Problem

The contract subject resolver and its two consumers are verified green but exist
only in the working tree. Their original card, ATM-GOV-0354, was rewritten in a
way that dropped its atmPlanningCreationSeal footer, so its content digest no
longer matches the sealed ledger record and re-import needs an emergency lease
that is unavailable. The work itself is unaffected by that clerical fault.

## Acceptance

- ACC-1 The resolver, both repaired validators and the regression test are
  reachable from HEAD, and validate-branch-commit-queue and validate-bridge-minor
  pass with their token lists unweakened.
- ACC-2 A missing or empty contract subject still fails closed rather than
  satisfying every anchor through an empty string.

## Notes for the implementer

Nothing to design. The decisions were made and evidenced under ATM-GOV-0354;
this card exists only to give that work a clean planning identity so it can land.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T05:30:04.075Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0357-land-validator-contract-subject-resolver-deliverables.task.md","contentDigest":"sha256:0ea64ed24f1c78ba7b9a1e6ccb2e001e68772893df00a0357e0ec8e224112647"} -->
