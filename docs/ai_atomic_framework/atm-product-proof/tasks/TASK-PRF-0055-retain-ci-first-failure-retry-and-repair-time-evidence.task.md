---
task_id: TASK-PRF-0055
title: Retain CI first-failure retry and repair-time evidence
status: done
owner: release-evidence-steward
priority: P1
depends_on: [TASK-PRF-0051]
causalGraph:
  causalDependencies: [TASK-PRF-0051]
  startConditions:
    - "The current burn-in evaluator counts completed protected-main runs, but its input contract does not retain first-failure, retry-chain, repair-time, or explicit exclusion evidence."
    - "The card must preserve the existing fail-closed 30-day/90-run policy and must not rewrite historical GitHub run history or declare the current red window green."
  softRelations: [TASK-PRF-0043, TASK-PRF-0054]
  changedPublicSeams: [product_ci_failure_lifecycle_evidence, product_ci_burnin_observability]
  causalImpactEdges: [sustained-green-ci-claim, ci_repair_cost_measurement]
  parallelFrontierInputs: [live-github-run-export, retry-attempt-metadata, repair-boundary]
  validatorReferences: [test_prf_ci_failure_lifecycle_contract, test_prf_ci_missing_observability_fail_closed, test_prf_ci_repair_cost_provenance]
  phaseOwner: release-evidence
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/product-ci-burn-in.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-product-ci-burn-in.md
  - docs/reports/atm-product-proof-checkpoints.md
deliverables:
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/product-ci-burn-in.test.ts
  - docs/reports/atm-product-ci-burn-in.md
  - docs/reports/atm-product-proof-checkpoints.md
  - external raw CI receipt retaining attempt links, failure class, exclusion reason, first-failure timestamp, retry count, and repair-time boundary
validators:
  - npm run typecheck
  - npm run lint
  - node --strip-types tests/cli/product-ci-burn-in.test.ts
  - node --strip-types tests/cli/product-proof-evidence-boundary.test.ts
  - node --strip-types scripts/measure-product-ci-burn-in.ts --stdin --report-only
testContributions:
  - caseId: test_prf_ci_failure_lifecycle_contract
    semanticKey: ci_failure_lifecycle_contract
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [sustained-green-ci-claim, ci_repair_cost_measurement]
    expectedRedPredicate: "A failed or retried Product CI run can enter the burn-in report without a stable attempt chain, failure classification, or explicit exclusion reason."
    responsibility: task-required
    contractEdge: product_ci_failure_lifecycle_evidence
    resourceKey: live-github-run-export
  - caseId: test_prf_ci_missing_observability_fail_closed
    semanticKey: ci_missing_observability_fail_closed
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [sustained-green-ci-claim]
    expectedRedPredicate: "Missing first-failure, retry, or repair-time fields are silently treated as zero or success, allowing a green burn-in claim from incomplete telemetry."
    responsibility: task-required
    contractEdge: product_ci_burnin_observability
    resourceKey: incomplete-ci-receipt
  - caseId: test_prf_ci_repair_cost_provenance
    semanticKey: ci_repair_cost_provenance
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [ci_repair_cost_measurement]
    expectedRedPredicate: "The report publishes repair-time numbers without raw receipt digest, query bounds, source commit, or a reproducible mapping from failed attempt to accepted repair."
    responsibility: task-required
    contractEdge: product_ci_failure_lifecycle_evidence
    resourceKey: runtime-evidence-boundary
requiredTestCaseIds: [test_prf_ci_failure_lifecycle_contract, test_prf_ci_missing_observability_fail_closed, test_prf_ci_repair_cost_provenance]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: external-ci-attempt-receipt-with-first-failure-retry-and-repair-time-fields
rollback:
  strategy: revert-commit-preserve-raw-evidence
  notes: "只回滾 evaluator、測試與摘要欄位；保留 Git 外 raw CI export、失敗分類與負向觀測，不刪除或重寫既有 run history。"
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.ci-failure-lifecycle-evidence
      pattern: Policy Object
      source: scripts/measure-product-ci-burn-in.ts
      disposition: follow-up-card
      inlineReason: "先在既有 evaluator 上補足 failure lifecycle telemetry；若 A/B 與 CI 共用同一 repair-cost schema，再另卡抽出 deep module。"
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T02:35:27.260Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T02:35:27.260Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T02-35-27-260Z-close-1e45ae51fa64"
lastTransitionAt: "2026-09-14T02:35:27.260Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e32deaf328b5611899c881f1a0822de61640f19e"
---

# TASK-PRF-0055 Retain CI first-failure retry and repair-time evidence

## Intent

0051 已重新量測 protected-main 的窗口，但目前 evaluator 只知道某次 run
最後是 success 或 failure。這不足以回答產品目標要求的「首次失敗、重跑及實際
修復成本」：一個失敗後重跑三次才恢復的事件，不能和一次成功等價；被排除的
run 也必須說明為何不納入分母。

本卡把 CI 的最小觀測單位從 workflow run 擴充為可追溯的 attempt lifecycle，
並維持 30 天／90 次與 protected-main 的既有門檻。它不改寫 GitHub history，
不刪除失敗，不把缺欄位當成零，也不把新的 telemetry 當成綠色 CI 證明；缺少
必要欄位時只能輸出 `insufficient-observability` 或等價的 fail-closed 狀態。

第一性原理邊界：只有能從原始 run/attempt receipt 重建「何時首次失敗、重跑幾次、
何時由哪個修復邊界恢復、為何排除」的資料，才可計算 CI 的人工與時間成本，
並與 ATM 的返工成本比較。

## Acceptance

- [ ] ACC-1: 每個納入或排除的 Product CI observation 都保留穩定 run id、attempt
      關聯、head SHA、protected branch、event、conclusion、failure class 與
      exclusion reason；failed/cancelled/retried observation 不得從原始分母消失。
- [ ] ACC-2: 對每條 failure lifecycle 記錄 firstFailureAt、retryCount、最後一次
      retry/attempt 與 repairAcceptedAt（或明確的 unresolved）；repair time 必須
      由 raw timestamp 計算，不得由人工敘述或最後成功 run 猜測。
- [ ] ACC-3: evaluator 對缺少 lifecycle 欄位、非單調時間、孤立 retry 或無法綁定
      修復邊界的 receipt fail closed，輸出 `insufficient-observability` 或等價
      狀態；不可把缺值補成 0，也不可因此宣稱 long-term-green。
- [ ] ACC-4: 30 天／90 次 protected-main burn-in 門檻與既有 release-candidate
      條件維持不變；新報告同時呈現成功率、失敗/重跑/修復統計與人工修復成本，
      並保留目前窗口的 red/inconclusive 結論。
- [ ] ACC-5: 公開摘要只引用 Git 外 raw export，記錄 query bounds、source commit、
      receipt digest、計算命令與排除清單；不得把 runtime raw evidence 寫進 Git history。
- [ ] ACC-6: typecheck、lint、focused lifecycle tests 與 burn-in evaluator 測試
      全部通過；回滾只撤銷本卡 evaluator/報告變更，不刪除 raw receipt。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T02:21:30.127Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0055-retain-ci-first-failure-retry-and-repair-time-evidence.task.md","contentDigest":"sha256:41c861839fe5d9f998736c511b0acd32c973450f5a06e314cc885347e7149667"} -->
