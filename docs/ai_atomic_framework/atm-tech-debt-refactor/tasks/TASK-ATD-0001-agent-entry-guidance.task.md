---
doc_id: doc_other_0601
task_id: TASK-ATD-0001
title: 補框架中立 agent entry guidance
milestone: M0
status: done
started_at: 2026-05-18T10:00:00+08:00
started_by_agent: ClaudeCode_Sonnet4.6
completed_at: 2026-05-18T10:30:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
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
  - AGENTS.md
  - README.md
  - docs/AGENT_PACK_ONBOARDING.md
  - docs/SELF_HOSTING_ALPHA.md
  - docs/**/*.md
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
lastTransitionId: 2026-05-21T10-29-44-199Z-migrate-legacy-ledger-16b027578c51
lastTransitionAt: 2026-05-21T10:29:44.199Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.199Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:c2d38d4b84e44b61c359a9ed0720fa9f217439cf66fe4d8ef281d9f47ff4ffe3
---

# TASK-ATD-0001 — 補框架中立 agent entry guidance

## 目標

讓新 agent 能回到 README、ATMChart、AtomicCharter 與 `node atm.mjs next --json`。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M0 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

無

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0001
- Invariant risk: I4

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [x] protected public docs 不含 adopter-only 語意。
- [x] 文件只描述 AI-Atomic-Framework 的 open-source contract。
- [x] 若需要下游案例，必須轉成 neutral example 或 upstream-friendly RFC。

## 影響檔案

- AGENTS.md
- README.md
- docs/AGENT_PACK_ONBOARDING.md
- docs/SELF_HOSTING_ALPHA.md
- docs/**/*.md
- examples/**

## 驗證方式

- npm run validate:neutrality
- npm run validate:examples
- npm run validate:standard

## 回滾策略

回復本卡 allowed_files 內的變更；若已新增 fixture、docs 或 release artifact，需一併移除或重建，並重新執行本卡驗證命令。

## Checklist

- [x] 建立 upstream-friendly artifact 或明確標示暫不需要
- [x] 確認未污染 3KLife / npc-brain / Cocos 到 upstream protected surface
- [x] 完成 allowed_files 內的最小變更
- [x] 執行驗證方式並把結果回寫 Notes

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: PASS | 變更: 建立 AI-Atomic-Framework/AGENTS.md（框架中立 bootstrap instructions + 框架導航） | 阻塞: none
- validate:neutrality ok (6 checks)
- validate:examples ok
- validate:standard ok (passed=53, failed=0, total=53) — 修復原先 2 個 agents-md 相關 failure
- verify --agents-md → ATM_VERIFY_AGENTS_MD_OK
- 無 adopter-only 語彙污染，未 commit/push 到 upstream
