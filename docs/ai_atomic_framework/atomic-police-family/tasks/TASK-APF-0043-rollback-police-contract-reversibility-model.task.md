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
non_goals:
  - 不新增第二套 approval workflow 或獨立任務路由器。
  - 不讓 police finding 直接 mutate registry。
  - 不繞過 ReviewAdvisory.machine-finding 與 HumanReviewDecision。
  - 不把 adopter/private path 寫入 upstream protected public contract。
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected public docs hard-code adopter/private paths
  - C:/Users/User/AI-Atomic-Framework registry mutation from police scanners
  - C:/Users/User/AI-Atomic-Framework second approval workflow or independent task routing implementation
  - C:/Users/User/3KLife/.atm/**
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
  - C:/Users/User/AI-Atomic-Framework/schemas/**
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-283Z-migrate-legacy-ledger-9b23af320ab4
lastTransitionAt: 2026-05-21T10:29:44.283Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.283Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:c575b504db9c87c38c52b22b7dc57d822cf171a913c6e2a10aefbb33c27dc0bb
---

# TASK-APF-0043 — Rollback Police contract and reversibility model

## 背景

把 rollback / reversibility 升為 proposal safety 的一等 contract，供 Map Replacement、Evolution、Atomization、Decomposition、Polymorph 等流程共用。

## 執行範圍

- 定義 rollback proof、equivalence proof、retirement proof、reversible patch envelope 的 read model。
- 定義 missing / stale / scope drift 的 trigger。
- 定義 Rollback Police 與 Reversibility Gate 的關係。

## 驗收標準

- 可表示 `rollback-proof-missing`、`irreversible-proposal`、`equivalence-proof-missing`、`retirement-proof-missing`、`rollback-scope-drift` 五種 trigger。
- Rollback Police 不直接 revert 或 apply rollback。
- Proposal draft 缺可逆性證據時必須進 review 或 blocker gate。
- `PoliceFinding.readModel` 必須能表達 `reversibility-proof-envelope`：`rollbackProofRef`、`equivalenceProofRef`、`retirementProofRef`、`dryRunPatchRef`、`baseVersion`。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Rollback Police 是守門，不是自動回滾工具。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 RollbackPoliceProposal + RollbackPoliceInput + RollbackPoliceSignalKind (`rollback-proof-missing` / `rollback-scope-drift` / `irreversible-proposal` / `equivalence-proof-missing` / `retirement-proof-missing`) + RollbackProposalRiskClass (`atom-evolve` / `map-replacement` / `legacy-retired` / `atomize` / `infect` / `polymorph`) + buildRollbackSuppressionKey()。scanner 不直接 revert / apply。
2026-05-19 | 狀態: done | 驗證: M14 metadata repair | 變更: 驗收標準補入五個 Rollback trigger 與 `reversibility-proof-envelope` readModel 欄位要求。
