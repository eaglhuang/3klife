---
doc_id: doc_other_0154
task_id: TASK-MRP-0014
title: 跨 Atom 邊界結果快取（Memoization）
milestone: M14
status: planned
blocked_by: [TASK-MRP-0012]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0014 — 跨 Atom 邊界結果快取（Memoization）

## 目標

當 atom 的 input hash 未變動，直接回傳上次 output，跳過後續所有 downstream atoms。對 domain-step 類型 atom（純函數、無副作用）最有效，大幅加速重複跑的場景（例如收斂迴圈每輪重算相同 seed data）。

## 設計原則

- 只對 `edgeKind: data-flow` 且 atom role 為 `domain-step` 的 atom 啟用
- `side-effect`、`rollback-adapter` 類型 atom 永遠不快取
- cache key = `sha256(atom_id + input_blob)`
- cache 存放於 `local/.atm-cache/<mapId>/`（.gitignore，非治理對象）
- 提供 `--no-cache` 逃生門

## 前置依賴

- TASK-MRP-0012（edge contract，確認 atom input/output schema 穩定）

## 輸入

- `map.spec.json`（判斷 atom role 與 edge kind）
- atom 執行 input blob

## 輸出

1. `AtomMemoCache` 模組：`get(key) / set(key, value) / invalidate(atomId)`
2. `node atm.mjs test --map <id> --cache [--no-cache] --json`
   - 回傳 `cacheHits`、`cacheMisses`、`cacheSkipped`（side-effect atoms）
3. cache miss 時正常計算並寫入 cache
4. cache hit 時跳過 atom 執行，回傳 cached output

## 驗收條件

- [ ] 同 input 第二次跑，domain-step atom cache hit
- [ ] side-effect atom 永遠 cache miss（不走快取）
- [ ] `--no-cache` 強制全跑
- [ ] cache invalidation：atom 版本升級後 cache 自動失效
- [ ] cache 目錄列入 `.gitignore`

## 影響檔案

- `packages/core/src/maps/atom-memo-cache.ts`（新增）
- `packages/core/src/cli/test.ts`（新增 `--cache` flag）
- `.gitignore`（新增 `local/.atm-cache/`）
- `tests/maps/atom-memo-cache.test.ts`（新增）

## 回滾策略

移除 `atom-memo-cache.ts`；`local/.atm-cache/` 手動刪除；CLI flag 移除。快取未命中即為現有行為。

## Checklist

- [ ] cache 模組實作完成（get/set/invalidate）
- [ ] role-based skip logic（side-effect 不快取）
- [ ] cache key 計算（atomId + input hash）
- [ ] CLI flag 整合
- [ ] .gitignore 更新
- [ ] CHANGELOG 補記
