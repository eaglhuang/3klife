---
task_id: ATM-GOV-0337
title: Run real selected-versus-full shadow comparison
status: planned
owner: atm-shadow-evaluation
priority: P0
depends_on: [ATM-GOV-0336]
causalGraph:
  causalDependencies: [ATM-GOV-0336]
  startConditions:
    - Plan 4 foundation chain is green with 17 sealed anchors.
    - Selected and full profiles resolve from the same catalog digest.
  softRelations: [ATM-GOV-0338]
  changedPublicSeams: [atm.shadowComparison.v1]
  causalImpactEdges: [same-candidate-shadow, escaped-defect-adjudication, policy-epoch]
  parallelFrontierInputs: [sealed-candidate, selected-profile, full-profile]
  validatorReferences: [validate-shadow-comparison, validate-test-facade, validate-full]
  phaseOwner: closeout-wave-8-shadow
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/core/src/evidence/shadow-comparison.ts
  - packages/core/src/maps/shadow-comparator.ts
  - schemas/evidence/shadow-comparison.schema.json
  - tests/catalog/groups/test_group_plan4_shadow_comparison.shard.json
  - docs/reports/plan4-real-shadow-comparison.json
deliverables:
  - docs/reports/plan4-real-shadow-comparison.json
  - tests/core/real-shadow-comparison.test.ts
validators:
  - node --strip-types tests/core/real-shadow-comparison.test.ts
  - npm run validate:full
testContributions:
  - caseId: test_real_same_candidate_shadow_0337
    semanticKey: real_same_candidate_shadow
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [same-candidate-shadow, escaped-defect-adjudication, policy-epoch]
    expectedRedPredicate: fixture-only self-declared or mismatched candidate shadow cannot pass
    responsibility: task-required
    contractEdge: atm.shadowComparison.v1
requiredTestCaseIds: [test_real_same_candidate_shadow_0337]
phaseTestCaseIds: [test_group_plan4_shadow_comparison]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: invalidate-policy-epoch-and-restore-legacy-selection
atomizationImpact:
  ownerAtomOrMap: atm.shadow-comparison
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0337 Run real selected-versus-full shadow comparison

## Intent

對同一 sealed candidate 真正執行 selected 與 full/legacy profiles，讓 full 是獨立 oracle，而不是兩份由同一 object factory 寫出的結果。

## Acceptance

- [ ] ACC-1: 兩 profile 綁定相同 source/runner/catalog/candidate digest，保存完整 commands、run IDs、selected/skipped/unknown 與 artifact paths。
- [ ] ACC-2: 輸出 false-block、escaped-defect、latency、cache hit/miss；任一 escaped defect 使 policy epoch invalid。
- [ ] ACC-3: negative controls 覆蓋 candidate mismatch、人工 outcome、missing full source、stale receipt、縮分母。
- [ ] ACC-4: legacy profile 仍可獨立執行，rollback replay 成功；沒有 fixture-only 真實執行宣稱。

## Stop rules and report

禁止修改 full oracle 迎合 selected。兩次執行之間 HEAD/catalog 變動即整組作廢重跑。報告列 candidate seal、兩 profile DAG、差異 rows、escaped defects、timing/cache、policy verdict 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:54.707Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0337-run-real-selected-versus-full-shadow-comparison.task.md","contentDigest":"sha256:11e65621cdfd77bcd9c12b3122281f3e7d8a424b42c7e08133e04bad17e97443"} -->
