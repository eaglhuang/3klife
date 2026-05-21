---
doc_id: doc_other_0922
task_id: ATM-LANG-0601
title: Graph-to-map decomposition proposal
atomic_map: ATM-MAP-LANG-0600
milestone: M4
status: done
started_at: 2026-05-20T15:03:32+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T15:11:50+08:00
owner: atm-core
priority: P1
type: implementation
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:map-curator
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0008
depends:
  - ATM-LANG-0600
allowed_files:
  - packages/core/src/**
  - packages/plugin-sdk/src/**
  - tests/**
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不處理 active ATM task state。
  - 不變更 3KLife runtime 行為。
  - 不新增未登記 Atomic Maps table。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:map-curator + npm run validate:guide（PASS） | 變更: graph-to-map proposal builder 與 evidence gate builder 完成並匯出 guidance index | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-370Z-migrate-legacy-ledger-1df5c919e5ae
lastTransitionAt: 2026-05-21T10:29:44.370Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.370Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:e350b54315bcfa5aa187d7e1d38c40332f320bb5c7aa7a5feec267d917f84169
---

# ATM-LANG-0601 Graph-to-map decomposition proposal

## Background

在 0600 contract 基礎上，將 dependency / call / artifact graph 轉成 map proposal，確保輸出可直接接 evidence gate。

## Dependencies

- ATM-LANG-0600

## Inputs

- `docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md`
- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`
- Atomic Map: ATM-MAP-LANG-0600
- Atomic Table: ATM-LANG-TABLE-0008

## Outputs

- [x] dependency/call/artifact graph conversion
- [x] map proposal builder
- [x] fixtures for simple and large feature graphs

## Acceptance Criteria

- [x] owned surface 與 roadmap/task index 對齊。
- [x] Atomic Maps table 對應完整，Notes 有追蹤證據。
- [x] 變更在 package module / atomized implementation，不把核心語言邏輯放進 CLI facade。
- [x] 不修改 ATM framework 公開 contract 的不相關面向。
- [x] Notes 明確記錄 validation command 與結果。

## Target Files / Surfaces

- packages/core/src/**
- packages/plugin-sdk/src/**
- tests/**

## Atomic Maps Tables

- ATM-LANG-TABLE-0008

## Validation Commands

```bash
npm run validate:map-curator
```

## Implementation Notes

- map proposal 僅產生建議與證據，不直接 mutate registry。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0600 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start graph-to-map proposal builder implementation | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:map-curator（PASS）, npm run validate:guide（PASS） | 變更: 新增 atomic-map-decomposition proposal/gate builder，支援 dependency/call/artifact graph 轉換 | 阻塞: none
