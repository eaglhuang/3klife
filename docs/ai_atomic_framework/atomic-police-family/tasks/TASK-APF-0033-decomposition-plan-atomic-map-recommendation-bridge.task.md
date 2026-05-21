---
doc_id: doc_other_0674
task_id: TASK-APF-0033
title: Decomposition plan to atomic-map recommendation bridge
milestone: M10
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0032]
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
lastTransitionId: 2026-05-21T10-29-44-271Z-migrate-legacy-ledger-719b3e658cb7
lastTransitionAt: 2026-05-21T10:29:44.271Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.271Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:aeaa2d58693d5f28341cd891e3d524c30dead9f7b3d126f21cc7de9a194bb8c3
---

# TASK-APF-0033 — Decomposition plan to atomic-map recommendation bridge

## 背景

把 Decomposition Police finding 轉成 decomposition-plan draft / atomic map replacement recommendation，但仍需人工審核。

## 執行範圍

- 讀取 decomposition-plan schema 與 map replacement protocol。
- 產出 draft artifact：candidateMembers、candidateEdges、entrypoints、replacement.legacyUris、qualityTargets。
- 橋接 `create-map --from-plan` 與 map equivalence lifecycle，但本卡不自動執行 apply。

## 驗收標準

- draft 缺 replacement.legacyUris 時必須 fail。
- draft 缺 map entrypoint 時必須 fail。
- ReviewAdvisory 只能收到 proposal draft / follow-up route，不可直接 promote。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:map-template`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 本卡把「大型腳本清單」變成可審查 map replacement 草案，而不是自動拆 code。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 buildDecompositionPlanHintDraft(finding)，把 Decomposition finding 轉成 schemaId=atm.decompositionPlanDraft / specVersion=0.1.0 / mode=draft 的草案；缺 legacyUris 回 missing-replacement-legacyUris，缺 entrypoints 回 missing-entrypoints。既有 createAtomicMapRequestFromDecompositionPlan 可消化此 hint。
