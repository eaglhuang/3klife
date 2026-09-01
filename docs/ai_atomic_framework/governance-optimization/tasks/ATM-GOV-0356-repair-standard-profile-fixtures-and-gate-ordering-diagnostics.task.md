---
task_id: ATM-GOV-0356
title: Repair standard profile fixtures and gate ordering diagnostics
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The standard validator profile is red across broker, hook, ledger and direction-lock fixtures that encode superseded contracts.
  softRelations: [ATM-GOV-0354, ATM-GOV-0355]
  changedPublicSeams: [atm.preToolGateOrdering.v1]
  causalImpactEdges:
    - generic-gate-ordering-to-lost-specific-diagnostic
    - superseded-fixture-contract-to-standard-profile-red
  parallelFrontierInputs: [pre-tool-hook, broker-decision, repair-closure-admission]
  validatorReferences: [validate-framework-development-governance, validate-broker-registry, validate-framework-hook-scope-filtering]
  phaseOwner: wave-3-validator-and-ci-baseline
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/integration-hooks/implementation.ts
  - packages/cli/src/commands/tasks/repairclose-orchestrator.ts
  - packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts
  - scripts/validate-broker-registry.ts
  - scripts/validate-framework-development-governance.ts
  - scripts/validate-framework-governance-repairs.ts
  - scripts/validate-task-direction-governance/adopter-core.ts
  - scripts/validators/task-ledger/suite-impl/implementation.ts
  - docs/multi-agent-compatibility-matrix.md
  - docs/governance/atm-bug-and-optimization-backlog.items
  - docs/governance/handoff-2026-08-13-captain-claude-008.md
deliverables:
  - packages/cli/src/commands/integration-hooks/implementation.ts
  - packages/cli/src/commands/tasks/repairclose-orchestrator.ts
  - packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts
  - scripts/validate-broker-registry.ts
  - scripts/validate-framework-development-governance.ts
  - scripts/validate-task-direction-governance/adopter-core.ts
  - scripts/validators/task-ledger/suite-impl/implementation.ts
validators:
  - node --strip-types scripts/validate-framework-development-governance.ts --mode validate
  - node --strip-types scripts/validate-broker-registry.ts --mode validate
  - node --strip-types scripts/validate-framework-hook-scope-filtering.ts --mode validate
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0356_specific_blocker_survives_the_generic_gate
    targetGroupId: null
    semanticKey: the_most_specific_refusal_code_is_reported_not_the_backstop
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [generic-gate-ordering-to-lost-specific-diagnostic]
    contributionResourceKey: pre-tool-gate-ordering
    responsibility: task-required
    contractEdge: atm.preToolGateOrdering.v1
    resourceKey: pre-tool-gate-ordering
    expectedRedPredicate: an out-of-scope or planning-mirror edit is refused with the generic work-admission code instead of the blocker that owns it
  - caseId: test_atm_gov_0356_repair_closure_carries_its_admission
    targetGroupId: null
    semanticKey: a_staged_closure_repair_can_always_reach_a_governed_commit
    coversAcceptance: [ACC-3]
    coversImpactEdges: [superseded-fixture-contract-to-standard-profile-red]
    contributionResourceKey: repair-closure-admission
    responsibility: task-required
    contractEdge: atm.preToolGateOrdering.v1
    resourceKey: repair-closure-admission
    expectedRedPredicate: repair-closure stages changes without minting the bridging work-admission ticket, so the follow-up commit fails with ATM_WRITE_TICKET_MISSING
  - caseId: test_atm_gov_0356_fixtures_assert_both_sides
    targetGroupId: null
    semanticKey: superseded_fixtures_are_rewritten_to_cover_the_current_rule_on_both_sides
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [superseded-fixture-contract-to-standard-profile-red]
    contributionResourceKey: standard-profile-fixture-currency
    responsibility: task-required
    contractEdge: atm.preToolGateOrdering.v1
    resourceKey: standard-profile-fixture-currency
    expectedRedPredicate: a fixture asserts only the pre-refinement outcome, so a documented narrowing reads as a regression
requiredTestCaseIds:
  - test_atm_gov_0356_specific_blocker_survives_the_generic_gate
  - test_atm_gov_0356_repair_closure_carries_its_admission
  - test_atm_gov_0356_fixtures_assert_both_sides
phaseTestCaseIds: [typecheck]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the gate ordering with its fixtures. No assertion here may be weakened to produce a green; every widened assertion added during diagnosis was reverted once the product fix landed.
atomizationImpact:
  ownerAtomOrMap: atm.integration-hooks
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - packages/core/src/broker/decision.ts
nonGoals:
  - Weakening any assertion to manufacture a green.
  - Resolving ATM-BUG-2026-08-13-004 or -005, which need owner-level adjudication.
---

# ATM-GOV-0356 Repair standard profile fixtures and gate ordering diagnostics

## Problem

The standard validator profile was red across twelve validators at origin/main.
Triage separated three genuine defects from fixtures that had fallen behind
contracts which had legitimately moved on.

The sharpest product defect: the pre-tool hook returned on the generic
work-admission ticket gate before reaching the specific scope guards, so
ATM_TOOL_SCOPE_DRIFT_BLOCKED, ATM_PLANNING_MIRROR_BLOCKED and the impersonation
block all collapsed into one ATM_WRITE_TICKET_SCOPE_VIOLATION. Every edit stayed
refused, so this was a diagnostic loss, but the operator lost the reason.

The second: tasks repair-closure skipped minting the work-admission ticket that
bridges a staged closure repair to its governed commit whenever no actor was
resolved, and it only resolved an actor when --actor was passed explicitly,
bypassing the ATM_ACTOR_ID fallback every other governed surface honours. The
repair therefore staged changes that no commit could ever accept, silently.

The third: validators that suppressed their own fixture output, so a failure
named no code at all and could not be triaged from its log.

## Acceptance

- ACC-1 A refusal carries the most specific code the system can justify; the
  ticket gate is a backstop, not a replacement.
- ACC-2 The reordering changes which code is reported, never whether an edit is
  allowed. Every branch involved is a deny either way.
- ACC-3 A repair-closure that stages changes always mints the bridging ticket,
  and fails closed when no actor can be resolved rather than staging changes
  that cannot be committed.
- ACC-4 Fixtures that encoded a superseded contract assert the current rule on
  both sides, never only the outcome that used to hold.
- ACC-5 Assertions report what they observed. A validator whose log cannot
  explain its own failure is not command-backed evidence.

## Notes for the implementer

Every widened assertion used during diagnosis was reverted to its strict form
once the product fix landed; the observed-codes diagnostics were kept.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T05:12:20.519Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0356-repair-standard-profile-fixtures-and-gate-ordering-diagnostics.task.md","contentDigest":"sha256:71dfb6523ddb4986871d630ab0864ff3e89a6e4912e81780e533ffb8456da19e"} -->
