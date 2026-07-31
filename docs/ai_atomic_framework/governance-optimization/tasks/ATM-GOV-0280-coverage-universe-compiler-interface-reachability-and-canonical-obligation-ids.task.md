---
task_id: ATM-GOV-0280
title: CoverageUniverseCompiler interface reachability and canonical obligation IDs
status: done
owner: unassigned
priority: P1
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0279
causalGraph:
  causalDependencies:
    - ATM-GOV-0279
  startConditions:
    - ATM-GOV-0279 is done and provides the obligation inventory schema and drift detector contract.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - packages/core/src/evidence/obligation-inventory.ts
    - packages/core/src/evidence/test-case-catalog.ts
  changedPublicSeams:
    - atm.coverageUniverseCompiler.v1
    - atm.canonicalObligationId.v1
  causalImpactEdges:
    - repository/model input -> canonical coverage obligation IDs
    - reachability decision -> obligation inventory status
    - compiled universe digest -> QualityGauntlet start input
    - coverage gap evidence -> causal-neighborhood compiler inputs
  validatorReferences:
    - node --strip-types tests/cli/plan4-coverage-universe-compiler.test.ts
    - npm run typecheck
  phaseOwner: plan4-foundation
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/coverage-universe-compiler.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/coverage-universe.schema.json
  - tests/catalog/groups/test_group_plan4_coverage_universe.shard.json
  - tests/cli/plan4-coverage-universe-compiler.test.ts
deliverables:
  - packages/core/src/evidence/coverage-universe-compiler.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/coverage-universe.schema.json
  - tests/catalog/groups/test_group_plan4_coverage_universe.shard.json
  - tests/cli/plan4-coverage-universe-compiler.test.ts
validators:
  - node --strip-types tests/cli/plan4-coverage-universe-compiler.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0280_coverage_universe_canonical_ids_dfd2a214
    targetGroupId: test_group_plan4_coverage_universe
    semanticKey: plan4_coverage_universe_canonical_ids
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-3
      - ACC-5
    coversImpactEdges:
      - repository/model input -> canonical coverage obligation IDs
      - compiled universe digest -> QualityGauntlet start input
    expectedRedPredicate: The same semantic obligation receives different IDs when source input order changes, preventing stable gap/certificate tracking.
    responsibility: task-required
    contractEdge: plan4-coverage-universe
  - caseId: test_atm_gov_0280_reachability_status_mapping_f54a35be
    targetGroupId: test_group_plan4_coverage_universe
    semanticKey: plan4_reachability_status_mapping
    coversAcceptance:
      - ACC-2
      - ACC-4
      - ACC-5
    coversImpactEdges:
      - reachability decision -> obligation inventory status
      - coverage gap evidence -> causal-neighborhood compiler inputs
    expectedRedPredicate: Unreachable or unsupported obligations disappear instead of being represented as explicit gap/unsupported entries.
    responsibility: task-required
    contractEdge: plan4-coverage-universe
requiredTestCaseIds:
  - test_atm_gov_0280_coverage_universe_canonical_ids_dfd2a214
  - test_atm_gov_0280_reachability_status_mapping_f54a35be
evidence:
  required: command-backed-coverage-universe-compiler-receipts
rollback:
  strategy: revert-commit-and-disable-plan4-coverage-universe-compiler
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.coverage-universe-compiler
      pattern: Facade / Compiler
      source: packages/core/src/evidence/coverage-universe-compiler.ts
      disposition: extract
completed_at: "2026-07-31T01:35:08.052Z"
completed_by_agent: "codex-skl-captain"
closedAt: "2026-07-31T01:35:08.052Z"
closedByActor: "codex-skl-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T01-35-08-052Z-close-cdb4c9d6502a"
lastTransitionAt: "2026-07-31T01:35:08.052Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d1a1f2beeabbb65a63934e1c256120b32548a05c"
---

# ATM-GOV-0280 CoverageUniverseCompiler interface reachability and canonical obligation IDs

## Intent

Define the compiler facade that turns model inputs into a stable coverage
universe: canonical obligation IDs, reachability status, source references, and
digest evidence that downstream modules can trust.

This is the missing bridge before ATM-GOV-0284 and ATM-GOV-0285. Without it,
QualityGauntlet would not know what universe it is certifying, and validator
selection would not know which gaps it is trying to close.

## First-principles boundary

- A compiler is a deep module: callers provide model inputs and receive a stable
  obligation inventory plus diagnostics. They do not reach into parser details.
- Canonical IDs must be semantic and deterministic, not derived from incidental
  array order or local file order.
- Unknown, unsupported, unreachable, and excluded obligations must remain visible
  as first-class outcomes; hiding them creates false 100% coverage.

## Acceptance

- [ ] ACC-1: `CoverageUniverseCompiler` exposes a small facade for compiling model inputs into an obligation inventory.
- [ ] ACC-2: Canonical obligation IDs are deterministic under input reordering and include enough semantic identity to survive resumable validation.
- [ ] ACC-3: Reachability status is represented explicitly for reachable, unreachable, unsupported, excluded, and unknown obligations.
- [ ] ACC-4: Compiler output includes gap/candidate information consumable by QualityGauntlet and causal-neighborhood planning without private state access.
- [ ] ACC-5: The test catalog group includes both required test case ids and maps them to this card.

## Non-goals

- Do not implement QualityGauntlet or ClosureAssuranceMachine here; that belongs to ATM-GOV-0284.
- Do not implement validator catalog selection or resumable probe scheduling here; that belongs to ATM-GOV-0285.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T00:16:42.747Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0280-coverage-universe-compiler-interface-reachability-and-canonical-obligation-ids.task.md","contentDigest":"sha256:54949a4d353802ba9d617f5ec5bb7156c999e34192c0b3c8d22bdf52cf089520"} -->
