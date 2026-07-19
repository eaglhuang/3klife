---
task_id: ATM-GOV-0190
title: Real Paired A/B、Analyzer v3 與 Rollout Verdict
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0189
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: auto-batch 的真實效能與 rollout 證明是 ATM-GOV 計畫終點，配置 0190。
scopePaths:
  - scripts/analyze-captain-parallel-ledger.ts
  - packages/cli/src/commands/batch/**
  - scripts/fixtures/auto-batch-analyzer/**
  - docs/reports/captain-parallel-ledger-analysis.md
  - tests/cli/real-paired-ab-analyzer-v3.test.ts
deliverables:
  - atm.planPerformanceReport.v1 analyzer v3
  - deterministic replay、prospective paired dogfood 與 rollout verdict
validators:
  - node --strip-types tests/cli/real-paired-ab-analyzer-v3.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: keep rollout disabled and revert analyzer/default changes
errorCodes: []
atomizationImpact:
  ownerAtomOrMap: atm.plan-performance-analyzer
  mapUpdates: []
  extractionCandidates:
    - atom: atm.plan-performance-analyzer
      pattern: Analyzer
      source: scripts/analyze-captain-parallel-ledger.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: performance-evidence
---

# ATM-GOV-0190 - Real Paired A/B、Analyzer v3 與 Rollout Verdict

以 lane/ticket/report/receipt/commit/checkpoint/provider usage 直接 join 真實 control/treatment，輸出 speed、cost、safety、batching 四維 verdict 與 sharedSurfaceWaitRatio。

本卡不新增 ErrorCode。`improved`、`inconclusive`、`regressed` 與缺某一維樣本都是 report verdict；任一實際 runtime failure 必須重用其來源階段已登錄的代碼，不建立 analyzer 私有码。
