---
doc_id: doc_other_0610
task_id: TASK-ATD-0010
title: Git hook / CI enforcement 改為 opt-in host recipe
milestone: M1
status: done
started_at: 2026-05-18T16:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-18T17:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
tracking_scope: internal-mirror
public_tracking: false
upstream_tracking: pending-github-issue
public_surface_risk: docs
neutrality_required: true
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: ['I4']
allowed_files:
  - examples/git-hooks-enforcement/**
  - docs/HOST_GOVERNANCE_INTEGRATION.md
  - docs/**/*.md
  - README.md
  - examples/**
forbidden_files:
  - 3KLife / npc-brain / Cocos adopter-only public wording
  - docs/keep.summary.md as upstream contract
  - .atm/** runtime state
non_goals:
  - 不把 3KLife / npc-brain / Cocos 或私有任務卡流程寫成 AI-Atomic-Framework public contract
  - 不在本卡中提交或推送 upstream 變更；本卡只定義工作包
  - 不修改與本卡 allowed_files 無關的 surface
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATD-0010 — Git hook / CI enforcement 改為 opt-in host recipe

## 目標

把 hook / CI enforcement 定位成 host-side opt-in recipe。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M1 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

無

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0010
- Invariant risk: I4

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] protected public docs 不含 adopter-only 語意。
- [ ] 文件只描述 AI-Atomic-Framework 的 open-source contract。
- [ ] 若需要下游案例，必須轉成 neutral example 或 upstream-friendly RFC。

## 影響檔案

- examples/git-hooks-enforcement/**
- docs/HOST_GOVERNANCE_INTEGRATION.md
- docs/**/*.md
- README.md
- examples/**

## 驗證方式

- npm run validate:neutrality
- npm run validate:examples
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

2026-05-18 | 狀態: done | 完成:
- examples/git-hooks-enforcement/README.md 標題改為「Opt-in Host Recipe」+ 明確宣告 ATM core 不會自動安裝 hook
- docs/HOST_GOVERNANCE_INTEGRATION.md 在 Enforcement Layers 表加 Provided by 欄位 + 新增「What ATM core does NOT do」小節 (4 條明確邊界)
- validate:neutrality ok; validate:examples ok; validate:standard passed=53/53
