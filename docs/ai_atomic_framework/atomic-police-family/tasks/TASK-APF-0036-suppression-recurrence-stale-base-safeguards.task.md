---
doc_id: doc_other_0677
task_id: TASK-APF-0036
title: Suppression, recurrence, and stale-base safeguards
milestone: M11
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0034, TASK-APF-0035]
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
lastTransitionId: 2026-05-21T10-29-44-274Z-migrate-legacy-ledger-24685caf79f7
lastTransitionAt: 2026-05-21T10:29:44.274Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.274Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:b5406156314dc0c7ebd5c271178a8b21ce80a336c2efb1d182f30d6f849e0626
---

# TASK-APF-0036 — Suppression, recurrence, and stale-base safeguards

## 背景

補齊 Evolution Police 與 Decomposition Police 的去噪、遞迴門檻、stale base 與 daily cap 防護。

## 執行範圍

- 實作 recurrence window 與 confidence threshold。
- 實作 per target daily proposal cap 與 suppression report。
- baseAtomVersion / baseMapVersion / evidence watermark 不一致時阻止 proposal draft promotion。

## 驗收標準

- 同一 finding 在 suppression window 內不重複騷擾 reviewer。
- high severity safety signal 可覆蓋 suppression，但仍需 human review。
- stale base fixture 必須轉 blocker review，不得繼續沿用舊 draft。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 這張卡主要防止兩支新警察變成吵鬧的建議產生器。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 實作 suppressedKeys（runEvolutionPolice）/ suppressedFilePaths（runDecompositionPolice）/ dailyCap（兩者皆有，default 50）。Stale base：baseAtomVersion ≠ currentAtomVersion 或 baseMapVersion ≠ currentMapVersion 自動轉 stale-evolution-draft warning + request-human-review。daily cap reached 產 observation finding（routeHint=observation.daily-cap）。
