---
doc_id: doc_other_0675
task_id: TASK-APF-0034
title: Evidence evolution signal policy
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
lastTransitionId: 2026-05-21T10-29-44-272Z-migrate-legacy-ledger-e0cdb36645f9
lastTransitionAt: 2026-05-21T10:29:44.272Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.272Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:ca70ccc556dc8bffbdec16956248049c014a4e1a2e56ed81e9efe12a88d432ce
---

# TASK-APF-0034 — Evidence evolution signal policy

## 背景

依 Atom Evidence-Driven Evolution 定義 Evolution Police 可消費的 evidence signal、門檻與 suppression policy。

## 執行範圍

- 接受 usage-feedback、quality-comparison、human-review-decision、rollback-proof、conversation evolution report、map-curator report。
- 要求 recurrence + friction/regression/review evidence，不允許只靠 usage count。
- 定義 suppression key：target surface、target id、finding kind、pattern tags、base version。

## 驗收標準

- positive / neutral only evidence 不產 proposal finding。
- 低 confidence 或超過 daily cap 時產 suppressed observation report。
- baseAtomVersion / baseMapVersion stale 時轉 stale-draft warning 或 blocker review。

## 建議驗證

- `npm run validate:evidence-detector`
- `npm run validate:conversation-evolution`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Evidence 可以說明為什麼要考慮 evolve，但不能決定允許 evolve。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 EvolutionEvidencePatternEntry / DEFAULT_EVOLUTION_RECURRENCE_THRESHOLD=2 / DEFAULT_EVOLUTION_CONFIDENCE_THRESHOLD=0.6 / DEFAULT_POLICE_DAILY_CAP=50 / buildEvolutionSuppressionKey()。policy: usage-only evidence 必須伴隨 friction/regression/review；host-local 不可升 global atom；stale base 轉 stale-evolution-draft warning。
