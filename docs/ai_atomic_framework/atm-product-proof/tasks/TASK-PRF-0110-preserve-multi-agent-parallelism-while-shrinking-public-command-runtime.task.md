---
task_id: TASK-PRF-0110
title: Preserve multi-agent parallelism while shrinking public command runtime
status: planned
owner: codex-product-proof
priority: P0
depends_on:
  - TASK-PRF-0102
  - TASK-PRF-0107
causalGraph:
  causalDependencies: [TASK-PRF-0102, TASK-PRF-0107]
  startConditions:
    - provider-neutral deep-module review receipt is pass
    - TASK-PRF-0102 telemetry contract is closed or explicitly superseded
    - public npm candidate has a reproducible clean-install harness
  softRelations: [TASK-PRF-0105, TASK-PRF-0106]
  changedPublicSeams: [public-command-boundary, npm-runtime-lazy-loader]
  causalImpactEdges: [bundle-unpacked-bytes, mandatory-gate-wait-ms, parallel-command-preservation, clean-install-correctness]
  parallelFrontierInputs: [TASK-PRF-0102 latency baseline, TASK-PRF-0107 candidate package proof]
  validatorReferences:
    - tests/cli/command-gate-latency-score.test.ts
    - tests/cli/parallel-admission-scale-benchmark.test.ts
    - tests/cli/mandatory-gate-telemetry.test.ts
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm-public.ts
  - scripts/build-cli-npm-runtime.ts
  - packages/cli/src/commands/next/route-resolution/runtime.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/broker/implementation.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/core/src/telemetry/observation.ts
  - scripts/plan-performance-report-v4.ts
  - tests/cli/command-gate-latency-score.test.ts
  - tests/cli/mandatory-gate-telemetry.test.ts
  - tests/cli/parallel-admission-scale-benchmark.test.ts
deliverables:
  - packages/cli/src/atm-public.ts
  - scripts/build-cli-npm-runtime.ts
  - packages/cli/src/commands/next/route-resolution/runtime.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/broker/implementation.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/core/src/telemetry/observation.ts
  - scripts/plan-performance-report-v4.ts
  - tests/cli/command-gate-latency-score.test.ts
  - tests/cli/mandatory-gate-telemetry.test.ts
  - tests/cli/parallel-admission-scale-benchmark.test.ts
validators:
  - node --strip-types tests/cli/command-gate-latency-score.test.ts
  - node --strip-types tests/cli/mandatory-gate-telemetry.test.ts
  - node --strip-types tests/cli/parallel-admission-scale-benchmark.test.ts
  - clean npm install plus version/doctor/bootstrap/atm-chart/next/tasks/broker/taskflow matrix
  - same-runner AB/BA latency benchmark with A/A controls
  - npm run typecheck
