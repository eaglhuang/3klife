---
doc_id: doc_other_0151
task_id: TASK-MRP-0011
title: Atom Semantic Fingerprint 持續監控
milestone: M11
status: planned
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0011 — Atom Semantic Fingerprint 持續監控

## 目標

`map.spec.json` 中的 `semanticFingerprint` 目前只在 map 建立時計算一次。本卡在每次 CI 執行後自動重算 fingerprint，偵測 atom 語意邊界被悄悄擴大或收縮的情況，並在 lineage-log 中留下比對記錄。

## 前置依賴

- TASK-MRP-0010（evidence closure 模型完備）

## 輸入

- `atomic_workbench/maps/<mapId>/map.spec.json`（現有 `semanticFingerprint` 欄位）
- `atomic_workbench/maps/<mapId>/lineage-log.json`
- `packages/core/src/` 中的 fingerprint 計算邏輯

## 輸出

1. `node atm.mjs test --map <id> --fingerprint-check --json`
   - 比對當前 fingerprint 與 spec 中記錄值
   - 有漂移時回傳 `fingerprintDrift: true` + `delta` 說明
2. `lineage-log.json` 新增 `fingerprint-check` transition 記錄
3. CI 整合：GitHub Action step 在 map 相關檔案改動時自動觸發

## 驗收條件

- [ ] fingerprint 未變動時 CLI 回傳 `fingerprintDrift: false`
- [ ] atom 邊界擴大（新增 export）後 CLI 偵測到 drift，回傳非零 exit code
- [ ] lineage-log 記錄每次 check 時間點與結果
- [ ] 正負 fixtures 各一個

## 影響檔案

- `packages/core/src/maps/fingerprint-checker.ts`（新增）
- `packages/core/src/cli/test.ts`（新增 `--fingerprint-check` flag）
- `.github/workflows/atm-map-ci.yml`（新增 step）
- `tests/maps/fingerprint-check.test.ts`（新增）

## 回滾策略

移除 `--fingerprint-check` flag 實作；CI workflow 移除對應 step；lineage-log 不含 fingerprint-check entry 時不受影響。

## Checklist

- [ ] fingerprint 計算邏輯提取為獨立函數
- [ ] CLI flag 整合完成
- [ ] CI workflow step 完成
- [ ] 正負 fixtures 完成
- [ ] CHANGELOG 補記
