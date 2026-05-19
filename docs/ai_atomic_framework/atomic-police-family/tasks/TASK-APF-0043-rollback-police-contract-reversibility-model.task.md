---
doc_id: doc_other_0694
task_id: TASK-APF-0043
title: Rollback Police contract and reversibility model
milestone: M12
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0040]
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

# TASK-APF-0043 — Rollback Police contract and reversibility model

## 背景

把 rollback / reversibility 升為 proposal safety 的一等 contract，供 Map Replacement、Evolution、Atomization、Decomposition、Polymorph 等流程共用。

## 執行範圍

- 定義 rollback proof、equivalence proof、retirement proof、reversible patch envelope 的 read model。
- 定義 missing / stale / scope drift 的 trigger。
- 定義 Rollback Police 與 Reversibility Gate 的關係。

## 驗收標準

- 可表示 `rollback-proof-missing`、`irreversible-proposal`、`equivalence-proof-missing`。
- Rollback Police 不直接 revert 或 apply rollback。
- Proposal draft 缺可逆性證據時必須進 review 或 blocker gate。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Rollback Police 是守門，不是自動回滾工具。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 RollbackPoliceProposal + RollbackPoliceInput + RollbackPoliceSignalKind (`rollback-proof-missing` / `rollback-scope-drift` / `irreversible-proposal` / `equivalence-proof-missing` / `retirement-proof-missing`) + RollbackProposalRiskClass (`atom-evolve` / `map-replacement` / `legacy-retired` / `atomize` / `infect` / `polymorph`) + buildRollbackSuppressionKey()。scanner 不直接 revert / apply。
