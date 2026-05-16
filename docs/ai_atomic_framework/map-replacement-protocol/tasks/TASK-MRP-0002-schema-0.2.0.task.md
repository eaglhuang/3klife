---
doc_id: doc_other_0136
task_id: TASK-MRP-0002
title: Atomic Map Schema 0.2.0
milestone: M2
status: in-progress
blocked_by: [TASK-MRP-0000]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T02:44:13.6757334+08:00
started_by_agent: vs-insiders-github-copilot
---

# TASK-MRP-0002 — Atomic Map Schema 0.2.0

## 目標

把 `atomic-map.schema.json` 從 0.1.0 升到 0.2.0，新增 `members[].role`、`edges[].edgeKind`、`replacement.{legacyUris, mode, evidenceRefs}` 等替代表面語義欄位，但保留 0.1.0 既有 map 的相容性。

## 前置依賴

- TASK-MRP-0000

## 輸入

- 計畫書 §3、§14.2
- `schemas/registry/atomic-map.schema.json`
- `schemas/registry.schema.json`
- `packages/core/src/index.ts`（型別）
- `packages/core/src/manager/map-generator.ts`
- `packages/core/src/registry/map-hash.ts`

## 輸出

1. Schema：`specVersion` 改為 `enum:["0.1.0","0.2.0"]`，0.2.0 條件下開放新欄位且仍保持 `additionalProperties:false`。
2. TypeScript 型別：`AtomicMapRecord` / `RegistryMapMemberRecord` / `RegistryMapEdgeRecord` 同步擴充。
3. `createAtomicMapHashPayload()` 收錄 `members[].role`、`edges[].edgeKind`、`replacement.legacyUris`；排除 `replacement.mode`、`replacement.evidenceRefs`。
4. `map-generator.ts` 在輸入 0.2.0 欄位時不丟欄位；輸入無 0.2.0 欄位時仍輸出 0.1.0。
5. 0.1.0 → 0.2.0 migration 測試：既有 MAP-0001 / MAP-0002 重新 round-trip 通過。

## 驗收條件

- [x] AJV 編譯通過
- [x] 既有 map registry round-trip 測試綠
- [x] 新增 0.1.0 minimal fixture 與 0.2.0 replacement fixture 各 1
- [x] `tests/core/atomic-map-schema.test.ts` 對兩種 specVersion 都通過，且 0.1.0 會拒絕 replacement-surface 欄位
- [x] hash 變更測試：只改 `replacement.mode` 不影響 `mapHash`；改 `members[].role` 會影響 `mapHash`

## 影響檔案

- `schemas/registry/atomic-map.schema.json`
- `schemas/registry.schema.json`
- `packages/core/src/index.ts`
- `packages/core/src/manager/map-generator.ts`
- `packages/core/src/registry/map-hash.ts`
- `packages/core/src/registry/map-registry.ts`
- `tests/schema-fixtures/positive/atomic-map-0.1-minimal.json`（新增）
- `tests/schema-fixtures/positive/atomic-map-0.2-replacement.json`（新增）
- `tests/core/atomic-map-schema.test.ts`（新增）
- `tests/core/map-generator.test.ts`

## 回滾策略

- 還原 schema 檔即可；尚未有任何 0.2.0 map 進入 registry 前 hash payload 規則可安全回滾。
- 若已寫入 registry，需先把 0.2.0 map mark 為 `draft` 再降版。

## Checklist

- [x] schema bump + migration 區塊
- [x] 型別擴充
- [x] hash payload 邊界測試
- [x] generator 雙版本支援
- [x] fixture / round-trip 測試
- [ ] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: in-progress | 驗證: atomic-map-schema.test.ts / map-generator.test.ts / validate-schemas.ts --mode validate pass | 變更: 完成 0.2.0 schema/type/hash/generator/registry 最小切片；新增 0.1/0.2 fixture 回歸測試 | 阻塞: CHANGELOG.md 已有非本任務 dirty work，本輪不混入
