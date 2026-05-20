---
doc_id: doc_other_0915
task_id: ATM-LANG-0400
title: Adapter-driven source inventory service
atomic_map: ATM-MAP-LANG-0400
milestone: M3
status: done
started_at: 2026-05-20T13:56:47+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T14:08:18+08:00
owner: atm-core
priority: P1
type: implementation
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:guide
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0006
depends:
  - ATM-LANG-0101
allowed_files:
  - packages/core/src/guidance/**
  - packages/cli/src/commands/candidates.ts
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
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:guide + TS_NODE_PROJECT=tsconfig.test.json tests/atm-lang-0400-0402.test.ts（PASS） | 變更: source inventory service、ranking 基礎模組與 fixture 落地 | 阻塞: none"
---

# ATM-LANG-0400 Adapter-driven source inventory service

## Background

落實 ATM-MAP-LANG-0400 第一段：由 adapter 提供 `scanSourceInventory`，核心層只做委派與可追溯報告，不能把語言細節塞回 core/CLI。

## Dependencies

- ATM-LANG-0101

## Inputs

- `docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md`
- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`
- Atomic Map: ATM-MAP-LANG-0400
- Atomic Table: ATM-LANG-TABLE-0006

## Outputs

- [x] source inventory service consumes adapter scanSourceInventory
- [x] candidate report includes inventory artifact path
- [x] fixtures for JS/TS and Python

## Acceptance Criteria

- [x] owned surface 與 roadmap/task index 對齊。
- [x] Atomic Maps table 對應完整，Notes 有追蹤證據。
- [x] 變更在 package module / atomized implementation，不把核心語言邏輯放進 CLI facade。
- [x] 不修改 ATM framework 公開 contract 的不相關面向。
- [x] Notes 明確記錄 validation command 與結果。

## Target Files / Surfaces

- packages/core/src/guidance/**
- packages/cli/src/commands/candidates.ts
- tests/**

## Atomic Maps Tables

- ATM-LANG-TABLE-0006

## Validation Commands

```bash
npm run validate:guide
$env:TS_NODE_PROJECT='tsconfig.test.json'; node -r ts-node/register/transpile-only tests/atm-lang-0400-0402.test.ts
```

## Implementation Notes

- 新增 `source-inventory-service`，支援 adapter delegation 與 generic fallback。
- 報告固定帶 `inventoryArtifactPath`，供 candidate ranking 與 CLI output 回指 artifact。
- fixture 覆蓋 Python 與 JS/TS。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0400 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start inventory service implementation | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:guide（PASS）, TS_NODE_PROJECT=tsconfig.test.json tests/atm-lang-0400-0402.test.ts（PASS） | 變更: source inventory delegation + artifact path + fixtures 完成 | 阻塞: none

