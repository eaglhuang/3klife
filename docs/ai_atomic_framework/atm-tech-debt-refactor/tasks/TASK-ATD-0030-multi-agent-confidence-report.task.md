---
doc_id: doc_other_0630
task_id: TASK-ATD-0030
title: Multi-agent confidence report 沿用既有 matrix / result
milestone: M5
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
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: []
allowed_files:
  - docs/multi-agent-compatibility-matrix.md
  - docs/multi-agent-results.md
  - scripts/**
  - tests/**
  - packages/**/src/**
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
---

# TASK-ATD-0030 — Multi-agent confidence report 沿用既有 matrix / result

## 目標

沿用 multi-agent matrix / results，保持 advisory signal。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M5 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

無

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0030
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

- docs/multi-agent-compatibility-matrix.md
- docs/multi-agent-results.md
- scripts/**
- tests/**
- packages/**/src/**
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

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: none
2026-05-19 | 狀態: done | 完成: docs/multi-agent-results.md 追加 'How to read' 區塊串接既有 matrix + per-agent confidence envelope + self-host-alpha smoke; 沒有新增 report 形狀
