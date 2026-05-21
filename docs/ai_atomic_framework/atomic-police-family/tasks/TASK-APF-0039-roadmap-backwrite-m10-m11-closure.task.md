---
doc_id: doc_other_0680
task_id: TASK-APF-0039
title: Roadmap backwrite and M10/M11 closure
milestone: M11
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0038]
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: upstream-runtime-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-278Z-migrate-legacy-ledger-44d3cabbcee6
lastTransitionAt: 2026-05-21T10:29:44.278Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.278Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:9717f8f3ae72257b049623e020611ebb2aa2f96d57c2752cd1a99d661272bead
---

# TASK-APF-0039 — Roadmap backwrite and M10/M11 closure

## 背景

在兩支新警察 runtime 產品化後，回寫 APF 計畫書、狀態矩陣與風險表。

## 執行範圍

- 將 Decomposition/Evolution Police 狀態從 missing runtime scanner 改為 productized-gate-active。
- 更新 behavior trigger matrix，補入 oversized-source-surface 與 evidence-evolution-signal。
- 新增 closed risk：大型功能未被拆解、evidence signal 無治理路由、警察噪音過高。

## 驗收標準

- 主計畫書與 README 索引同步到 APF-0039。
- 所有 touched Markdown 有 doc_id 並通過 encoding guard。
- `validate:police-family`、`validate:standard` 至少在 police family slice 通過。

## 建議驗證

- `npm run validate:police-family`
- `npm run check:encoding:touched`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 本卡完成前，Decomposition/Evolution Police 只能標為 planned / not-started。
2026-05-19 | 狀態: done | 驗證: pass | 變更: 主計畫書 §2 / §3 / §6 同步：Decomposition Police 與 Evolution Police 由 planned + missing runtime scanner 改為 productized-gate-active；§6 表中 APF-0030~0039 改為 status=done / artifact_status=done / runtime_status=done；tasks/README.md 也同步。validate:police-family 通過 12 個 family 檢查。
