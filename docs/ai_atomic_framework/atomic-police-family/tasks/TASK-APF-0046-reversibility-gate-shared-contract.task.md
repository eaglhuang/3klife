---
doc_id: doc_other_0697
task_id: TASK-APF-0046
title: Reversibility Gate shared contract
milestone: M12
status: done
artifact_status: done
runtime_status: shared-gate-active
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

# TASK-APF-0046 — Reversibility Gate shared contract

## 背景

所有會產 proposal draft 的警察都需要共用可逆性 gate，避免高風險變更在沒有 rollback/equivalence/retirement proof 時進入 promotion。

## 執行範圍

- 定義 reversibility report。
- 定義 proposal risk class 與所需 rollback/equivalence/retirement evidence。
- 定義與 Rollback Police 的銜接方式。

## 驗收標準

- high-risk proposal 缺可逆性證據時產 blocker finding。
- low-risk advisory 仍可 report-only，但不得 auto approve。
- gate 不直接 rollback 或 apply。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Reversibility Gate 是 proposal safety gate，不是 rollback executor。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runReversibilityGate + ReversibilityGateInput。Gate 共用 evaluateRollbackProposal() 與 Rollback Police 一致；高風險 proposal 缺可逆性證據時產 block finding 並計入 summary.blocked；gate 不直接 rollback / apply。Fixture 驗證 status='fail' + blocked>0。
