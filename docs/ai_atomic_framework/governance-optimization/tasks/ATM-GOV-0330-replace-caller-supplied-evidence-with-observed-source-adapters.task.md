---
task_id: ATM-GOV-0330
title: Replace caller-supplied evidence with observed source adapters
status: done
owner: atm-evidence-core
priority: P0
depends_on: [ATM-GOV-0326, ATM-GOV-0329]
causalGraph:
  causalDependencies: [ATM-GOV-0326, ATM-GOV-0329]
  startConditions:
    - Canonical authority and validator ownership are stable.
    - Caller/source inventory identifies every caller-supplied boolean, string, and literal evidence input.
  softRelations: [ATM-GOV-0331]
  changedPublicSeams: [atm.observedEvidenceSource.v1, atm.observationSnapshot.v1]
  causalImpactEdges: [source-realness, observation-freshness, adapter-neutrality]
  parallelFrontierInputs: [git-source, process-source, filesystem-source, ledger-source, runner-source]
  validatorReferences: [validate-evidence-detector, validate-schemas, validate-module-boundaries]
  phaseOwner: correction-wave-4-observation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/core/src/telemetry/observation.ts
  - packages/core/src/evidence/realness.ts
  - packages/core/src/evidence/validation-receipt.ts
  - packages/core/src/evidence/evidence-freshness-certificate.ts
  - schemas/evidence/
  - tests/core/
deliverables:
  - packages/core/src/evidence/observed-source.ts
  - packages/core/src/evidence/observed-source-adapters.ts
  - schemas/evidence/observed-evidence-source.schema.json
  - tests/core/observed-evidence-source.test.ts
  - docs/reports/observed-evidence-source-deep-module-review.json
validators:
  - node --strip-types tests/core/observed-evidence-source.test.ts
  - npm run validate:schemas
  - npm run validate:module-boundaries
testContributions:
  - caseId: test_observed_evidence_rejects_caller_outcome_0330
    semanticKey: observed_evidence_rejects_caller_outcome
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [source-realness, observation-freshness, adapter-neutrality]
    expectedRedPredicate: caller-supplied success fields cannot satisfy observed evidence
    responsibility: task-required
    contractEdge: atm.observedEvidenceSource.v1
  - caseId: test_observed_evidence_two_adapters_0330
    semanticKey: observed_evidence_two_adapters
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [adapter-neutrality, source-realness]
    expectedRedPredicate: replacing one source adapter changes no consumer contract and unavailable sources stay unavailable
    responsibility: task-required
    contractEdge: atm.observationSnapshot.v1
requiredTestCaseIds: [test_observed_evidence_rejects_caller_outcome_0330, test_observed_evidence_two_adapters_0330]
phaseTestCaseIds: [test_group_plan4_authority_foundation]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor, tdd-oracle-fidelity]
evidence:
  required: command-backed
  reviewSchema: atm.deepModuleReviewReport.v1
rollback:
  strategy: preserve-interface-and-switch-consumers-back-to-last-known-good-adapter
atomizationImpact:
  ownerAtomOrMap: atm.evidence-observation
  mapUpdates: [atomic_workbench/maps/atm-evidence-map.json]
  extractionCandidates:
    - atom: atm.observed-evidence-source
      pattern: Adapter plus Policy Object
      source: packages/core/src/telemetry/observation.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-12T09:48:54.233Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-12T09:48:54.233Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-12T09-48-54-233Z-close-490d71f3ec80"
lastTransitionAt: "2026-08-12T09:48:54.233Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2532c874"
---

# ATM-GOV-0330 Replace caller-supplied evidence with observed source adapters

## Intent

以可替換的觀測來源 adapter 取代呼叫者自行填入 `passed/real/complete`、字串與 object literal。模組深度來自「封裝來源讀取、freshness、unknown/unavailable、digest 與 realness」，不是把 helper 改名。

## Acceptance

- [ ] ACC-1: 完成 module/caller/source inventory，逐一標示 production caller、fixture-only、zero-caller 與來源可用性。
- [ ] ACC-2: 新介面只接受 source descriptors/handles，不接受 caller outcome；輸出含 observedAt、window、水位、來源、digest、unknown/unavailable/conflicting。
- [ ] ACC-3: 至少兩個真實 adapter（例如 Git/ledger、process/filesystem）通過相同 interface tests；依賴分類為 in-process、local-substitutable、remote-owned、true-external。
- [ ] ACC-4: mutation controls 證明 forged success、stale digest、missing source、wrong candidate 都會紅。
- [ ] ACC-5: 產生 `atm.deepModuleReviewReport.v1`，含 interface、invariants、dependency class、adapter count、deletion test、rollback、validators、non-claims。

## Dispatch and stop rules

先做 design-twice：比較至少兩個介面，選擇把最多來源複雜度藏在最小 API 後方者。沒有兩個具體 adapter 時不得抽象 replaceable seam；來源缺失不得 fallback 成綠。若需跨越 public module boundary，先跑 topology validator。報告必列 before/after caller complexity、adapter matrix、negative controls、deep-module receipt 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:39.574Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0330-replace-caller-supplied-evidence-with-observed-source-adapters.task.md","contentDigest":"sha256:dc3d4ed51624233d64b917d405f4ce243030df4e8b96cb2e4b55e5738fe9b8e6"} -->
