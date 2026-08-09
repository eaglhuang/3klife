---
task_id: ATM-GOV-0341
title: Produce independent four-plan certification and governed release
status: planned
owner: atm-independent-review
priority: P0
depends_on: [ATM-GOV-0340]
causalGraph:
  causalDependencies: [ATM-GOV-0340]
  startConditions:
    - Plan objective counts are exactly 17/17 23/23 29/29 and 17/17 verified.
    - Backlog unclassified and open-like counts are both zero.
    - No unresolved timeout override no-verify unauthorized receipt or rescue-root ambiguity remains.
  changedPublicSeams: [atm.fourPlanIndependentCertificate.v1]
  causalImpactEdges: [objective-verdict, card-state-verdict, incident-verdict, freshness-verdict, charter-verdict, release-verdict]
  parallelFrontierInputs: [planning-matrix, target-receipts, backlog-census, dashboards, runner-provenance]
  validatorReferences: [validate-four-plan-objectives, validate-backlog-census, validate-full, validate-charter, validate-runner-reproducibility]
  phaseOwner: closeout-wave-10
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/core/src/evidence/quality-authority.ts
  - packages/core/src/evidence/quality-vector.ts
  - packages/core/src/evidence/oracle-adjudication.ts
  - scripts/validate-four-plan-objectives.ts
  - scripts/validate-backlog-census.ts
  - scripts/validate-runner-reproducibility.ts
  - tests/catalog/groups/test_group_plan4_final_certification.shard.json
deliverables:
  - packages/core/src/evidence/four-plan-independent-certificate.ts
  - schemas/evidence/four-plan-independent-certificate.schema.json
  - tests/cli/four-plan-independent-certificate.test.ts
  - docs/reports/plan-3x-4x-independent-certificate.json
  - docs/reports/plan-3x-4x-release-closeback.json
validators:
  - node --strip-types tests/cli/four-plan-independent-certificate.test.ts
  - node --strip-types scripts/validate-four-plan-objectives.ts --mode validate
  - node --strip-types scripts/validate-backlog-census.ts --mode validate
  - npm run typecheck
  - npm run lint
  - npm test
  - npm run validate:test-facade
  - npm run validate:module-boundaries
  - npm run validate:standard
  - npm run validate:full
testContributions:
  - caseId: test_independent_certificate_fail_closed_dimensions_0341
    semanticKey: independent_certificate_fail_closed_dimensions
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [objective-verdict, card-state-verdict, incident-verdict, freshness-verdict, charter-verdict]
    expectedRedPredicate: any unknown stale unavailable override or self-issued evidence keeps overall not-complete
    responsibility: task-required
    contractEdge: atm.fourPlanIndependentCertificate.v1
  - caseId: test_release_closeback_digest_parity_0341
    semanticKey: release_closeback_digest_parity
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [release-verdict]
    expectedRedPredicate: source frozen root-drop onefile remote or planning target digest mismatch blocks release
    responsibility: task-required
    contractEdge: atm.fourPlanIndependentCertificate.v1
requiredTestCaseIds: [test_independent_certificate_fail_closed_dimensions_0341, test_release_closeback_digest_parity_0341]
phaseTestCaseIds: [test_group_plan4_final_certification]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity, deep-module-refactor]
team:
  required: true
  teamLevel: L5
  selectionPolicy: independent-reviewer-not-in-any-tested-role
  review:
    requiredFormalSignatures: 2
    reviewerIndependencePolicy: reviewer-is-not-implementer-evidence-producer-fixture-generator-closure-actor-or-override-approver
  observability:
    requiredEventTypes: [artifact.output, review.verdict, release.closeback]
evidence:
  required: independently-recomputed-command-backed
rollback:
  strategy: keep-legacy-authority-and-emit-blocked-certificate
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: [atomic_workbench/maps/atm-evidence-map.json]
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0341 Produce independent four-plan certification and governed release

## Intent

由與所有受驗工作角色獨立的 reviewer，直接從 raw sealed sources 重算六維 certificate，完成 source/frozen/release parity、governed commit/push 與 planning/target remote closeback。這張卡不能修受驗 evidence。

## Acceptance

- [ ] ACC-1: certificate writer、fixture generator、implementer、evidence producer、closure actor、reviewer 角色分離；reviewer output path 與 compiler output path 分離。
- [ ] ACC-2: 分別輸出 objective、card-state、incident/backlog、freshness、charter、release verdict；任何 unresolved/unknown/unavailable/stale/override/no-verify/unauthorized 為 NOT COMPLETE。
- [ ] ACC-3: reviewer 只讀 raw digests，不讀 writer overall verdict；獨立重算 byte-stable，mutation controls 可使每個子維度單獨翻紅。
- [ ] ACC-4: focused、typecheck、lint、test、test-facade、module-boundaries、quick、standard、full、catalog、neutrality、release parity、frozen smoke 全綠且無 timeout/orphan。
- [ ] ACC-5: source/frozen/root-drop/onefile digest parity；target/planning commits remote-reachable；closeback 綁定兩邊 SHA。所有條件通過後才可退休 legacy authority。

## Dispatch and stop rules

reviewer 不得修改受驗檔案；任何失敗回到最早 owning card，不能在本卡補證據。commit/push/release 只執行 ATM playbook 回傳命令並走 broker。報告含角色獨立性、六維 verdict、完整 suite receipts、runner/release digests、remote SHA、closeback、blocked certificate/rollback 與 keep-memory decision。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:23:03.600Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0341-produce-independent-four-plan-certification-and-governed-release.task.md","contentDigest":"sha256:52c13f94e941caffb00dec534caed8f0e080640ce388ccd07f9e163909586cdf"} -->
