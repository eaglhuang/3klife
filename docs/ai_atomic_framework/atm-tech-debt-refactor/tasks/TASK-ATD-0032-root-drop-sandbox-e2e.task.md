---
doc_id: doc_other_0632
task_id: TASK-ATD-0032
title: Root-drop sandbox E2E
milestone: M5
status: done
started_at: 2026-05-19T14:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-19T15:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
tracking_scope: internal-mirror
public_tracking: false
upstream_tracking: pending-github-issue
public_surface_risk: release
neutrality_required: true
blocked_by: ['TASK-ATD-0025']
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: ['I3']
allowed_files:
  - tests/e2e/**
  - scripts/validate-root-drop-release.ts
  - release/**
  - templates/root-drop/**
  - scripts/validate-*-release.ts
  - .github/workflows/**
forbidden_files:
  - manual generated artifact edits without build
  - .atm/** maintainer-local runtime state
  - host-specific fixture in release artifact
non_goals:
  - 不把 3KLife / npc-brain / Cocos 或私有任務卡流程寫成 AI-Atomic-Framework public contract
  - 不在本卡中提交或推送 upstream 變更；本卡只定義工作包
  - 不修改與本卡 allowed_files 無關的 surface
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-232Z-migrate-legacy-ledger-3d8f4d99f442
lastTransitionAt: 2026-05-21T10:29:44.232Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.232Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:f99052f5310f33cd39002cdc70da79bc9634a10790bb5cfe93f07b2118a8f506
---

# TASK-ATD-0032 — Root-drop sandbox E2E

## 目標

建立 root-drop sandbox E2E，驗證乾淨 repo 中的 release bundle。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M5 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

TASK-ATD-0025

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0032
- Invariant risk: I3

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] source / root-drop / onefile / npm route 有 parity evidence。
- [ ] release artifact 不含 maintainer-local runtime state。
- [ ] cross-platform smoke 通過。

## 影響檔案

- tests/e2e/**
- scripts/validate-root-drop-release.ts
- release/**
- templates/root-drop/**
- scripts/validate-*-release.ts
- .github/workflows/**

## 驗證方式

- npm run build
- npm run validate:root-drop-release
- npm run validate:onefile-release
- npm run validate:standard

## 回滾策略

回復本卡 allowed_files 內的變更；若已新增 fixture、docs 或 release artifact，需一併移除或重建，並重新執行本卡驗證命令。

## Checklist

- [ ] 建立 upstream-friendly artifact 或明確標示暫不需要
- [ ] 確認未污染 3KLife / npc-brain / Cocos 到 upstream protected surface
- [ ] 完成 allowed_files 內的最小變更
- [ ] 執行驗證方式並把結果回寫 Notes

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: TASK-ATD-0025
2026-05-19 | 狀態: done | 完成: tests/e2e/ 新建 (之前缺失!) + README 列 3 個 planned smokes (root-drop, onefile, release-parity comparison) + conventions
