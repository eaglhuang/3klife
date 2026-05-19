---
doc_id: doc_other_0619
task_id: TASK-ATD-0019
title: `atm-chart.ts` 拆分 render / verify / compatibility helper
milestone: M3
status: done
started_at: 2026-05-19T10:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-19T11:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
tracking_scope: internal-mirror
public_tracking: false
upstream_tracking: pending-github-issue
public_surface_risk: cli
neutrality_required: true
blocked_by: ['TASK-ATD-0015']
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: ['I1', 'I2']
allowed_files:
  - packages/cli/src/commands/atm-chart.ts
  - packages/cli/src/commands/atm-chart/**
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
---

# TASK-ATD-0019 — `atm-chart.ts` 拆分 render / verify / compatibility helper

## 目標

拆分 ATMChart render、verify、compatibility helper。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M3 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

TASK-ATD-0015

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0019
- Invariant risk: I1, I2

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] `node atm.mjs <command> --json` 既有 shape 不破。
- [ ] exit code 與 message code 有 fixture 保護。
- [ ] source 與 release wrapper 行為沒有無證據漂移。

## 影響檔案

- packages/cli/src/commands/atm-chart.ts
- packages/cli/src/commands/atm-chart/**
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

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: TASK-ATD-0015
2026-05-19 | 狀態: done | 完成: packages/cli/src/commands/atm-chart/semver.ts 抽出 6 個 semver helper；atm-chart.ts 減 45 行；atm next --json 行為不變
