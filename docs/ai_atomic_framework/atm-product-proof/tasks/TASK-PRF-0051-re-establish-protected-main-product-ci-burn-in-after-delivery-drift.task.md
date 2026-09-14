---
task_id: TASK-PRF-0051
title: Re-establish protected-main Product CI burn-in after delivery drift
status: done
owner: unassigned
priority: P2
depends_on: [TASK-PRF-0050]
causalGraph:
  causalDependencies: [TASK-PRF-0050]
  startConditions: ["TASK-PRF-0050 is closed and its fixed-version candidate/public measurement is recorded; current live remote validation is re-run after the latest delivered state."]
  softRelations: [TASK-PRF-0031, TASK-PRF-0043, TASK-PRF-0050]
  changedPublicSeams: [product-ci-burn-in-evidence]
  causalImpactEdges: [sustained-green-ci-claim]
  parallelFrontierInputs: [live-github-ci-export]
  validatorReferences: [test_prf_ci_release_candidate_coverage_0051, test_prf_ci_failure_classification_0051, test_prf_ci_burnin_window_gate_0051, test_prf_ci_evidence_boundary_0051]
  phaseOwner: release-evidence
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/atm-product-ci-burn-in.md
  - docs/reports/atm-product-proof-checkpoints.md
deliverables:
  - docs/reports/atm-product-ci-burn-in.md
  - docs/reports/atm-product-proof-checkpoints.md
validators:
  - node --strip-types scripts/measure-product-ci-burn-in.ts --stdin --report-only
  - node --strip-types scripts/validate-product-ci-burn-in-schedule.ts --mode validate
errorCodes: []
createdByCommand: atm plan card create
testContributions:
  - caseId: test_prf_ci_release_candidate_coverage_0051
    semanticKey: ci_release_candidate_coverage
    coversAcceptance: [ACC-1]
    coversImpactEdges: [sustained-green-ci-claim]
    expectedRedPredicate: "目前或任何重驗證窗口少於兩個 eligible release-candidate runs 時，remote validator 必須 fail closed，不得以 standard runs 代替。"
    responsibility: task-required
    contractEdge: product-ci-burn-in-evidence
    resourceKey: live-github-ci-export
  - caseId: test_prf_ci_failure_classification_0051
    semanticKey: ci_failure_classification
    coversAcceptance: [ACC-2]
    coversImpactEdges: [sustained-green-ci-claim]
    expectedRedPredicate: "任何 failed 或 cancelled Product CI attempt 被遺漏、改成 success、或從分母剔除而未分類時，證據驗收必須失敗。"
    responsibility: task-required
    contractEdge: product-ci-burn-in-evidence
    resourceKey: live-github-ci-export
  - caseId: test_prf_ci_burnin_window_gate_0051
    semanticKey: ci_burnin_window_gate
    coversAcceptance: [ACC-3]
    coversImpactEdges: [sustained-green-ci-claim]
    expectedRedPredicate: "少於 90 completed eligible protected-main runs 或少於 30 calendar days 時，報告只能是 insufficient-window 或 unexplained-failure，不能是 pass。"
    responsibility: task-required
    contractEdge: product-ci-burn-in-evidence
    resourceKey: product-ci-burn-in-window
  - caseId: test_prf_ci_evidence_boundary_0051
    semanticKey: ci_evidence_boundary
    coversAcceptance: [ACC-4]
    coversImpactEdges: [sustained-green-ci-claim]
    expectedRedPredicate: "缺少 raw export、query bounds、source digest、command 或 mutable runtime evidence 被寫入 Git history 時，不得通過證據邊界驗收。"
    responsibility: task-required
    contractEdge: product-ci-burn-in-evidence
    resourceKey: runtime-evidence-boundary
requiredTestCaseIds: [test_prf_ci_release_candidate_coverage_0051, test_prf_ci_failure_classification_0051, test_prf_ci_burnin_window_gate_0051, test_prf_ci_evidence_boundary_0051]
tddMode: reasoned-not-applicable
tddNotApplicableReason: "本卡只重驗 live CI 與既有 burn-in evaluator 的外部證據，不改產品行為；若 validator 契約需要修改，應另開程式修復卡。"
methodProfiles: [evidence-revalidation]
evidence:
  required: command-backed-live-export
