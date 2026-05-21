---
doc_id: doc_other_0671
task_id: TASK-APF-0030
title: Police family taxonomy extension for Decomposition and Evolution Police
milestone: M10
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0029]
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
lastTransitionId: 2026-05-21T10-29-44-268Z-migrate-legacy-ledger-0deaa65b4e50
lastTransitionAt: 2026-05-21T10:29:44.268Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.268Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:ad531a61ead646d8e2a0e63c3a96801af6f1c8db0fc6246eab010866384f1488
---

# TASK-APF-0030 — Police family taxonomy extension for Decomposition and Evolution Police

## 背景

擴充 police family taxonomy，正式加入 Decomposition Police 與 Evolution Police，但不得宣稱 runtime 已產品化。

## 執行範圍

- 在 public-adjacent contract 中規劃新增 policeFamily：`decomposition`、`evolution`。
- 定義兩者與既有 Atomization / Map Integration / Quality Police 的責任邊界。
- 更新 validator profile 語意：standard 先 advisory，full 必須跑 fixture。

## 驗收標準

- PoliceFinding contract 能表示 `oversized-source-surface` 與 `evidence-evolution-signal`。
- 任務與 spec 明確標示 not-started / upstream-api-not-applied，不誤稱 productized。
- 不新增第二套 proposal / review / task / registry workflow。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:plugin-sdk`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 本卡完成後只代表 taxonomy 與 contract proposal 可實作，runtime scanner 仍需 APF-0032 / APF-0035。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts PoliceFamilyName 擴充 `decomposition` + `evolution`，新增對應 input 型別與 runDecompositionPolice/runEvolutionPolice；validate-police-family + validate-police + validate-review-advisory 均通過。
