---
doc_id: doc_other_0137
task_id: TASK-MRP-0003
title: Map Equivalence Report Schema
milestone: M3
status: pending
blocked_by: [TASK-MRP-0002]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0003 — Map Equivalence Report Schema

## 目標

新增 `schemas/governance/map-equivalence-report.schema.json`，作為「map 與 legacy 是否等價」的 deterministic 報告契約。schema 復用 atom regression case 的 metric / evidence 形狀，避免重新發明。

## 前置依賴

- TASK-MRP-0002

## 輸入

- 計畫書 §5、§14.2
- 既有 `schemas/governance/regression-matrix.schema.json`

## 輸出

- 新檔：`schemas/governance/map-equivalence-report.schema.json`
- schemaId = `atm.mapEquivalenceReport`，specVersion = `0.1.0`，含 `migration` 區塊
- 必填：`mapId`、`legacyUris[]`、`fixtures[]`、`cases[]`、`summary`、`metrics`、`artifacts[]`、`evidence[]`、`passed`
- `cases[]` 子欄位：`caseId`、`input`、`expected`、`actual`、`metric`、`evidenceRefs[]`、`passed`、`knownDivergence`
- 允許 `knownDivergences[]` 區塊（caseId + reason + justification + reviewer + reviewRef）

## 驗收條件

- [ ] AJV 編譯通過
- [ ] positive fixture + negative fixture 各 1 存放於 `tests/schema-fixtures/map-equivalence-report/`
- [ ] `atm spec --validate` 可校驗報告
- [ ] schema 與 `regression-matrix` 欄位名稱對齊（metric/evidenceRefs）
- [ ] `knownDivergences[]` 缺 `justification` 或 `reviewRef` 時 negative fixture 會被拒絕

## 影響檔案

- `schemas/governance/map-equivalence-report.schema.json`
- `tests/schema-fixtures/map-equivalence-report/*.json`
- `tests/governance/map-equivalence-report.test.ts`

## 回滾策略

純新增；刪除新檔即可。

## Checklist

- [ ] schema 完成
- [ ] fixtures 完成
- [ ] AJV / validate 測試綠
- [ ] CHANGELOG 補一句
