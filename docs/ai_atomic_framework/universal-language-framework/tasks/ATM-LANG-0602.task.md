---
doc_id: doc_other_0923
task_id: ATM-LANG-0602
title: Large-feature decomposition evidence gate
atomic_map: ATM-MAP-LANG-0600
milestone: M4
status: done
started_at: 2026-05-20T15:03:32+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T15:11:50+08:00
owner: atm-core
priority: P1
type: validation
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
  - ATM-LANG-TABLE-0009
depends:
  - ATM-LANG-0601
allowed_files:
  - scripts/**
  - tests/**
  - fixtures/**
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
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:map-curator + npm run validate:schemas（PASS） | 變更: map curator validator 與 decomposition fixture/test 建立，missing members/edges/entrypoints 失敗路徑可追蹤 | 阻塞: none"
---

# ATM-LANG-0602 Large-feature decomposition evidence gate

## Background

補齊 map-level evidence gate，對大型 feature decomposition 做最小可接受檢查：members / edges / entrypoints 不可缺，缺漏必須可輸出失敗報告。

## Dependencies

- ATM-LANG-0601

## Inputs

- `docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md`
- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`
- Atomic Map: ATM-MAP-LANG-0600
- Atomic Table: ATM-LANG-TABLE-0008, ATM-LANG-TABLE-0009

## Outputs

- [x] map-level evidence gate
- [x] fixture snapshots
- [x] failure reports for missing members/edges/entrypoints

## Acceptance Criteria

- [x] owned surface 與 roadmap/task index 對齊。
- [x] Atomic Maps table 對應完整，Notes 有追蹤證據。
- [x] 變更在 package module / atomized implementation，不把核心語言邏輯放進 CLI facade。
- [x] 不修改 ATM framework 公開 contract 的不相關面向。
- [x] Notes 明確記錄 validation command 與結果。

## Target Files / Surfaces

- scripts/**
- tests/**
- fixtures/**

## Atomic Maps Tables

- ATM-LANG-TABLE-0008
- ATM-LANG-TABLE-0009

## Validation Commands

```bash
npm run validate:map-curator
```

## Implementation Notes

- evidence gate 需要產生可讀的 fail reasons，供後續 review/police 直接引用。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0600 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start decomposition evidence gate validator | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:map-curator（PASS）, npm run validate:schemas（PASS）, npm run validate:guide（PASS） | 變更: 新增 validate:map-curator、decomposition fixtures 與 AJV contract 驗證流程 | 阻塞: none
