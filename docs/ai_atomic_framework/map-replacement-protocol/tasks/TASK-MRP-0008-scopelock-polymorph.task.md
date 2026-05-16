---
doc_id: doc_other_0142
task_id: TASK-MRP-0008
title: ScopeLock 0.2.0 + Polymorph Impact
milestone: M8
status: deferred
blocked_by: [TASK-MRP-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0008 — ScopeLock 0.2.0 + Polymorph Impact

## 目標

把 ScopeLock 從「file-only」升級為「file + map-selector」，並補上 polymorph impact gate，讓 replacement map 在 active 之前能正確盤點受影響的 instance maps。此卡可延後到 M5/M6 全綠後再啟動。

## 前置依賴

- TASK-MRP-0006

## 輸入

- 計畫書 §8、§9
- `schemas/governance/scope-lock.schema.json`
- `packages/core/src/polymorph/template.ts`

## 輸出

1. ScopeLock schema 0.2.0：新增 `selectors`
   - `mapId` / `mapMembers[]` / `mapEdges[]` / `mapEntrypoints[]` / `legacyUris[]`
   - 0.1.0 lock round-trip 必須仍能載入
2. `ScopeLockRecord` 型別擴充
3. polymorph impact runner：
   - 對 replacement map 的 member atoms 掃描 template / instance 關係
   - 找出受影響 instance maps 並跑 propagation
   - 產出 `polymorph-impact-report.json`
4. upgrade gate：target = map 且要求 `active` 時，若 member atoms 命中 polymorph template，必須消費 polymorph-impact-report

## 驗收條件

- [ ] 0.1.0 lock round-trip 綠
- [ ] 0.2.0 lock 接受 map-selector
- [ ] polymorph 掃描在 sample template/instance 上回報正確 instance set
- [ ] 缺報告時 active gate 被擋
- [ ] 報告通過 schema 驗證

## 影響檔案

- `schemas/governance/scope-lock.schema.json`
- `packages/core/src/governance/scope-lock.ts`
- `packages/core/src/polymorph/impact.ts`（新）
- `schemas/governance/polymorph-impact-report.schema.json`（新）
- `tests/governance/scope-lock-0.2.0.test.ts`
- `tests/polymorph/impact.test.ts`

## 回滾策略

- 將 0.2.0 selector 從 schema enum 移除；polymorph impact 模組降為 internal API。

## Checklist

- [ ] scope-lock schema bump
- [ ] selector 行為測試
- [ ] polymorph impact runner
- [ ] upgrade gate 整合
- [ ] CHANGELOG 補一句
