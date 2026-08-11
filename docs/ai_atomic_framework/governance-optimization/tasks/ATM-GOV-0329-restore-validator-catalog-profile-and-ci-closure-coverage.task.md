---
task_id: ATM-GOV-0329
title: Restore validator catalog profile and CI closure coverage
status: in-progress
started_at: 2026-08-11T23:51:50+08:00
started_by_agent: codex-gpt-5.4-mini
owner: atm-validator-governance
priority: P0
depends_on: [ATM-GOV-0326, ATM-GOV-0328]
causalGraph:
  causalDependencies: [ATM-GOV-0326, ATM-GOV-0328]
  startConditions:
    - Canonical authority reader is fixed.
    - Test facade timing policy passes its focused contract.
  softRelations: [ATM-GOV-0330, ATM-GOV-0332]
  changedPublicSeams: [atm.testCaseCatalog.v1, atm.validatorProfileResponsibility.v1]
  causalImpactEdges: [catalog-ownership, profile-selection, ci-coverage, release-gates]
  parallelFrontierInputs: [test-case-shards, validator-config, ci-workflows, obligation-map]
  validatorReferences: [validate-test-facade, validate-module-boundaries, validate-cli, validate-full]
  phaseOwner: correction-wave-3-ci
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/test-catalog.config.json
  - scripts/validators.config.json
  - scripts/run-validators/implementation.ts
  - scripts/validate-test-facade.ts
  - packages/cli/src/commands/validation-obligations.ts
  - tests/catalog/groups/
  - tests/cli/plan-3x-4x-validator-profile-coverage.test.ts
  - tests/cli/plan4-catalog-contract.test.ts
  - tests/cli/plan4-mutation-lineage-equivalence.test.ts
  - tests/cli/plan4-obligation-inventory.test.ts
  - tests/cli/validation-obligation-map.test.ts
  - .github/workflows/ci.yml
  - .github/workflows/release-npm.yml
deliverables:
  - scripts/test-catalog.config.json
  - scripts/validators.config.json
  - scripts/run-validators/implementation.ts
  - scripts/validate-test-facade.ts
  - packages/cli/src/commands/validation-obligations.ts
  - tests/catalog/groups/test_group_plan_3x_4x_complete_closeout.shard.json
  - tests/cli/plan-3x-4x-validator-profile-coverage.test.ts
  - tests/cli/plan4-catalog-contract.test.ts
  - tests/cli/plan4-mutation-lineage-equivalence.test.ts
  - tests/cli/plan4-obligation-inventory.test.ts
  - tests/cli/validation-obligation-map.test.ts
  - .github/workflows/ci.yml
  - .github/workflows/release-npm.yml
validators:
  - node --strip-types tests/cli/plan-3x-4x-validator-profile-coverage.test.ts
  - npm run validate:test-facade
  - npm run validate:module-boundaries
testContributions:
  - caseId: test_task_atm_gov_0329_plan_3x_4x_catalog_profile_coverage_fad18eba
    semanticKey: plan_3x_4x_catalog_profile_coverage
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [catalog-ownership, profile-selection, ci-coverage, release-gates]
    expectedRedPredicate: any required Plan 4 case lacks a canonical group profile or CI owner
    responsibility: task-required
    contractEdge: atm.validatorProfileResponsibility.v1
requiredTestCaseIds: [test_task_atm_gov_0329_plan_3x_4x_catalog_profile_coverage_fad18eba]
# phaseTestCaseIds must name executable catalog cases; group ids are catalog containers,
# not validation-contract selections.
phaseTestCaseIds:
  - test_task_atm_gov_0313_historical_shard_namespace_migration_8a48480f
  - test_task_atm_gov_0313_complete_catalog_schema_contract_7d958211
  - test_task_atm_gov_0285_catalog_selection_by_impact_cone_c4972e33
  - test_task_atm_gov_0285_resumable_probe_cursor_f1238b6c
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract, tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: restore-last-green-profile-without-suppressing-red-gates
atomizationImpact:
  ownerAtomOrMap: atm.validator-catalog-selection
  mapUpdates: [atomic_workbench/maps/atm-test-catalog-map.json]
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0329 Restore validator catalog profile and CI closure coverage

## Intent

讓每個 Plan 3.x/4.0 obligation 在 canonical catalog、quick/standard/full、CI 與 release lane 都有唯一且可查的責任，防止 44 張卡只跑 focused test、typecheck、validate:cli、git-head 就假收口。

## Acceptance

- [ ] ACC-1: 每個 required case ID 唯一、可解析、非零測試，且 acceptance/impact edge 全部有 task-required case。
- [ ] ACC-2: 主 CI 執行 typecheck、lint、test、standard；release lane 執行 full、release parity、runner smoke、SBOM/package checks。
- [ ] ACC-3: full 支援 run ID、status/resume、timeout partial summary 與 owned-child cleanup。
- [ ] ACC-4: wrong digest、stale coverage、uncovered obligation、fake incident、self-issued certificate negative controls 全部會紅。
- [ ] ACC-5: 每個 profile receipt 包含 DAG、selection reason、cache、duration、skipped/failed/timeout、output digest；任何 skip/unavailable 不得轉 pass。

## Dispatch and stop rules

只新增有明確責任的 profile edge；不可用「把全部測試塞進 quick」解決 catalog 缺口。task-close 只消費本卡 required case 與直接受影響的 facade/module validators；standard/full 是 correction-wave-3-ci 的 phase gate，必須有獨立、可追溯 receipt，且任何紅燈都保持 blocker，不得以 task receipt 或 retry 偽造通過。shared catalog/config/workflow 寫入須由 broker/compose steward 處理。報告列出新增/移除 case、profile ownership matrix、CI diff、negative controls、runtime 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:37.264Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0329-restore-validator-catalog-profile-and-ci-closure-coverage.task.md","contentDigest":"sha256:32526f3ab6d5ab94272243703bc99ff82cd5b1a547d5eb97c956e7719be655f1"} -->
