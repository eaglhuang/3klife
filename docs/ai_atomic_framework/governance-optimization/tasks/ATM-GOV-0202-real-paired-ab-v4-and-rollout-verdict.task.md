---
task_id: ATM-GOV-0202
title: Real paired AB v4 and rollout verdict
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0198
  - ATM-GOV-0199
  - ATM-GOV-0200
  - ATM-GOV-0201
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with the final matched evidence verdict.
scopePaths:
  - scripts/analyze-captain-parallel-ledger.ts
  - scripts/fixtures/auto-batch-analyzer/**
  - packages/cli/src/commands/batch/**
  - docs/reports/captain-parallel-ledger-analysis.md
  - tests/cli/real-paired-ab-v4.test.ts
deliverables:
  - M4 matched cohort manifest and exclusion report
  - four-method validation report
  - atm.planPerformanceReport.v1 v4 verdict
  - rollout/circuit-breaker/rollback receipt
  - tests/cli/real-paired-ab-v4.test.ts
validators:
  - node --strip-types tests/cli/real-paired-ab-v4.test.ts
  - node --strip-types scripts/analyze-captain-parallel-ledger.ts --validate
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.plan-performance-analyzer
  mapUpdates: []
  extractionCandidates:
    - atom: atm.matched-cohort-verdict
      pattern: Matched Cohort Verdict
      source: scripts/analyze-captain-parallel-ledger.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m4-proof-and-ux
surfaceFamily: performance-analysis
---

# ATM-GOV-0202 Real paired AB v4 and rollout verdict

## Intent

以 0198-0201 產生的真實 observed+sealed+consumed 樣本，重新做 matched serial control / plan-executor treatment 與四種有效性驗證。這張卡不能把舊 M2 的 0/0 樣本改寫成成功；資料仍不足時，`inconclusive` 與最小補樣 proposal 是正確收口。

## Evidence Baseline

- 既有 analyzer 報告 control=0、treatment=0、matched pairs=0，broker correctness=0；四法全為 inconclusive。
- 自然前後期、fixture、啟動次數與文件產物數均不構成因果證據。

## Producer / Consumer Contract

- Producer：0198 plan treatment、0199 broker outcomes、0200 validator lifecycle、0201 runner benchmark、serial shadow controls。
- Consumer：rollout owner、default-on/circuit-breaker policy、下一輪最小補樣卡。
- Window：開工先讀四張依賴卡 sealed summaries 與 config digests；先 freeze cohort manifest，後分析。
- Role：M4 analyzer/final verdict。
- Missing-data semantics：任一必要 arm/stratum/join 缺失即該維 `inconclusive`；不可填 0 或 fixture。
- Raw-data policy：分析可讀本機 runtime archive，tracked report 只保存 aggregate、exclusion、digest 與決策 receipt。

## Required Work

- 依 scope、LOC、validator cost、build need、executor、eligible opportunity、config digest 配對並 AB/BA 交錯。
- 四法：歷史事故 replay、shadow false-positive/latency、canonical evaluator parity、matched batch A/B，各自判定可用性。
- speed、cost、safety、observability、broker correctness、runner effect 分維裁決；aggregate 不掩蓋缺哪一維。
- 全必要維度可判且通過才 default-on；否則保持 opt-in/circuit breaker 並輸出最小補樣 proposal。

## Data-Driven Stop Rule

若 0198-0201 任一 summary 未 consumed、cohort 無法匹配、config 在窗口內漂移、或安全事件未裁決，停止 rollout 判斷並回報 owner；不得放寬 pair 門檻或混合不同 config cohort。

## Acceptance

- [ ] 至少六組真實 matched pairs、AB/BA 交錯，且 exclusion manifest 完整。
- [ ] 四種驗證方法各有獨立 verdict 與 source digest。
- [ ] speed/cost/safety/observability/broker/runner 分維，不可判項明示原因。
- [ ] 安全違規為零才可能 default-on；rollback/circuit breaker 可執行。
- [ ] 樣本不足時輸出最小補樣 proposal，不用 fixture 冒充完成。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:10.865Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0202-real-paired-ab-v4-and-rollout-verdict.task.md","contentDigest":"sha256:447fb3d64a7f29349e9dc274e071793fa5c2aa40d0a9f65ede6cadcd715e470e"} -->
