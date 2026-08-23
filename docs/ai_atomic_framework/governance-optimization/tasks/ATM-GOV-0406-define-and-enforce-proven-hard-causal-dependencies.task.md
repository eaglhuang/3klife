---
task_id: ATM-GOV-0406
title: Define and enforce proven hard causal dependencies
status: done
owner: claude-captain
priority: P0
series: GOV
series_reason: Plan 4.1 continues Plan 4.0 governance admission and concurrency semantics.
depends_on: []
causalGraph:
  startConditions:
    - Plan 4.1 six-part hard-causal definition is sealed.
    - Existing dependency-gate and claim-readiness fixtures are available.
  softRelations: [ATM-GOV-0407]
  changedPublicSeams: [hard-causal-dependency-contract, task-import-dependency-diagnostics, claim-readiness-dependency-gate]
  causalImpactEdges:
    - typed-proof-controls-claim-blocking
    - incomplete-hard-proof-fails-import
    - non-hard-relations-remain-claimable
  parallelFrontierInputs: [sealed-plan-4-1-definition, legacy-dependency-fixtures]
  validatorReferences: [test_gov_hard_causal_contract_0406, test_gov_nonhard_claim_admission_0406, test_gov_legacy_boundary_0406]
  phaseOwner: plan-4-1-contract-lane
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4-1.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/governance/work-item.schema.json
  - packages/cli/src/commands/tasks/dependency-gate.ts
  - packages/cli/src/commands/tasks/dependency-gates.ts
  - packages/cli/src/commands/tasks/task-frontmatter-fidelity.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/task-card-contract-import.ts
  - packages/cli/src/commands/tasks/task-atomization-policy-import.ts
  - packages/cli/src/commands/tasks/import-card-contract-validation.ts
  - packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
  - packages/cli/src/commands/next/claim-readiness.ts
  - packages/cli/src/commands/next/__tests__/claim-readiness.test.ts
  - tests/cli/hard-causal-dependency-import.test.ts
  - docs/governance/error-code-registry.json
  - packages/core/src/error-code-registry.generated.ts
  - docs/ERROR_CODES.md
deliverables:
  - schemas/governance/work-item.schema.json
  - packages/cli/src/commands/tasks/dependency-gate.ts
  - packages/cli/src/commands/tasks/dependency-gates.ts
  - packages/cli/src/commands/tasks/task-frontmatter-fidelity.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/task-card-contract-import.ts
  - packages/cli/src/commands/tasks/task-atomization-policy-import.ts
  - packages/cli/src/commands/tasks/import-card-contract-validation.ts
  - packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
  - packages/cli/src/commands/next/claim-readiness.ts
  - packages/cli/src/commands/next/__tests__/claim-readiness.test.ts
  - tests/cli/hard-causal-dependency-import.test.ts
  - docs/governance/error-code-registry.json
  - packages/core/src/error-code-registry.generated.ts
  - docs/ERROR_CODES.md
validators:
  - node --strip-types packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/claim-readiness.test.ts
  - node --strip-types tests/cli/hard-causal-dependency-import.test.ts
  - npm run generate:error-codes
  - npm run typecheck
testContributions:
  - caseId: test_gov_hard_causal_contract_0406
    targetGroupId: null
    semanticKey: six_part_hard_causal_contract
    coversAcceptance: [ACC-1, ACC-2, ACC-6, ACC-7]
    coversImpactEdges: [typed-proof-controls-claim-blocking, incomplete-hard-proof-fails-import]
    expectedRedPredicate: An incomplete or false hard-causal declaration blocks a claim or passes import.
    contributionResourceKey: hard-causal-fixtures
    responsibility: task-required
    dependencyEdge: dependency-proof-to-claim-gate
    contractEdge: hard-causal-dependency-contract
    resourceKey: dependency-proof
  - caseId: test_gov_nonhard_claim_admission_0406
    targetGroupId: null
    semanticKey: nonhard_relations_remain_claimable
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [non-hard-relations-remain-claimable]
    expectedRedPredicate: A validation, publication, observation, soft-order, file or atom relation freezes the whole task.
    contributionResourceKey: typed-relation-fixtures
    responsibility: task-required
    dependencyEdge: relation-type-to-lifecycle-gate
    contractEdge: claim-readiness-dependency-gate
    resourceKey: task-ledger
  - caseId: test_gov_legacy_boundary_0406
    targetGroupId: null
    semanticKey: explicit_semantics_migration_boundary
    coversAcceptance: [ACC-5]
    coversImpactEdges: [typed-proof-controls-claim-blocking]
    expectedRedPredicate: An unaudited legacy family silently changes behavior or an opted-in card falls back to untyped semantics.
    contributionResourceKey: migration-fixtures
    responsibility: task-required
    dependencyEdge: semantics-version-to-gate-mode
    contractEdge: task-import-dependency-diagnostics
    resourceKey: work-item-schema
