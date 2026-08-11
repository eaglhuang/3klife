---
task_id: ATM-GOV-0346
title: Stabilize validate-skew-matrix timeout boundary and CI facade closure
status: done
owner: claude-captain
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - Worker identity and a governed write-intent claim are active.
  softRelations:
    - ATM-GOV-0345 runner publication work is independent and out of scope.
  changedPublicSeams:
    - validator-facade-timeout-policy
    - standard-validator-ci-reliability
  causalImpactEdges:
    - skew-matrix-runtime-to-facade-timeout
    - timeout-result-to-fail-closed-ci-verdict
  parallelFrontierInputs:
    - Shared build, index, and release surfaces require their broker ticket.
  validatorReferences:
    - tests/cli/test-facade-timeout-policy.test.ts
    - tests/skew/skew-matrix.test.ts
  phaseOwner: ATM-GOV-0346
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:\\Users\\User\\3KLife\\docs\\ai_atomic_framework
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: local
scopePaths:
  - scripts/validate-test-facade.ts
  - scripts/validators.config.json
  - scripts/run-validators/implementation.ts
  - tests/cli/test-facade-timeout-policy.test.ts
  - tests/cli/validator-observed-lifecycle.test.ts
  - tests/cli/validator-run-resume-and-status.test.ts
  - tests/skew/skew-matrix.test.ts
  - .github/workflows/version-skew-matrix.yml
deliverables:
  - Data-driven timeout policy with measured slow-path envelope and explicit safety margin.
  - Full-facade regression proving a timeout stays fail-closed.
  - CI parity for the same policy and terminal verdict.
validators:
  - node --strip-types tests/cli/test-facade-timeout-policy.test.ts
  - node --strip-types tests/skew/skew-matrix.test.ts
  - node --strip-types scripts/validate-test-facade.ts --mode validate
  - node scripts/run-validators.ts standard --filter validate-skew-matrix --json
  - npm run validate:cli
testContributions:
  - caseId: test_facade_skew_timeout_policy_0346
    targetGroupId: null
    semanticKey: facade_skew_timeout_policy
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [skew-matrix-runtime-to-facade-timeout, timeout-result-to-fail-closed-ci-verdict]
    expectedRedPredicate: The unsafe timeout policy produces a terminal timeout under a deterministic slow-path fixture.
    contributionResourceKey: validator-runner
    responsibility: task-required
    dependencyEdge: null
    contractEdge: validator-facade-timeout-policy
    resourceKey: validator-runner
requiredTestCaseIds:
  - test_facade_skew_timeout_policy_0346
advisoryTestCaseIds:
  - validate-skew-matrix-observed-duration
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - test-contract-migration
evidence:
  required: command-backed
  verdictRule: Timeout must remain a nonzero, explicitly diagnosed failure; retry or ignored exit status cannot create pass.
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.validator-facade-timeout-policy
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-facade-timeout-policy
      pattern: Policy Object
      source: scripts/validate-test-facade.ts
      disposition: inline
      inlineReason: The facade remains the policy boundary unless evidence justifies a reusable extraction.
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-11T09:06:48.207Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-11T09:06:48.207Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-11T09-06-48-207Z-close-a90b34101423"
lastTransitionAt: "2026-08-11T09:06:48.207Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1b280685d9ed3508497f1c46d6f0211fbb0ca98a"
---

# ATM-GOV-0346 Stabilize validate-skew-matrix timeout boundary and CI facade closure

## Intent

Eliminate the false-green risk caused by `validate-skew-matrix` operating too
close to the facade hard timeout. The correction must be general, observable,
and fail-closed; it cannot depend on this card, a machine, an actor, or a date.

## Execution

1. Measure the skew validator alone and after the full facade's preceding
   workload. Derive timeout from the observed envelope plus an explicit margin.
2. Add a red/green focused regression; a genuine timeout must remain a terminal
   failure with diagnostics.
3. Align the CI version-skew surface to that same contract.
4. Preserve all unrelated WIP and rescue worktrees. Use ATM broker tickets for
   shared index, build, or release surfaces; no raw Git or private workaround.

## Acceptance

- [ ] ACC-1: One data-driven timeout contract has an evidence-backed margin.
- [ ] ACC-2: Full test facade is stable while forced timeout remains fail-closed.
- [ ] ACC-3: CI consumes the same contract without retry/downgrade-to-pass.
- [ ] ACC-4: Focused evidence is fresh for the delivery candidate.
- [ ] ACC-5: No incident-specific hard-coded rule exists.

## Stop rule

Stop and request broker/compose guidance for a real scope intersection. If the
timing envelope is not reproducible, report raw observations and propose a
general measurement mechanism rather than blindly inflating the timeout.

## Acceptance

- [ ] Deliverables and validators are filled before import or implementation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-10T12:11:11.612Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0346-stabilize-validate-skew-matrix-timeout-boundary-and-ci-facade-closure.task.md","contentDigest":"sha256:cb95ca1755894223090972caac19b2a06034440f87389fe961a3f9aa951a9f8b"} -->