testContributions:
  - caseId: test_public_command_boundary_preserves_parallel_surface_7e1f9a2c
    targetGroupId: null
    semanticKey: public_command_boundary_parallel_surface
    coversAcceptance: [ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [parallel-command-preservation, clean-install-correctness]
    expectedRedPredicate: tasks, broker, or taskflow is missing or cannot execute a valid task through the candidate boundary
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: public-command-boundary
    contractEdge: parallel-command-contract
    resourceKey: null
  - caseId: test_public_command_boundary_lazy_loading_31aa50d4
    targetGroupId: null
    semanticKey: public_command_boundary_lazy_loading
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [bundle-unpacked-bytes, clean-install-correctness]
    expectedRedPredicate: unrelated command graph is eagerly included or a declared command resolves through a missing module
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: npm-runtime-lazy-loader
    contractEdge: lazy-command-loader
    resourceKey: null
  - caseId: test_mandatory_gate_latency_regression_4f7c2b91
    targetGroupId: null
    semanticKey: mandatory_gate_latency_regression
    coversAcceptance: [ACC-5]
    coversImpactEdges: [mandatory-gate-wait-ms]
    expectedRedPredicate: candidate mandatory waiting p50 does not improve by 20 percent or p95 regresses by more than 10 percent
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: mandatory-gate-telemetry
    contractEdge: command-gate-latency-score
    resourceKey: null
  - caseId: test_external_cost_fields_preserved_91bd6e03
    targetGroupId: null
    semanticKey: external_cost_fields_preserved
    coversAcceptance: [ACC-6]
    coversImpactEdges: [mandatory-gate-wait-ms, clean-install-correctness]
    expectedRedPredicate: failure, retry, false-block, missed-conflict, human-minute, token, or billed-cost fields are fabricated, dropped, or treated as zero when unavailable
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: external-net-benefit-telemetry
    contractEdge: attributable-telemetry-contract
    resourceKey: null
requiredTestCaseIds:
  - test_public_command_boundary_preserves_parallel_surface_7e1f9a2c
  - test_public_command_boundary_lazy_loading_31aa50d4
  - test_mandatory_gate_latency_regression_4f7c2b91
  - test_external_cost_fields_preserved_91bd6e03
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the single command-boundary/lazy-loader commit while preserving all failed receipts and external bundle evidence.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-runtime-map
  mapUpdates: []
  extractionCandidates:
    - disposition: extract
      inlineReason: null
      atom: atm.public-command-boundary
      pattern: Adapter
      source: packages/cli/src/atm-public.ts
    - disposition: follow-up-card
      inlineReason: null
      atom: atm.route-resolution-state-reader
      pattern: Policy Object
      source: packages/cli/src/commands/next/route-resolution/runtime.ts
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0110 Preserve multi-agent parallelism while shrinking public command runtime

## Intent

建立一個可替換的 `PublicCommandBoundary`，把 public CLI 的命令選擇、能力宣告
與 lazy runner loading 集中在單一介面，降低 npm runtime 與必經 gate 成本，同時
保留 `tasks`、`broker`、`taskflow` 的多 AI 並行交付能力。這張卡不是新增治理流程，
而是移除重複載入與重複掃描。

## Acceptance

- [ ] ACC-1：候選 npm 套件在乾淨環境可安裝，`version`、`doctor`、`bootstrap`、
  `atm-chart render/verify`、`next`、`tasks`、`broker`、`taskflow` 全部通過有效
  工作矩陣；不得以 invalid-argument 探測代替有效任務證據。
- [ ] ACC-2：`PublicCommandBoundary` 至少有 frozen/in-process 與 installed-npm
  兩個 production adapter，fixture adapter 只用於介面測試；未知命令與錯誤語義
  維持不變，沒有第二 registry、daemon 或隱藏下載。
- [ ] ACC-3：相較目前 2,653,486 bytes / 66 entries baseline，解壓後大小與 entries
  必須下降；若未達 20% 仍須保留並行能力並誠實標示未達，不得刪除並行命令換取數字。
- [ ] ACC-4：`tasks`、`broker`、`taskflow` 的 module loading、有效任務執行、共享
  寫入 broker 語義與 conflict/queue 行為均通過 regression；不得以模組存在但命令
  不可用宣稱保留能力。
- [ ] ACC-5：每個 ATM 命令與必經 gate 的真實 durationMs 可投影到既有 latency score；
  同 runner AB/BA 加 A/A 控制中，必經等待 p50 至少下降 20%，p95 不回歸超過 10%。
- [ ] ACC-6：保留失敗、blocked、timeout、retry、false-block、missed-conflict、
  人工分鐘、Token 與費用欄位；無法取得的值為 `null`，不可補零或只保留最後成功。

## Stop rules

若任何並行命令消失、有效任務語義改變、出現 module-resolution failure、p95 回歸
超過 10%，或瘦身依賴未量測下載，立即保留反證並回退單一提交，不擴張成新的治理層。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-15T02:30:24.768Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0110-preserve-multi-agent-parallelism-while-shrinking-public-command-runtime.task.md","contentDigest":"sha256:1510a0d661489ee5dbf71574a6761b64e5fbbf6848acae9f044ee6479f64ea99"} -->
