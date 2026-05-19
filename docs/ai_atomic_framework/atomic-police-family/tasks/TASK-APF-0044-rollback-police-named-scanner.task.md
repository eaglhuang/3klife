---
doc_id: doc_other_0695
task_id: TASK-APF-0044
title: Rollback Police named scanner
milestone: M12
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0043]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: upstream-runtime-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0044 — Rollback Police named scanner

## 背景

新增 `runRollbackPolice`，檢查 proposal draft 是否具備 rollback-proof、map equivalence、retirement proof 或 reversible patch envelope。

## 執行範圍

- 消費 upgrade proposal draft、rollback proof、map equivalence report、dry-run patch、retirement proof。
- 產出 `rollback-proof-missing`、`rollback-scope-drift`、`irreversible-proposal` findings。
- 對 high-risk proposal 可轉 blocker finding，但仍交給 ReviewAdvisory / HumanReviewDecision。

## 驗收標準

- map active / legacy-retired proposal 缺 equivalence 或 retirement proof 時 fail fixture。
- atomization / infect proposal 缺 dry-run rollback envelope 時產 blocker finding。
- scanner 不直接 revert、不直接 apply。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run validate:map-curator`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Rollback Police 要成為所有高風險 proposal 的共同安全守門。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runRollbackPolice + evaluateRollbackProposal()。atom-evolve 缺 rollback-proof → block；map-replacement 缺 equivalence-proof → block；legacy-retired 缺 retirement-proof 與 rollback-proof → block；atomize/infect 缺 reversible-patch-envelope → block；touchedSurfaces 超出 rollbackScope → warning。4 個 fixture 通過；scanner 不直接 revert / apply。
