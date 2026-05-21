---
doc_id: doc_other_0153
task_id: TASK-MRP-0013
title: Map 升級自動推進（draft→shadow→canary→active）
milestone: M13
status: planned
blocked_by: [TASK-MRP-0012]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
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

## Checklist

- [ ] progression-policy schema 定義完成
- [ ] check-progression CLI 完成
- [ ] proposal 自動生成（pending-human-approval）完成
- [ ] force-pause override 完成
- [ ] CHANGELOG 補記
