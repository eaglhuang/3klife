---
task_id: TASK-PRF-0102
title: Instrument mandatory ATM gates with millisecond telemetry
status: done
owner: codex-product-proof
priority: P1
depends_on: []
causalGraph:
  causalDependencies: [TASK-PRF-0101]
  startConditions: []
  softRelations: [TASK-PRF-0099, TASK-PRF-0100]
  changedPublicSeams: [product-proof-performance-report, gate-telemetry-event-chain]
  causalImpactEdges: [mandatory-gate-coverage, fixed-task-wait-ms, hotspot-ranking]
  parallelFrontierInputs: [TASK-PRF-0101 latency score]
  validatorReferences: [tests/cli/mandatory-gate-telemetry.test.ts, tests/cli/command-gate-latency-score.test.ts]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
  - packages/cli/src/commands/framework-development/critical-path-gate.ts
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/broker/implementation.ts
  - packages/cli/src/commands/telemetry.ts
  - packages/core/src/telemetry/observation.ts
  - scripts/plan-performance-report-v4.ts
  - tests/cli/mandatory-gate-telemetry.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
  - packages/cli/src/commands/framework-development/critical-path-gate.ts
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/broker/implementation.ts
  - packages/cli/src/commands/telemetry.ts
  - packages/core/src/telemetry/observation.ts
  - scripts/plan-performance-report-v4.ts
  - tests/cli/mandatory-gate-telemetry.test.ts
  - docs/reports/atm-command-gate-latency-score.md
validators:
  - "node --strip-types tests/cli/mandatory-gate-telemetry.test.ts"
  - "node --strip-types tests/cli/command-gate-latency-score.test.ts"
  - "node --strip-types tests/cli/gate-telemetry-observed-chain.test.ts"
  - "npm run typecheck"
testContributions:
  - caseId: test_mandatory_gate_telemetry_62c0a4fd
    targetGroupId: null
    semanticKey: mandatory_gate_telemetry
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [mandatory-gate-coverage, fixed-task-wait-ms, hotspot-ranking]
    expectedRedPredicate: "A mandatory gate invocation without a monotonic duration/outcome event, or an event with missing correlation, is rejected."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: mandatory-gate-telemetry-contract
    contractEdge: gate-telemetry-event-chain
    resourceKey: null
requiredTestCaseIds: [test_mandatory_gate_telemetry_62c0a4fd]
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
  notes: "Revert only event instrumentation and its tests/report projection; preserve the 0101 pure score functions and external receipts."
atomizationImpact:
  ownerAtomOrMap: atm.telemetry-observation-map
  mapUpdates: []
  extractionCandidates:
    - disposition: follow-up-card
      inlineReason: null
      atom: atm.command-gate-telemetry-adapter
      pattern: Adapter
      source: packages/cli/src/atm.ts
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-15T02:52:56.025Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-15T02:52:56.025Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-15T02-52-56-025Z-close-38af51ae0603"
lastTransitionAt: "2026-09-15T02:52:56.025Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ea324151ec92d564c18dcd995cacba7e702213b2"
---

# TASK-PRF-0102 Instrument mandatory ATM gates with millisecond telemetry

## Intent

0101 已證明評分器可從既有 telemetry report 產生毫秒排行榜，但真實覆蓋只有 2/8。此卡補齊六個已註冊的 command/gate 事件，讓每個 ATM 必經點的實際等待成本可被量測、排序與回歸比較；不新增治理命令、第二套 registry、常駐服務或 raw evidence 入 Git。

事件必須使用 monotonic clock，至少包含 command、gate、task/run correlation、durationMs、outcome、failure/timeout/retry/recovery counters、runner/version 摘要；未知值保持 `null`。所有事件沿用既有 runtime JSONL 與 0101 report projection，並維持 nested span 聯集避免父子重複計算。

## Acceptance

- [ ] ACC-1：`doctor.readiness`、`guard.framework-mode`、`tasks.claim-admission`、`taskflow.close-readiness`、`batch.checkpoint-readiness`、`broker.shared-surface-admission` 在真實命令路徑各產生可驗證事件；事件缺 correlation、負 duration 或非終態 outcome 時測試 fail。
- [ ] ACC-2：`telemetry --report --include-runtime --json` 將事件投影至 0101 的同一份 `latencyScore`，輸出 coverage、unknown、p50/p95、inclusive/exclusive、累積必經等待、失敗／timeout／retry／recovery 與測量 overhead；未跑過的路徑不能顯示 0。
- [ ] ACC-3：以固定 workload 產生至少 30 組 baseline，報告每個 gate 的樣本數與頻次，依頻次加權累積成本及 p50/p95 排名；p50 或 p95 ≥1,000 ms 標為 hotspot，≥5,000 ms 優先診斷。
- [ ] ACC-4：量測開銷相對 command wall time 可辨識且不改變既有命令結果；新增測試、typecheck 與 encoding guard 通過，並以單一 revert commit 可回退。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T18:20:13.496Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0102-instrument-mandatory-atm-gates-with-millisecond-telemetry.task.md","contentDigest":"sha256:82e2e80334fc0f8ab3e474b50991295988fb869431a599e4b932dee4b78a93f4"} -->