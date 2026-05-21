---
doc_id: doc_other_0921
task_id: ATM-LANG-0600
title: Atomic map decomposition contract
atomic_map: ATM-MAP-LANG-0600
milestone: M4
status: done
started_at: 2026-05-20T15:03:32+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T15:11:50+08:00
owner: atm-core
priority: P1
type: contract
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:schemas
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0008
depends:
  - ATM-LANG-0101
allowed_files:
  - packages/plugin-sdk/src/**
  - schemas/**
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
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:schemas + npm run validate:plugin-sdk + npm run validate:map-curator（PASS） | 變更: decomposition request/report contract 與 SDK 介面補齊 members/edges/entrypoints/graphSummary/evidenceGate | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-369Z-migrate-legacy-ledger-2a81a9204eba
lastTransitionAt: 2026-05-21T10:29:44.369Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.369Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:afb2a617aa793e4aceda4b2a3bbb59b553c103a07cd37c709c2249a87ac8c9be
---

# ATM-LANG-0600 Atomic map decomposition contract

## Background

落實 ATM-MAP-LANG-0600 的基礎合約，明確定義 map decomposition 的 members / edges / entrypoints 與 graph 輸出格式。

## Dependencies

- ATM-LANG-0101

## Inputs

- `docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md`
- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`
- Atomic Map: ATM-MAP-LANG-0600
- Atomic Table: ATM-LANG-TABLE-0008

## Outputs

- [x] map members schema
- [x] edges schema
- [x] entrypoints schema
- [x] graph output report

## Acceptance Criteria

- [x] owned surface 與 roadmap/task index 對齊。
- [x] Atomic Maps table 對應完整，Notes 有追蹤證據。
- [x] 變更在 package module / atomized implementation，不把核心語言邏輯放進 CLI facade。
- [x] 不修改 ATM framework 公開 contract 的不相關面向。
- [x] Notes 明確記錄 validation command 與結果。

## Target Files / Surfaces

- packages/plugin-sdk/src/**
- schemas/**
- tests/**

## Atomic Maps Tables

- ATM-LANG-TABLE-0008

## Validation Commands

```bash
npm run validate:schemas
```

## Implementation Notes

- `buildAtomicMapDecomposition` 的輸入輸出 contract 要先完整，再交由 map curator 實作轉換邏輯。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0600 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start decomposition contract implementation | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:schemas（PASS）, npm run validate:plugin-sdk（PASS）, npm run validate:map-curator（PASS） | 變更: SDK 與 decomposition request/report contract 完成，新增 graphSummary/evidenceGate 欄位 | 阻塞: none
