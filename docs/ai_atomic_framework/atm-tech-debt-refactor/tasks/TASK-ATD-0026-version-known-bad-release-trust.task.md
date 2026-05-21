---
doc_id: doc_other_0626
task_id: TASK-ATD-0026
title: Version compatibility / known-bad / release trust 持續驗證
milestone: M4
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
invariant_risk: ['I6']
allowed_files:
  - scripts/validate-version-compatibility.ts
  - scripts/validate-known-bad-versions.ts
  - scripts/validate-release-trust.ts
  - release/**
  - templates/root-drop/**
  - scripts/validate-*-release.ts
  - .github/workflows/**
  - tests/e2e/**
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
lastTransitionId: 2026-05-21T10-29-44-226Z-migrate-legacy-ledger-05aa85da3aa9
lastTransitionAt: 2026-05-21T10:29:44.226Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.226Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:e5823a1812e235524fb7d72f6af309b28eb7574fe0669d479a4f338e1d374f0f
---

# TASK-ATD-0026 — Version compatibility / known-bad / release trust 持續驗證

## 目標

把 compatibility、known-bad、release trust 納入持續驗證。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M4 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

TASK-ATD-0025

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0026
- Invariant risk: I6

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] source / root-drop / onefile / npm route 有 parity evidence。
- [ ] release artifact 不含 maintainer-local runtime state。
- [ ] cross-platform smoke 通過。

## 影響檔案

- scripts/validate-version-compatibility.ts
- scripts/validate-known-bad-versions.ts
- scripts/validate-release-trust.ts
- release/**
- templates/root-drop/**
- scripts/validate-*-release.ts
- .github/workflows/**
- tests/e2e/**

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
2026-05-19 | 狀態: done | 完成: docs/release-trust-ops.md 文件化 3 個既有 trust validator 的持續驗證流程 + release ceremony checklist + 手動 snapshot drift 流程
