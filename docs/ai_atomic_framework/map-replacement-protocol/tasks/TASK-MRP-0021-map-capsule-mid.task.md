---
doc_id: doc_other_0162
task_id: TASK-MRP-0021
title: Map Capsule — map:cid 機制（MID）
milestone: M21
status: planned
blocked_by: [TASK-MRP-0018]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0021 — Map Capsule：map:cid 機制（MID）

## 目標

把 Atom Capsule（TASK-MRP-0018）的 CID 機制延伸到 atomic map，建立 **Map Content ID（map:cid）**。

Map bundle 包含所有 member atom 的 CID，形成 **Merkle tree**：任何 atom 升版，map:cid 自動改變，不需手動 bump map 版本號。Map 因此具備 content-addressed 的共享、去重、版本追蹤能力，比單一 atom 更適合整個工作流的跨 repo 共享。

---

## 為什麼 Map 比 Atom 更值得共用

一個 atom 是一個函數，Map 是「7 個 atom 的完整工作流」。團隊之間共享的往往不是單一函數，而是**一整套經過驗證的流程**。

舉例：`ATM-MAP-0001`（全量收斂迴圈）包含：
- entry-adapter → domain-step × 3 → validator → side-effect → rollback-adapter

這個組合在任何需要「收斂迴圈治理」的 repo 都可以直接複用，只需替換 domain-step 的具體實作。

---

## 設計原則

### Map:cid 格式

```
map:cid:<BASE58URL(SHA256(brotli_compressed_map_bundle))>
```

與 `atom:cid:` 格式一致，前綴不同以區分。

### Map Bundle（進 hash 的部分）

```json
{
  "specVersion": "0.2.0",
  "members": [
    {
      "atomCid": "atom:cid:zQmXG7f...",
      "role": "entry-adapter"
    },
    {
      "atomCid": "atom:cid:abc123...",
      "role": "domain-step"
    }
  ],
  "edges": [
    {
      "from": "atom:cid:zQmXG7f...",
      "to": "atom:cid:abc123...",
      "binding": "seed-pipeline",
      "edgeKind": "control-flow"
    }
  ],
  "entrypoints": ["atom:cid:zQmXG7f..."],
  "qualityTargets": { ... }
}
```

**注意**：bundle 用 `atomCid` 而非 `atomId`。這樣 map:cid 就鎖定了每個 atom 的具體版本，形成 Merkle tree。

### Merkle Tree 結構

```
map:cid:MAP-ABC
  ├── atom:cid:ATOM-0001-v1   (entry-adapter)
  ├── atom:cid:ATOM-0002-v3   (domain-step)
  ├── atom:cid:ATOM-0003-v1   (domain-step)
  ├── atom:cid:ATOM-0004-v2   (domain-step)
  ├── atom:cid:ATOM-0005-v1   (validator)
  ├── atom:cid:ATOM-0006-v1   (side-effect)
  └── atom:cid:ATOM-0007-v1   (rollback-adapter)
```

任一 atom 升版 → 對應 `atomCid` 改變 → map bundle 改變 → map:cid 自動改變。**無需手動 bump map 版本**。

### 不進 hash 的部分（存 Map Registry）

- `mapId`（ATM-MAP-0001）← 人類識別碼
- `humanName`（full-roster-convergence-loop）
- `exportedBy` / `exportedAt`（provenance）
- `previousMapCid` / `nextMapCid`（版本鏈）
- `legacyUris`（替代目標，屬於 rollout 狀態，不是 map 內容）
- `replacementMode`（draft/shadow/canary/active，同上）

---

## Map Registry（對照表）

與 Capsule Registry 結構平行，獨立存放：

| 位置 | 路徑 |
|------|------|
| 全域（本機） | `~/.atm/map-registry.json` |
| Repo 內 | `vendor/maps/map-registry.json` |

結構：
```json
{
  "schemaVersion": "atm.map-registry.v0.1",
  "currentPointers": {
    "ATM-MAP-0001": "map:cid:MAP-ABC..."
  },
  "entries": {
    "map:cid:MAP-ABC...": {
      "mapId": "ATM-MAP-0001",
      "humanName": "full-roster-convergence-loop",
      "memberAtomCids": ["atom:cid:...", ...],
      "exportedAt": "2026-05-20T...",
      "previousMapCid": null,
      "nextMapCid": null,
      "status": "active"
    }
  }
}
```

---

## Map Capsule 的去重警察

