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
  - scripts/captain-parallel-ledger-report.ts
  - scripts/plan-performance-report-v3.ts
  - scripts/fixtures/auto-batch-analyzer/**
  - packages/cli/src/commands/batch/**
  - docs/reports/captain-parallel-ledger-analysis.md
  - tests/cli/real-paired-ab-v4.test.ts
deliverables:
  - scripts/analyze-captain-parallel-ledger.ts
  - scripts/captain-parallel-ledger-report.ts
  - scripts/plan-performance-report-v3.ts
  - scripts/fixtures/auto-batch-analyzer/**
  - packages/cli/src/commands/batch/**
  - docs/reports/captain-parallel-ledger-analysis.md
  - tests/cli/real-paired-ab-v4.test.ts
validators:
  - node --strip-types tests/cli/real-paired-ab-v4.test.ts
  - node --strip-types scripts/analyze-captain-parallel-ledger.ts --validate --require-sealed-cohorts
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Keep treatment opt-in until the sufficient-data branch passes; restore the prior config digest through the circuit breaker and verify the emitted recovery command and receipt.
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
- Window：開工先讀四張依賴卡 sealed summaries 與 config digests，逐張寫 cross-card consumed receipt 與 opening `dataDrivenDecision`；先 freeze cohort manifest，後分析，close 前 seal 0202 summary 並做同卡 readback。
- Role：M4 analyzer/final verdict。
- Missing-data semantics：任一必要 arm/stratum/join 缺失即該維 `inconclusive`；不可填 0 或 fixture。
- Raw-data policy：分析可讀本機 runtime archive，tracked report 只保存 aggregate、exclusion、digest 與決策 receipt。

## Required Work

- 依 scope、LOC、validator cost、build need、executor、eligible opportunity、config digest 配對並 AB/BA 交錯。
- 四法：歷史事故 replay、shadow false-positive/latency、canonical evaluator parity、matched batch A/B，各自判定可用性。
- speed、cost、safety、observability、broker correctness、runner effect 分維裁決；aggregate 不掩蓋缺哪一維。
- 全必要維度可判且通過才 default-on；否則保持 opt-in/circuit breaker 並輸出最小補樣 proposal。
- `--validate` 必須是 fail-closed 真分支：任一 dependency summary/config digest 未 sealed 或未 consumed、必要 cohort/arm/stratum/join 缺失、cohort 漂移或 report digest 不一致時，以非零 exit code 失敗；不得只解析後忽略旗標。
- rollback receipt 必須包含可執行 recovery command，將 policy/circuit breaker 還原至既有 config digest；在 sufficient-data 分支通過前 treatment 一律維持 opt-in。

## Data-Driven Stop Rule

若 0198-0201 任一 summary 未 consumed、cohort 無法匹配、config 在窗口內漂移、或安全事件未裁決，停止 rollout 判斷並回報 owner；不得放寬 pair 門檻或混合不同 config cohort。

## Acceptance

共同條件：

- [ ] 0198–0201 的 sealed summaries/config digests 均有 0202 cross-card consumed receipt，opening `dataDrivenDecision` 可追溯。
- [ ] 四種驗證方法各有獨立 verdict 與 source digest；speed/cost/safety/observability/broker/runner 分維，不可判項明示原因。
- [ ] `--validate --require-sealed-cohorts` 對缺 summary、未 consumed、cohort 漂移與 digest mismatch 均 fail closed。
- [ ] rollback/circuit breaker recovery command 已在隔離環境執行並驗證 receipt；0202 sealed summary 已完成同卡 readback。

以下兩個互斥分支擇一完成：

- [ ] **A — rollout verdict**：至少六組真實 matched pairs、AB/BA 交錯且 exclusion manifest 完整；所有必要維度可判、安全違規為零，才可產生 rollout/default-on verdict。
- [ ] **B — data-insufficient closeout**：不足六組或任一必要維度不可判時，保留 aggregate=`inconclusive`，輸出完整 exclusion manifest 與最小補樣 proposal，維持 opt-in/circuit breaker；不得以 fixture、填零或降門檻冒充 A 分支。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:10.865Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0202-real-paired-ab-v4-and-rollout-verdict.task.md","contentDigest":"sha256:447fb3d64a7f29349e9dc274e071793fa5c2aa40d0a9f65ede6cadcd715e470e"} -->
