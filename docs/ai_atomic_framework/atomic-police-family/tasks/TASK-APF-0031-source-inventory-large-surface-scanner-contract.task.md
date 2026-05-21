---
doc_id: doc_other_0672
task_id: TASK-APF-0031
title: Source inventory and large-surface scanner contract
milestone: M10
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0030]
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
lastTransitionId: 2026-05-21T10-29-44-269Z-migrate-legacy-ledger-7ac064c904d9
lastTransitionAt: 2026-05-21T10:29:44.269Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.269Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:051b3afc89e4b989b06a3e46e10571a416579065e2bb0fbf9286c6cdf7e8097d
---

# TASK-APF-0031 — Source inventory and large-surface scanner contract

## 背景

建立大型腳本 / 大型功能表面的語言中立 read model，預設以 1000 LOC 作為可配置門檻。

## 執行範圍

- 新增 source inventory contract：file path、language、lineCount、exported symbols、entrypoint hint、legacyUri。
- 支援 threshold config：default `maxFileLines=1000`，可由 police config 或 governance bundle 覆寫。
- 排除 node_modules、dist、build、coverage、`.git`、framework release artifacts，以及 adopter 自訂 ignore。

## 驗收標準

- 掃描器只產 read model/report，不改 host project。
- 超過門檻的檔案會形成 deterministic finding input。
- fixtures 覆蓋 below threshold、above threshold、ignored path、generated file。

## 建議驗證

- `npm run validate:police-family`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 1000 行是 default policy，不是不可改的 public contract；大型 Cocos/Unity 類專案可由 adapter 調整。
2026-05-19 | 狀態: done | 驗證: pass | 變更: 新增 packages/core/src/source-inventory/source-inventory.ts，內含 SourceInventoryReport / buildSourceInventoryReport / filterEligibleForDecomposition / DEFAULT_MAX_FILE_LINES=1000 / DEFAULT_IGNORED_PATTERNS（node_modules、dist、build、coverage、.git、release）。read-model only，不修改 host project。fixtures 覆蓋 above/below/ignored/replacement-map 四種情境。
