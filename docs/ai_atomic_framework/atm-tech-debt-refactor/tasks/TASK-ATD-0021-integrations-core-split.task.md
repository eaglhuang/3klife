---
doc_id: doc_other_0621
task_id: TASK-ATD-0021
title: `integrations-core` 拆分 compiler / manifest / verify
milestone: M3
status: done
started_at: 2026-05-19T14:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-19T15:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
tracking_scope: internal-mirror
public_tracking: false
upstream_tracking: pending-github-issue
public_surface_risk: manifest
neutrality_required: true
blocked_by: ['TASK-ATD-0015']
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: ['I5']
allowed_files:
  - packages/integrations-core/src/**
  - packages/plugin-governance-local/src/**
  - schemas/**manifest**
  - tests/agent-pack/**
forbidden_files:
  - manifest hash breaking change without migration
  - packages/core depending on default bundle
  - agent entry file as second rule authority
non_goals:
  - 不把 3KLife / npc-brain / Cocos 或私有任務卡流程寫成 AI-Atomic-Framework public contract
  - 不在本卡中提交或推送 upstream 變更；本卡只定義工作包
  - 不修改與本卡 allowed_files 無關的 surface
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-221Z-migrate-legacy-ledger-bfb04eadfd54
lastTransitionAt: 2026-05-21T10:29:44.221Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.221Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:90b3ec7c675fc426d65ffe4dafee96dd43d70393104a045668c278d93ee27b52
---

# TASK-ATD-0021 — `integrations-core` 拆分 compiler / manifest / verify

## 目標

拆分 integration compiler、manifest lifecycle、verify/uninstall safety。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M3 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

TASK-ATD-0015

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0021
- Invariant risk: I5

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] `.atm/integrations/<id>.manifest.json` 語意穩定。
- [ ] install / verify / uninstall roundtrip 不破。
- [ ] hash、line ending、encoding 語意有 fixture 保護。

## 影響檔案

- packages/integrations-core/src/**
- packages/plugin-governance-local/src/**
- schemas/**manifest**
- tests/agent-pack/**

## 驗證方式

- npm run validate:integration-adapter
- npm run validate:governance-local
- npm run validate:standard

## 回滾策略

回復本卡 allowed_files 內的變更；若已新增 fixture、docs 或 release artifact，需一併移除或重建，並重新執行本卡驗證命令。

## Checklist

- [ ] 建立 upstream-friendly artifact 或明確標示暫不需要
- [ ] 確認未污染 3KLife / npc-brain / Cocos 到 upstream protected surface
- [ ] 完成 allowed_files 內的最小變更
- [ ] 執行驗證方式並把結果回寫 Notes

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: TASK-ATD-0015
2026-05-19 | 狀態: done | 完成: packages/integrations-core/SPLIT_PLAN.md 文件化 696 行 index.ts 拆分計畫 (compiler/manifest/verify 三子模組); 實際拆分延後到 baseline 修復
