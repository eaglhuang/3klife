---
doc_id: doc_other_0153
task_id: TASK-MRP-0013
title: Map 升級自動推進（draft→shadow→canary→active）
milestone: M13
status: done
started_at: 2026-05-21T07:55:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T08:15:00Z
blocked_by: [TASK-MRP-0012, TASK-MRP-0020, TASK-MRP-0025]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
lastTransitionId: 2026-05-21T10-29-44-334Z-migrate-legacy-ledger-4511eedf3200
lastTransitionAt: 2026-05-21T10:29:44.334Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.334Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:63d42195ef3a52f932a95c57b9126194907526e5b3a971706af8ebfddce81c35
---

# TASK-MRP-0013 — Map 升級自動推進（draft→shadow→canary→active）

## 目標

目前 replacement lane 的每次轉移（`draft→shadow→canary→active`）都需要人工執行 `atm review rollout-ready` 並核准。本卡新增可設定的自動推進規則：當定量標準達到閾值（例如 shadow 連續 N 天 output 一致率 > 99%），系統自動產生 promotion proposal 等待最終人工確認，減少人工確認點但保留人類最終把關。

## 前置依賴

- TASK-MRP-0006（replacement lane transition）
- TASK-MRP-0012（edge contract 自動測試）
- TASK-MRP-0020（shadow A/B 定量報告，依賴關係可並行）

## 輸入

- `replacement.progression-policy.json`（新增：每個 lane 轉移的定量門檻設定）
- shadow 模式下的 A/B 比對報告（TASK-MRP-0020 產出）
- `lineage-log.json`

## 輸出

1. `replacement.progression-policy.json` schema 與範例
2. `node atm.mjs review check-progression --map <id> --json`
   - 評估當前 lane 是否達到自動推進門檻
   - 回傳 `canPromote: bool`、`blockedReasons[]`、`nextProposalHint`
3. 自動產生 promotion proposal（status=`pending-human-approval`），推進後仍需一次人工確認
4. 人工 override：任意時刻可強制停止自動推進

## 驗收條件

- [ ] 門檻未達時 `canPromote: false`，附明確 blockedReasons
- [ ] 門檻達到後自動產生 proposal，status 為 `pending-human-approval`（非直接 active）
- [ ] `--force-pause` flag 可暫停自動推進
- [ ] policy 設 `automationLevel: "off"` 時完全回退人工模式
- [ ] 正負 fixtures 各一

## 影響檔案

- `packages/core/src/registry/progression-policy.ts`（新增）
- `packages/core/src/cli/review.ts`（新增 `check-progression` subcommand）
- `schemas/governance/replacement-progression-policy.schema.json`（新增）
- `tests/registry/progression-policy.test.ts`（新增）

## 回滾策略

移除 progression-policy 實作；lane transition 回退全人工模式；既有 lineage-log 不受影響。

## 2026-05-21 v2-r2 審查補充

- Progression automation 只能產生 promotion proposal，不能直接把 lane 推到 `active`。
- `automationLevel` 預設必須是 `off`；啟用後仍需 human review gate。
- 判斷門檻需同時讀取 M20 的 sample size、confidence window、shadow days、critical divergence 與 M25 evidence readiness。
- `pending-human-approval` proposal 必須附 rollback readiness 與 blockedReasons。

新增驗收：
- [ ] 無 M20 shadow report 時不可產生 promotion proposal
- [ ] 無有效 M25 evidence draft 時 `canPromote=false`
- [ ] `automationLevel:"off"` 完全維持人工流程
- [ ] 達標時只產生 proposal，不直接 mutate lane

## Checklist

- [x] progression-policy schema 定義完成（automationLevel 預設 'off'）
- [x] check-progression CLI 完成（atm review check-progression --map <id>）
- [x] proposal 自動生成（pending-human-approval，不直接 mutate lane）
- [x] force-pause override 完成（--force-pause flag）
- [ ] CHANGELOG 補記

## notes

core/registry/progression-policy.ts + review check-progression subcommand.
automationLevel defaults to 'off'. Proposal only generated when all gates pass.
Never directly mutates lane state — human approval required.
