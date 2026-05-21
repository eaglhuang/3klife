---
doc_id: doc_other_0673
task_id: TASK-APF-0032
title: Decomposition Police named scanner
milestone: M10
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0031]
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
lastTransitionId: 2026-05-21T10-29-44-270Z-migrate-legacy-ledger-62b1d7c40990
lastTransitionAt: 2026-05-21T10:29:44.270Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.270Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:9b89a784173517b85d0d5f8e539bb7a9207b8c31d9ad8a4c8a2d0683b0cc8100
---

# TASK-APF-0032 — Decomposition Police named scanner

## 背景

新增 `runDecompositionPolice`，找出大型程式碼表面並建議走「拆解大型功能優化原子map計畫書」的方法拆成 map replacement。

## 執行範圍

- 輸入 SourceInventoryReport / source root / threshold config。
- 產出 `trigger=oversized-source-surface` 的 PoliceFinding。
- `routeHint` 指向 `behavior.atomize` + `behavior.compose` + map-replacement-protocol。
- finding metadata 包含 candidate legacyUri、lineCount、suggestedMapReplacement=true、decompositionPlanHint。

## 驗收標準

- 大於門檻的單一 source file 會產 advisory finding。
- 同一大型功能若已有 active replacement map，scanner 不重複開拆解建議。
- finding 不得直接建立 atom、map、task 或修改 registry。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:map-curator`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 此警察是「發現大型功能表面」的守關者，不取代 Atomization Police 的 dry-run patch guard。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runDecompositionPolice + DecompositionPoliceInput + buildDecompositionSuppressionKey。產出 trigger=oversized-source-surface、severity=advisory、action=proposal-draft、routeHint=behavior.atomize 之 PoliceFinding，metadata 含 lineCount/threshold/legacyUri/decompositionPlanHint/suggestedRoute=[atomize, compose]/directApplyAllowed=false。fixtures 4 個（positive + 3 negative）皆通過。