rollback:
  strategy: revert-commit-preserve-raw-evidence
  notes: "可回滾本卡新增的公開摘要欄位，但不得刪除 GitHub run history 或 Git 外 raw export；任何負結果與 failure classification 必須保留。"
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates: []
completed_at: "2026-09-14T01:01:12.304Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T01:01:12.304Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T01-01-12-304Z-close-fa59a4dcf438"
lastTransitionAt: "2026-09-14T01:01:12.304Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d395181e60803f979995e607bf16565972a3fbe0"
---

# TASK-PRF-0051 Re-establish protected-main Product CI burn-in after delivery drift

## Intent

TASK-PRF-0050 已把候選套件與 registry 版本的 clean-install 測量補齊；但最新 live
GitHub 觀測顯示 protected `main` 的 `Product CI` 窗口只有一個
`release-candidate`，且近期樣本含失敗 run。這不是舊卡的歷史可被改寫，而是
交付後持續性證據漂移。本卡只重驗並追加報告，確認 ATM 是否仍有資格宣稱長期
綠色 CI。

## Acceptance

- [ ] ACC-1: 從 live GitHub API 取得固定 query bounds 的 `ci.yml` protected-main runs，確認 required context 是 `Product CI`，並在同一窗口至少觀察兩個 eligible `release-candidate` runs；不足時明確判定 `insufficient-window`，不可用 standard run 替代。
- [ ] ACC-2: 每個納入窗口的 completed/failed/cancelled run 都保留 run id、head SHA、event、conclusion、Product CI job conclusion 與排除原因；不得把 workflow success 或 advisory Dogfood success 當成 Product CI success。
- [ ] ACC-3: 以 `measure-product-ci-burn-in.ts` 驗證至少 90 個 completed eligible protected-main runs 且跨至少 30 個 calendar days；任一條件不足或有未解釋 failure 時，verdict 必須維持 `insufficient-window` 或 `unexplained-failure`，不可標 `pass`。
- [ ] ACC-4: 公開摘要 append-only 指向 Git 外 raw export，記錄 validator/measurement 命令、時間界線、commit SHA、source/receipt digest 與限制；不得把 mutable runtime evidence 或秘密寫入 Git history，也不得因本卡授權 push、publish、threshold waiver 或 A/B 結論。

## Execution and stop rules

1. 在 target repo 以自己的 actor 執行 `node atm.mjs next --prompt`，讀取回傳 playbook；本卡不接管任何舊卡的 claim 或 close。
2. 先保存 raw GitHub API export 於 repo 外，再執行 validators；所有命令輸出以 ATM evidence 收錄，公開報告只保留可重跑的摘要與 digest。
3. 額外執行 `node --strip-types scripts/validate-ci-product-lane.ts --remote` 作為 live gate 診斷；它在目前窗口預期以 exit 1 暴露 release-candidate 不足，該非零結果只能存為 review/raw evidence，不得列入 `freshValidationPasses` 或被包裝成成功。
4. 若 remote validator 顯示少於兩個 release-candidate、Product CI failure、少於 90/30 天，或 API export 不完整，立即保留紅色/不確定結果並停止，不得重跑到綠、刪失敗、改門檻或宣稱 burn-in 完成。
5. 若需要修改 workflow、validator、lockfile 或 release artifact，停止並另開具體程式卡；本卡 scope 僅限兩份報告與證據收口。

## Rollback and boundaries

- 不修改 TASK-PRF-0031、TASK-PRF-0043、TASK-PRF-0050 的狀態、歷史摘要或 provenance。
- 不推送、不發布 npm、不清理 GitHub history；回滾只撤銷本卡新增的摘要文字，raw evidence 依 receipt 保留。
- 外部 raw export、API token、runtime receipt 必須留在 Git 外；若缺少任一項，驗收為 blocked/insufficient，不造數字。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T00:47:08.633Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0051-re-establish-protected-main-product-ci-burn-in-after-delivery-drift.task.md","contentDigest":"sha256:d892c622442fa874f4480144cd080a1dd11ccab24cd46134ae66dc498207d7c7"} -->
