---
doc_id: doc_other_0919
task_id: ATM-LANG-0501
title: Import rewrite, shim, rollback plan contracts
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
alphaGate: validate:schemas
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0007
depends:
  - ATM-LANG-0500
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
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:schemas + tests/atm-lang-0500-0502.test.ts（PASS） | 變更: import rewrite/shim/rollback 子合約型別與 schema 完成 | 阻塞: none"
---

# ATM-LANG-0501 Import rewrite, shim, rollback plan contracts

## Background

落實 ATM-MAP-LANG-0500 第二層：把 `import rewrite`、`host shim`、`rollback` 拆成可驗證子合約，避免語言 adapter 或 CLI 各自發明格式。

## Dependencies

- ATM-LANG-0500

## Inputs

- `docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md`
- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`
- Atomic Map: ATM-MAP-LANG-0500
- Atomic Table: ATM-LANG-TABLE-0007

## Outputs

- [x] import rewrite subcontract
- [x] host shim subcontract
- [x] rollback plan subcontract

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
npm run validate:schemas
```

## Implementation Notes

- import rewrite 必須可回復，且 rollback 欄位必填。
- shim 視為 dry-run proposal 的顯式欄位，不能只放在自由文字描述。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0500 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start import/shim/rollback contract implementation | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:schemas（PASS）, TS_NODE_PROJECT=tsconfig.test.json tests/atm-lang-0500-0502.test.ts（PASS） | 變更: import rewrite / shim / rollback contract + schema 落地 | 阻塞: none
