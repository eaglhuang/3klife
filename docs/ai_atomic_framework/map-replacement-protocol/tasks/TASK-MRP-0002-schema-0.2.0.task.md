---
doc_id: doc_other_0136
task_id: TASK-MRP-0002
title: Atomic Map Schema 0.2.0
milestone: M2
status: pending
blocked_by: [TASK-MRP-0000]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0002 — Atomic Map Schema 0.2.0

## 目標

把 `atomic-map.schema.json` 從 0.1.0 升到 0.2.0，新增 `members[].role`、`edges[].edgeKind`、`replacement.{legacyUris, mode, evidenceRefs}` 等替代表面語義欄位，但保留 0.1.0 既有 map 的相容性。

## 前置依賴

- TASK-MRP-0000

## 輸入

- 計畫書 §3、§14.2
- `schemas/registry/atomic-map.schema.json`
- `packages/core/src/registry/atomic-map.ts`（型別）
- `packages/core/src/registry/map-generator.ts`
- `packages/core/src/registry/map-hash.ts`

## 輸出

1. Schema：`specVersion` 改為 `enum:["0.1.0","0.2.0"]`，0.2.0 條件下開放新欄位且仍保持 `additionalProperties:false`。
2. TypeScript 型別：`AtomicMapRecord` / `RegistryMapMemberRecord` / `RegistryMapEdgeRecord` 同步擴充。
3. `createAtomicMapHashPayload()` 收錄 `members[].role`、`edges[].edgeKind`、`replacement.legacyUris`；排除 `replacement.mode`、`replacement.evidenceRefs`。
4. `map-generator.ts` 在輸入 0.2.0 欄位時不丟欄位；輸入無 0.2.0 欄位時仍輸出 0.1.0。
5. 0.1.0 → 0.2.0 migration 測試：既有 MAP-0001 / MAP-0002 重新 round-trip 通過。

## 驗收條件

- [ ] AJV 編譯通過
- [ ] 既有 map registry round-trip 測試綠
- [ ] 新增 0.2.0 minimal fixture 與 full fixture 各 1
- [ ] `node atm.mjs spec --validate` 對兩種 specVersion 都通過
- [ ] hash 變更測試：只改 `replacement.mode` 不影響 `mapHash`；改 `members[].role` 會影響 `mapHash`

## 影響檔案

- `schemas/registry/atomic-map.schema.json`
- `packages/core/src/registry/atomic-map.ts`
- `packages/core/src/registry/map-generator.ts`
- `packages/core/src/registry/map-hash.ts`
- `tests/schema-fixtures/atomic-map/*.json`（新增）
- `tests/registry/atomic-map.test.ts`

## 回滾策略

- 還原 schema 檔即可；尚未有任何 0.2.0 map 進入 registry 前 hash payload 規則可安全回滾。
- 若已寫入 registry，需先把 0.2.0 map mark 為 `draft` 再降版。

## Checklist

- [ ] schema bump + migration 區塊
- [ ] 型別擴充
- [ ] hash payload 邊界測試
- [ ] generator 雙版本支援
- [ ] fixture / round-trip 測試
- [ ] CHANGELOG 補一句
