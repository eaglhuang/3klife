---
doc_id: doc_other_0917
task_id: ATM-LANG-0402
title: candidates rank thin facade conversion
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
alphaGate: script-facade-boundary
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0005
  - ATM-LANG-TABLE-0009
depends:
  - ATM-LANG-0401
allowed_files:
  - packages/cli/src/commands/candidates.ts
  - packages/core/src/guidance/**
  - scripts/validate-guide.ts
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
notes: "2026-05-20 | 狀態: done | 驗證: node scripts/script-facade-boundary.ts --mode validate + npm run validate:guide（PASS） | 變更: candidates CLI thin facade + validate-guide script 落地 | 阻塞: none"
---

# ATM-LANG-0402 candidates rank thin facade conversion

## Background

落實 ATM-MAP-LANG-0400 第三段：`candidates rank` CLI 只做 façade，核心語言相關邏輯全部下沉到 guidance service module。

## Dependencies

- ATM-LANG-0401

## Inputs

- `docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md`
- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`
- Atomic Map: ATM-MAP-LANG-0400
- Atomic Table: ATM-LANG-TABLE-0005, ATM-LANG-TABLE-0009

## Outputs

- [x] CLI delegates to service modules
- [x] CLI contains no core language logic
- [x] facade boundary validator covers candidates rank

## Acceptance Criteria

- [x] owned surface 與 roadmap/task index 對齊。
- [x] Atomic Maps table 對應完整，Notes 有追蹤證據。
- [x] 變更在 package module / atomized implementation，不把核心語言邏輯放進 CLI facade。
- [x] 不修改 ATM framework 公開 contract 的不相關面向。
- [x] Notes 明確記錄 validation command 與結果。

## Target Files / Surfaces

- packages/cli/src/commands/candidates.ts
- packages/core/src/guidance/**
- scripts/validate-guide.ts

## Atomic Maps Tables

- ATM-LANG-TABLE-0005
- ATM-LANG-TABLE-0009

## Validation Commands

```bash
node scripts/script-facade-boundary.ts --mode validate
npm run validate:guide
```

## Implementation Notes

- CLI 新增 `candidatesRank()`，只做 resolver + service delegation + summary line。
- 新增 `scripts/validate-guide.ts`，整合 roadmap/coverage/facade/plugin-sdk/guidance 檢查，並要求 0400~0402 必要檔案與 snippet。
- `script-facade-boundary` 會掃描 `packages/cli/src`，因此 `candidates.ts` 已納入同一邊界檢查。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0400 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start CLI thin facade conversion | 阻塞: none
2026-05-20 | 狀態: done | 驗證: node scripts/script-facade-boundary.ts --mode validate（PASS）, npm run validate:guide（PASS） | 變更: candidates CLI thin facade + validate-guide script 完成 | 阻塞: none

