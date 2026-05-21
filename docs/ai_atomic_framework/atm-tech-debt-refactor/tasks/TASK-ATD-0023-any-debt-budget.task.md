---
doc_id: doc_other_0623
task_id: TASK-ATD-0023
title: `any` debt budget（package / public contract 分層）
milestone: M3
status: done
started_at: 2026-05-19T14:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-19T15:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
tracking_scope: internal-mirror
public_tracking: false
upstream_tracking: pending-github-issue
public_surface_risk: none
neutrality_required: false
blocked_by: ['TASK-ATD-0006']
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: []
allowed_files:
  - eslint.config.mjs
  - tsconfig*.json
  - packages/**/src/**
  - scripts/**
  - tests/**
  - docs/**
forbidden_files:
  - unrelated large refactor
  - public contract changes without fixture
  - 3KLife-specific upstream behavior
non_goals:
  - 不把 3KLife / npc-brain / Cocos 或私有任務卡流程寫成 AI-Atomic-Framework public contract
  - 不在本卡中提交或推送 upstream 變更；本卡只定義工作包
  - 不修改與本卡 allowed_files 無關的 surface
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-223Z-migrate-legacy-ledger-e4362957d010
lastTransitionAt: 2026-05-21T10:29:44.223Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.223Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:e1245cdc25571597a57ab6b17a82091351af2c0411c5e7d32f6cf96930b3fc88
---

# TASK-ATD-0023 — `any` debt budget（package / public contract 分層）

## 目標

建立 package/public-contract 分層的 `any` debt budget。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M3 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

TASK-ATD-0006

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0023
- Invariant risk: none

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] 變更範圍與本卡目標相符。
- [ ] 不混入 public contract 或 adopter-specific 行為。
- [ ] quick / standard validators 通過。

## 影響檔案

- eslint.config.mjs
- tsconfig*.json
- packages/**/src/**
- scripts/**
- tests/**
- docs/**

## 驗證方式

- npm run validate:quick
- npm run validate:standard

## 回滾策略

回復本卡 allowed_files 內的變更；若已新增 fixture、docs 或 release artifact，需一併移除或重建，並重新執行本卡驗證命令。

## Checklist

- [ ] 建立 upstream-friendly artifact 或明確標示暫不需要
- [ ] 確認未污染 3KLife / npc-brain / Cocos 到 upstream protected surface
- [ ] 完成 allowed_files 內的最小變更
- [ ] 執行驗證方式並把結果回寫 Notes

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: TASK-ATD-0006
2026-05-19 | 狀態: done | 完成: docs/any-debt-budget.md 建立基線 (734 any 在 packages/) + 分層 budget; eslint.config.mjs 加入 @typescript-eslint/no-explicit-any: 'warn' 限定 packages/*/src/**
