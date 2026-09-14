---
task_id: TASK-PRF-0058
title: Collect protected-main CI lifecycle evidence for a rerunnable 30-day burn-in proof
status: done
owner: ci-evidence-steward
priority: P1
depends_on: [TASK-PRF-0055]
causalGraph:
  causalDependencies: [TASK-PRF-0055]
  startConditions:
    - "The 100-run protected-main export is missing attempt-level lifecycle fields and the evaluator returns invalid-input instead of a green claim."
    - "GitHub Actions run and job/attempt exports can be retained outside Git without exposing credentials or raw provider payloads in the repository."
  softRelations: [TASK-PRF-0051, TASK-PRF-0031, TASK-PRF-0033]
  changedPublicSeams: [protected_main_ci_lifecycle_evidence]
  causalImpactEdges: [ci_burn_in_claim, ci_failure_cost_observability]
  parallelFrontierInputs: [github_run_attempt_export, github_job_attempt_export]
  validatorReferences: [test_prf_ci_lifecycle_collector, test_prf_ci_lifecycle_fail_closed]
  phaseOwner: ci
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/collect-ci-burn-in-evidence.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/fixtures/product-ci-burn-in/lifecycle-attempts.json
  - docs/reports/atm-product-ci-lifecycle-evidence.md
deliverables:
  - scripts/collect-ci-burn-in-evidence.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/fixtures/product-ci-burn-in/lifecycle-attempts.json
  - docs/reports/atm-product-ci-lifecycle-evidence.md
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types scripts/measure-product-ci-burn-in.ts --input tests/fixtures/product-ci-burn-in/lifecycle-attempts.json --report-only
  - npm run typecheck
  - npm run lint
testContributions:
  - caseId: test_prf_ci_lifecycle_collector
    targetGroupId: null
    semanticKey: protected_main_ci_lifecycle_collector
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [ci_burn_in_claim, ci_failure_cost_observability]
    expectedRedPredicate: "A retry or repair interval is omitted, guessed from an unrelated timestamp, or a successful run is treated as green without its failed predecessor."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0055
    contractEdge: protected_main_ci_lifecycle_evidence
    resourceKey: github-run-attempt-export
  - caseId: test_prf_ci_lifecycle_fail_closed
    targetGroupId: null
    semanticKey: ci_lifecycle_missing_metadata
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [ci_burn_in_claim]
    expectedRedPredicate: "Missing run-attempt, failure class, job outcome, or exclusion reason is accepted as zero or produces a long-term-green result."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0055
    contractEdge: protected_main_ci_lifecycle_evidence
    resourceKey: lifecycle-negative-fixtures
  - caseId: test_prf_ci_lifecycle_replay_digest
    targetGroupId: null
    semanticKey: ci_lifecycle_rerunnable_receipt
    coversAcceptance: [ACC-6]
    coversImpactEdges: [ci_failure_cost_observability]
    expectedRedPredicate: "The same sealed inputs do not reproduce the same canonical receipt digest and burn-in evaluation."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0055
    contractEdge: protected_main_ci_lifecycle_evidence
    resourceKey: deterministic-replay
requiredTestCaseIds: [test_prf_ci_lifecycle_collector, test_prf_ci_lifecycle_fail_closed, test_prf_ci_lifecycle_replay_digest]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: external-github-attempt-export-with-canonical-receipt-and-replay-digest
rollback:
  strategy: revert-commit-retain-external-receipt
  notes: "回滾 collector 或 schema 時保留外部 raw export 與失敗 receipt；不刪除 GitHub 證據、不改 CI 歷史。"
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-burn-in-evidence
  mapUpdates: []
  extractionCandidates:
    - atom: atm.ci-lifecycle-evidence-collector
      pattern: Policy Object
      source: scripts/collect-ci-burn-in-evidence.ts
      disposition: inline
      inlineReason: "本卡只建立單一外部證據轉換器；待多個 provider 複用同一契約後再開 deep-module 抽取卡。"
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T03:46:11.742Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T03:46:11.742Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T03-46-11-742Z-close-8ecbe3994893"
lastTransitionAt: "2026-09-14T03:46:11.742Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b05dda470aec12beac1df76fad6fa289c4b18afc"
---

# TASK-PRF-0058 Collect protected-main CI lifecycle evidence for a rerunnable 30-day burn-in proof

## Intent

TASK-PRF-0055 已把 burn-in evaluator 改成要求每筆 protected-main 觀察都帶
first failure、retry、repair time、failure class 與 exclusion provenance；但
目前真實 GitHub export 只有 workflow-run 摘要，沒有 attempt/job lifecycle，
所以 evaluator 只能安全地回 `invalid-input`。這張 follow-up 卡只補證據收集
與 deterministic replay，不降低 30 天／90 次門檻，也不把缺少 telemetry 的
情況填成零。

輸入是 GitHub run-attempt 與 job-attempt 的去敏匯出，原始 payload 留在
`atm-benchmark-sink` 等 repo 外部保存區；輸出是可直接餵給
`measure-product-ci-burn-in.ts` 的 newest-first `CiRun[]` receipt。每個失敗
attempt 必須有明確 failure timestamp 與 failure class；每個排除項必須有
exclusion reason；修復時間只由同一 logical run 的失敗 attempt 到後續成功
attempt 計算，不能用最後更新時間猜測。

## Acceptance

- [ ] ACC-1: collector 接受明確 schema 的 run-attempt/job-attempt export，驗證
      protected `main`、允許的 event、Product CI job 結果、run attempt 順序、
      head SHA 與所有必要時間欄位；缺欄位立即 fail closed。
- [ ] ACC-2: collector 以 stable logical run id 分組，輸出
      `firstFailureAt`、`retryCount`、`lastAttemptAt`、`repairAcceptedAt`、
      `failureClass`；repair time 只來自明確 attempt timestamps，不可把缺失
      值補成零或從 unrelated run 推導。
- [ ] ACC-3: 輸出與 `measure-product-ci-burn-in.ts` 的 `CiRun` lifecycle 契約
      相容，保留 newest-first 順序、run id、conclusion、head SHA 與
      `eligible/exclusionReason`，並產生 canonical receipt digest。
- [ ] ACC-4: 缺少 run-attempt、job outcome、failure class、修復關係或排除原因
      的 negative fixture 必須回 `invalid-input`／blocked，絕不能產生
      `long-term-green`。
- [ ] ACC-5: collector 不把 raw provider payload、token、環境秘密或 mutable
      GitHub response 直接寫入 Git；report 只記錄外部 receipt 路徑、digest、
      query bounds、版本與重播命令。
- [ ] ACC-6: 同一組 sealed fixture 連跑兩次產生相同 receipt digest 與 evaluator
      結果；重播命令可在無網路、無 credential 的乾淨環境執行，並保留首次
      失敗、重試、修復時間、排除項與 30/90 門檻的完整輸出。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T03:30:09.709Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0058-collect-protected-main-ci-lifecycle-evidence-for-a-rerunnable-30-day-burn-in-proof.task.md","contentDigest":"sha256:89ce369d6f5d5482a86270a31a780d4c43eee841d7931f03ce8f829b6c3cbbf3"} -->