Map 去重的問題比 Atom 更微妙：兩個 map 即使 map:cid 不同，也可能是「語意等價的」（例如 edge 順序不同，但圖結構相同）。

去重分兩層：

| 層 | 條件 | 檢查方式 |
|----|------|---------|
| **完全相同** | map:cid 相同 | O(1) hash lookup，等同 atom 去重 |
| **圖結構等價** | 相同 edges 但排列不同 | 圖同構（Graph Isomorphism）檢查，昂貴 |

建議：Phase 1 只做 hash 去重（完全相同）；Phase 2 再加圖結構等價檢查（可選，設為 advisory 而非 blocking）。

---

## Map Capsule 的共享模式

Map 比 Atom 更適合整體共享，因為它包含完整的治理設定：

```bash
# 匯出整個 map（含所有 atom capsule）
node atm.mjs registry map-capsule export --map ATM-MAP-0001 --json
# → { "mapCapsule": "map:cid:MAP-ABC...", "atomCapsules": [...] }

# 匯入 map capsule（自動 import 所有 member atoms）
node atm.mjs registry map-capsule import --cid "map:cid:MAP-ABC..." --vendor
# → vendor/maps/MAP-ABC.json + vendor/atoms/ATOM-*.json 全部寫入
```

「我想用你們的收斂迴圈 map」→ 一行指令，所有依賴自動解析。

---

## 前置依賴

- TASK-MRP-0018（Atom Capsule，map:cid 依賴 atom:cid 已存在）

## 輸入

- `map.spec.json`（現有 map 定義）
- member atoms 的 CID（從 Capsule Registry 查）

## 輸出

1. `node atm.mjs registry map-capsule export --map <id> --json`
2. `node atm.mjs registry map-capsule import --cid "map:cid:..." --vendor`
3. `node atm.mjs registry map-capsule rollback --cid "map:cid:..." --map <id>`
4. `vendor/maps/map-registry.json`（repo 內 Map Registry）
5. `~/.atm/map-registry.json`（全域 Map Registry）
6. `map.spec.json` 新增 `mapCid` 欄位（export 後自動寫入）

## 損壞修復策略

與 Atom Capsule 完全相同（四層修復），額外加一層：

- Map 損壞時，可從 `memberAtomCids` 重建 map bundle → 重算 map:cid → 驗證是否一致

## 驗收條件

- [ ] export 產出 map:cid，同時 export 所有 member atom:cid
- [ ] map bundle 中用 atomCid 而非 atomId
- [ ] 任一 member atom 升版 → 重算 map:cid 自動改變
- [ ] Map Registry 對照表維護 previousMapCid / nextMapCid 版本鏈
- [ ] rollback 可回退到 previousMapCid（含自動更新 member atom 版本）
- [ ] import 自動 import 所有 member atoms（遞迴依賴解析）
- [ ] hash 去重：同 map:cid 拒絕重複入庫
- [ ] 損壞修復：可從 memberAtomCids 重建 map bundle 驗證

## 影響檔案

- `packages/core/src/registry/map-capsule.ts`（新增）
- `packages/core/src/registry/map-registry.ts`（新增）
- `packages/core/src/cli/registry.ts`（新增 `map-capsule` subcommand）
- `schemas/registry/map-registry.schema.json`（新增）
- `schemas/registry/atomic-map.schema.json`（新增 `mapCid` 欄位）
- `vendor/maps/`（新增目錄）
- `tests/registry/map-capsule.test.ts`（新增）

## 回滾策略（本卡功能回滾）

移除 `map-capsule.ts` 與 `map-registry.ts`；`vendor/maps/` 手動清除；`map.spec.json` 移除 `mapCid` 欄位（schema 降回無此欄位）；Atom Capsule 功能不受影響。

## Checklist

- [ ] map bundle 結構定義（atomCid 替代 atomId）
- [ ] map:cid 計算（Merkle tree：member atom CID → map bundle → hash）
- [ ] export CLI（含遞迴 atom export）
- [ ] import CLI（含遞迴 atom import）
- [ ] Map Registry CRUD 完成
- [ ] 版本鏈維護（previousMapCid / nextMapCid）
- [ ] rollback CLI 完成
- [ ] 四層損壞修復（+map 重建層）
- [ ] 去重警察 Phase 1（hash 去重）
- [ ] schema 更新（`mapCid` 欄位）
- [ ] CHANGELOG 補記
