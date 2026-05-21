---
doc_id: doc_other_0918
task_id: ATM-LANG-0500
title: Generic atomize/infect dry-run plan contracts
atomic_map: ATM-MAP-LANG-0500
milestone: M4
status: done
started_at: 2026-05-20T14:14:52+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T14:19:55+08:00
owner: atm-core
priority: P1
type: contract
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:plugin-sdk
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0007
depends:
  - ATM-LANG-0102
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
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:plugin-sdk + tests/atm-lang-0500-0502.test.ts（PASS） | 變更: 新增 dry-run request/report contract 與 executionMode/安全檢查 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-366Z-migrate-legacy-ledger-683fd6a588df
lastTransitionAt: 2026-05-21T10:29:44.366Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.366Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:3bdbe93173ae9b9fbbb125e7f726d5c3ccd8a8f72d093993663fa341a412cd68
---

# ATM-LANG-0500 Generic atomize/infect dry-run plan contracts

## Background

落實 ATM-MAP-LANG-0500 基礎層：先定義通用 dry-run（atomize/infect）request/report 型別，確保計畫輸出是 proposal，不直接進 apply。

## Dependencies

- ATM-LANG-0102

## Inputs

- `docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md`
- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`
- Atomic Map: ATM-MAP-LANG-0500
- Atomic Table: ATM-LANG-TABLE-0007

## Outputs

- [x] generic atomize dry-run request/report
- [x] generic infect dry-run request/report
- [x] mutates must be empty in dry-run

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

- ATM-LANG-TABLE-0007

## Validation Commands

```bash
npm run validate:plugin-sdk
```

## Implementation Notes

- dry-run 僅允許 proposal metadata，不能做 apply side effects。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0500 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start dry-run contract implementation | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:plugin-sdk（PASS）, TS_NODE_PROJECT=tsconfig.test.json tests/atm-lang-0500-0502.test.ts（PASS） | 變更: dry-run request/report contract 與 mutates 安全規則完成 | 阻塞: none
