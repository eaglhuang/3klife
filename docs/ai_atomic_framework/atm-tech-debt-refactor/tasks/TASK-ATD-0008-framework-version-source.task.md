---
doc_id: doc_other_0608
task_id: TASK-ATD-0008
title: framework version 來源改為 package / release manifest
milestone: M1
status: done
started_at: 2026-05-18T16:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-18T17:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
tracking_scope: internal-mirror
public_tracking: false
upstream_tracking: pending-github-issue
public_surface_risk: cli
neutrality_required: true
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: ['I6']
allowed_files:
  - package.json
  - packages/cli/src/**
  - tests/cli/**
  - scripts/validate-cli.ts
forbidden_files:
  - public JSON breaking change without migration
  - release/** generated output without build
  - adopter-specific command behavior
non_goals:
  - 不把 3KLife / npc-brain / Cocos 或私有任務卡流程寫成 AI-Atomic-Framework public contract
  - 不在本卡中提交或推送 upstream 變更；本卡只定義工作包
  - 不修改與本卡 allowed_files 無關的 surface
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-207Z-migrate-legacy-ledger-2683be37000b
lastTransitionAt: 2026-05-21T10:29:44.207Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.207Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:26d4f050a7916fa8d20dc6666933be1e2b7d1a83ad2f612d324b9849f504cb5e
---

# TASK-ATD-0008 — framework version 來源改為 package / release manifest

## 目標

集中 framework version 來源到 package / release manifest。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M1 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

無

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0008
- Invariant risk: I6

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] `node atm.mjs <command> --json` 既有 shape 不破。
- [ ] exit code 與 message code 有 fixture 保護。
- [ ] source 與 release wrapper 行為沒有無證據漂移。

## 影響檔案

- package.json
- packages/cli/src/**
- tests/cli/**
- scripts/validate-cli.ts

## 驗證方式

- npm run validate:cli
- npm run validate:standard
- npm run typecheck

## 回滾策略

回復本卡 allowed_files 內的變更；若已新增 fixture、docs 或 release artifact，需一併移除或重建，並重新執行本卡驗證命令。

## Checklist

- [ ] 建立 upstream-friendly artifact 或明確標示暫不需要
- [ ] 確認未污染 3KLife / npc-brain / Cocos 到 upstream protected surface
- [ ] 完成 allowed_files 內的最小變更
- [ ] 執行驗證方式並把結果回寫 Notes

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: none

2026-05-18 | 狀態: done | 完成:
- shared.ts 新增 readFrameworkVersion() 中央 helper (讀 package.json 帶 fallback)
- init.ts 改用 readFrameworkVersion() 取代 hardcoded const
- atm-chart.ts readFrameworkPackageVersion() 改為 delegate 到 shared
- validate:cli ok; validate:standard passed=53/53; typecheck packages/ 清零
