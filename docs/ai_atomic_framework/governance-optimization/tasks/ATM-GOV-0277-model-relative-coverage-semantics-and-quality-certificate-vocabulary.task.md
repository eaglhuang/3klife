---
task_id: ATM-GOV-0277
title: Model-relative coverage semantics and quality certificate vocabulary
status: done
owner: unassigned
priority: P1
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0276
causalGraph:
  causalDependencies:
    - ATM-GOV-0276
  startConditions:
    - ATM-GOV-0276 is done so task import fidelity, planning seal upgrades, and claim atomicity are trustworthy enough for Plan 4.0 task cards.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - packages/core/src/evidence/validation-contract.ts
    - packages/core/src/evidence/validation-receipt.ts
  changedPublicSeams:
    - atm.coverageSemantics.v1
    - atm.qualityCertificateVocabulary.v1
  causalImpactEdges:
    - Plan 4.0 coverage claims -> model-relative assumptions and vocabulary
    - validation receipts -> quality certificate terminology
    - closure evidence -> explicit proven/sufficient/unknown distinction
  validatorReferences:
    - node --strip-types tests/cli/plan4-coverage-semantics.test.ts
    - npm run typecheck
  phaseOwner: plan4-foundation
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/coverage-semantics.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/quality-certificate.schema.json
  - tests/catalog/groups/test_group_plan4_coverage_semantics.shard.json
  - tests/cli/plan4-coverage-semantics.test.ts
deliverables:
  - packages/core/src/evidence/coverage-semantics.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/quality-certificate.schema.json
  - tests/catalog/groups/test_group_plan4_coverage_semantics.shard.json
  - tests/cli/plan4-coverage-semantics.test.ts
validators:
  - node --strip-types tests/cli/plan4-coverage-semantics.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0277_model_relative_certificate_vocabulary_0d0fd68c
    targetGroupId: test_group_plan4_coverage_semantics
    semanticKey: plan4_model_relative_certificate_vocabulary
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-3
      - ACC-4
      - ACC-5
    coversImpactEdges:
      - Plan 4.0 coverage claims -> model-relative assumptions and vocabulary
      - validation receipts -> quality certificate terminology
      - closure evidence -> explicit proven/sufficient/unknown distinction
    expectedRedPredicate: A closure certificate can claim absolute 100% coverage without naming the model, assumptions, and unknown/gap status.
    responsibility: task-required
    contractEdge: plan4-coverage-semantics
requiredTestCaseIds:
  - test_atm_gov_0277_model_relative_certificate_vocabulary_0d0fd68c
evidence:
  required: command-backed-model-relative-certificate-receipts
rollback:
  strategy: revert-commit-and-disable-plan4-certificate-vocabulary
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.coverage-semantics
      pattern: Value Object / Vocabulary Module
      source: packages/core/src/evidence/coverage-semantics.ts
      disposition: extract
completed_at: "2026-07-31T00:44:45.259Z"
completed_by_agent: "codex-skl-captain"
closedAt: "2026-07-31T00:44:45.259Z"
closedByActor: "codex-skl-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T00-44-45-259Z-close-8b4b11af9097"
lastTransitionAt: "2026-07-31T00:44:45.259Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0b0918c3bfc14d90a68b51738d0e5f433f895858"
---

# ATM-GOV-0277 Model-relative coverage semantics and quality certificate vocabulary

## Intent

Define the smallest shared vocabulary Plan 4.0 needs before any module can claim
coverage quality. The core rule is first-principles: ATM must never say
"100% covered" without saying "100% relative to which finite model, assumptions,
known exclusions, and open unknowns."

This card creates the stable public language for later compilers, gauntlets,
stores, and skill projections.

## First-principles boundary

- Coverage is not absolute truth; it is a claim relative to a named model.
- A certificate must separate `proven`, `sufficient-under-assumptions`, and
  `unknown / gap / unsupported` instead of flattening all into pass/fail.
- Vocabulary is a deep module: callers import terms and constructors, not the
  internal representation choices.

## Acceptance

- [ ] ACC-1: A public `coverage-semantics` module defines model-relative coverage states, quality verdicts, assumptions, exclusions, and certificate vocabulary.
- [ ] ACC-2: Certificate helpers reject or diagnose absolute/unqualified 100% claims.
- [ ] ACC-3: The vocabulary can represent proven, sufficient-under-assumptions, blocked, indeterminate, unsupported, and stale evidence without losing partial progress.
- [ ] ACC-4: The JSON schema validates the same public shape used by tests and downstream modules.
- [ ] ACC-5: The test catalog group includes the required test case id and maps it to this card.

## Non-goals

- Do not implement the full coverage universe compiler here; that belongs to ATM-GOV-0280.
- Do not implement solver, mutation testing, or validator routing here.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T00:16:35.672Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0277-model-relative-coverage-semantics-and-quality-certificate-vocabulary.task.md","contentDigest":"sha256:673e6fd92d840d0e77fdc1be6ca109f5c40d3ee904cdf3a10d37aafa4ac1a0df"} -->
