---
doc_id: doc_other_0137
task_id: TASK-MRP-0003
title: Map Equivalence Report Schema
milestone: M3
status: done
blocked_by: [TASK-MRP-0002]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T13:17:35.3159251+08:00
started_by_agent: vs-insiders-github-copilot
completed_at: 2026-05-17T13:17:35.3159251+08:00
completed_by_agent: vs-insiders-github-copilot
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

- [x] AJV 編譯通過
- [x] positive fixture + negative fixture 各 1 存放於 `tests/schema-fixtures/map-equivalence-report/`
- [x] `atm spec --validate` 可校驗報告
- [x] schema 與 `regression-matrix` 欄位名稱對齊（metric/evidenceRefs）
- [x] `knownDivergences[]` 缺 `justification` 或 `reviewRef` 時 negative fixture 會被拒絕

## 影響檔案

- `schemas/governance/map-equivalence-report.schema.json`
- `tests/schema-fixtures/map-equivalence-report/*.json`
- `tests/governance/map-equivalence-report.test.ts`

## 回滾策略

純新增；刪除新檔即可。

## Checklist

- [x] schema 完成
- [x] fixtures 完成
- [x] AJV / validate 測試綠
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: map-equivalence-report.test.ts / validate-schemas.ts --mode validate / map-generator.test.ts + --self-check pass；`atm spec --validate` positive pass、negative 正確拒絕缺 `reviewRef` | 變更: 新增 `atm.mapEquivalenceReport` schema、positive/negative fixture、schema manifest 註冊與 CLI spec validate dispatch | 阻塞: none