requiredTestCaseIds: [test_gov_hard_causal_contract_0406, test_gov_nonhard_claim_admission_0406, test_gov_legacy_boundary_0406]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-opt-in-semantics-and-restore-legacy-gate
  notes: Preserve ledgers and evidence; revert only opted-in parsing and admission if controls fail.
atomizationImpact:
  ownerAtomOrMap: atm.task-dependency-gate
  mapUpdates: []
  newScriptsAllowed: true
  extractionCandidates:
    - atom: atm.hard-causal-dependency-contract
      pattern: Policy Object
      source: packages/cli/src/commands/tasks/dependency-gate.ts
      disposition: inline
      inlineReason: Existing dependency gate owns classification and admission authority.
    - atom: atm.task-import-card-contract-validation
      pattern: Extract Method Object
      source: packages/cli/src/commands/tasks/import-orchestrator.ts
      disposition: extract
      inlineReason: null
    - atom: atm.task-card-contract-import
      pattern: Deep Module
      source: packages/cli/src/commands/tasks/task-import-validators.ts
      disposition: extract
      inlineReason: null
    - atom: atm.task-atomization-policy-import
      pattern: Deep Module
      source: packages/cli/src/commands/tasks/task-import-validators.ts
      disposition: extract
      inlineReason: null
errorCodes: [ATM_TASK_DEPENDENCY_HARD_PROOF_INCOMPLETE, ATM_TASK_DEPENDENCY_HARD_PROOF_CONTRADICTORY, ATM_TASK_DEPENDENCY_UNTYPED_IN_TYPED_CARD, ATM_TASK_DEPENDENCY_RELATION_UNKNOWN]
createdByCommand: atm plan card create
completed_at: "2026-08-23T16:01:45.008Z"
completed_by_agent: "claude-008"
closedAt: "2026-08-23T16:01:45.008Z"
closedByActor: "claude-008"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-23T16-01-45-008Z-close-e40c1afc9bd1"
lastTransitionAt: "2026-08-23T16:01:45.008Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ff37dccd44f6870636ce0609fbb0420e8dbf581d"
---

# ATM-GOV-0406 Define and enforce proven hard causal dependencies

## Intent

For opted-in Plan 4.1 cards, allow claim blocking only from a complete machine-verifiable hard-causal proof and enforce every other relation at its actual lifecycle boundary.

## Acceptance

- [ ] ACC-1: Contract represents all six mandatory hard-causal facts.
- [ ] ACC-2: Import rejects missing or contradictory hard proof with precise recovery and no task/actor/date/path special case.
- [ ] ACC-3: Validation, publication, observation and soft-order relations do not block claim.
- [ ] ACC-4: File/atom overlap alone reaches Broker proposal-first/arbitration without becoming whole-task dependency; unauthorized mutation and compose stay fail-closed.
- [ ] ACC-5: Legacy families retain legacy behavior until audited; opted-in cards cannot silently fall back.
- [ ] ACC-6: Negative control blocks before producer output and admits after sealed output exists.
- [ ] ACC-7: The four dependency diagnostics are registered canonically and generated ErrorCode projections reproduce from the registry without absorbing foreign worktree declarations.

## Parallel contract

Claude Captain owns this card. Cursor Captain starts ATM-GOV-0407 concurrently. Final compose may consume this source SHA, but 0407 claim must not wait for it.

## Out of scope

PRF census/dashboard, removal of Broker protection, automatic legacy migration, publication or close of ATM-GOV-0407.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-22T15:35:14.729Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0406-define-and-enforce-proven-hard-causal-dependencies.task.md","contentDigest":"sha256:4adad76f5b3f97e6f1af890c31fd1fd62df2075dc2be5621498612e3d3f2e52a"} -->
