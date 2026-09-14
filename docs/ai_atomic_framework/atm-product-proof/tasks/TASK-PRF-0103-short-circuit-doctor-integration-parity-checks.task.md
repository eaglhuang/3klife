---
task_id: TASK-PRF-0103
title: Short-circuit doctor integration parity checks
status: planned
owner: codex-product-proof
priority: P1
depends_on: []
causalGraph:
  causalDependencies: [TASK-PRF-0102]
  startConditions:
    - "CPU profile or repeated wall timing identifies integration source-parity compilation as a doctor hotspot."
    - "Explicit integration verify/parity commands remain available for deep source comparison."
  softRelations: [TASK-PRF-0100, TASK-PRF-0101]
  changedPublicSeams: [doctor-integration-health, integration-deep-parity]
  causalImpactEdges: [doctor-control-plane-latency, integration-drift-detection]
  parallelFrontierInputs: [TASK-PRF-0102 doctor.readiness samples]
  validatorReferences: [tests/cli/doctor-integration-fast-health.test.ts, tests/cli/integration-source-coverage-parity.test.ts]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/integration/health.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
  - tests/cli/doctor-integration-fast-health.test.ts
  - tests/cli/integration-source-coverage-parity.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - packages/cli/src/commands/integration/health.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
  - tests/cli/doctor-integration-fast-health.test.ts
  - tests/cli/integration-source-coverage-parity.test.ts
  - docs/reports/atm-command-gate-latency-score.md
validators:
  - "node --strip-types tests/cli/doctor-integration-fast-health.test.ts"
  - "node --strip-types tests/cli/integration-source-coverage-parity.test.ts"
  - "node --strip-types tests/cli/mandatory-gate-telemetry.test.ts"
  - "npm run typecheck"
testContributions:
  - caseId: test_doctor_fast_integration_health_0db50f31
    targetGroupId: null
    semanticKey: doctor_fast_integration_health
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [doctor-control-plane-latency, integration-drift-detection]
    expectedRedPredicate: "Doctor deep parity is not deferred, or explicit integration verify no longer performs source parity."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: doctor-integration-health
    contractEdge: integration-deep-parity
    resourceKey: null
requiredTestCaseIds: [test_doctor_fast_integration_health_0db50f31]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: recommended
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert only the fast-path option and its tests; preserve 0102 telemetry and the explicit deep parity commands."
atomizationImpact:
  ownerAtomOrMap: atm.integration-health-map
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      inlineReason: "health.ts already owns adapter verification and the change is a single option boundary; no new module is justified by the measured hotspot."
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0103 Short-circuit doctor integration parity checks

## Intent

`doctor` 是必經控制面命令，但目前每次都編譯所有 integration source 來重算 parity。此卡建立一個明確的 fast health boundary：doctor 只驗證已安裝 manifest 與檔案完整性；只有 `integration verify`／`integration parity` 才執行完整 source parity。這會降低常態成本，同時保留需要時的強驗證。

## Acceptance

- [ ] ACC-1：`checkIntegrationHealth(..., { sourceParity: 'deferred' })` 不呼叫 adapter `dryRunInstall`，輸出明確標示 `sourceParity: deferred`，且仍驗證 manifest 與已安裝檔案 hash。
- [ ] ACC-2：`runDoctor` 使用 fast health；`integration verify` 與 `integration parity` 維持完整 source-parity 行為，對 source drift 仍回報既有錯誤碼與修復指引。
- [ ] ACC-3：固定工作區／Node／cache 下至少 30 組 before/after doctor 量測；p50 降低 ≥30%，p95 回歸不得 >10%，並把結果接入 0102 latency score。
- [ ] ACC-4：既有 integration parity 測試、fast-path regression、mandatory telemetry 與 typecheck 全部通過；未達性能門檻標記未證明，不放寬門檻。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T18:32:52.033Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0103-short-circuit-doctor-integration-parity-checks.task.md","contentDigest":"sha256:290f0cef04d7996d5f01b2620acbefa272231eb386cc40029f214b2e6f933bc6"} -->
