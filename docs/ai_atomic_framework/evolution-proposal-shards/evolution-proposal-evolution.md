# 關於進化版的原子提案 — 版號、框架版本與回饋迴圈

> 這是 `關於進化版的原子提案.md` 的「版號、框架版本與回饋迴圈」分片。完整索引見 `docs/ai_atomic_framework/關於進化版的原子提案.md`。

## 最新進度發現（分析時才發現）

| 卡號 | 狀態 | Upstream commit | 意義 |
|---|---|---|---|
| ATM-2-0001 Spec loader/parser | **done** | `87c689c` | core 已能讀 spec、正規化、產出 normalized model |
| ATM-2-0002 Scaffold Builder | **done** | `b8a3270` | 可從 spec 自動產 atom workbench + idempotent rerun |
| ATM-2-0003 Test Runner + report | **done** | `391b462` | delegated test runner + `test-report.schema.json` 已就位 |
| ATM-2-0004 Registry + HashLock | **in-progress** | — | 正在建 JSON-first registry + spec/code/test hash lock |
| ATM-1.5-0003 governed seed | **done** | `d90c2f6` | seed 已被自己的治理系統收編 |

**框架真實完成度修正**：

| Phase | Done | In-Progress | Open |
|---|---|---|---|
| ATM-0 | 13 | 0 | 1 |
| ATM-1 | 10 | 0 | 0 ✅ 全完成 |
| ATM-1.5 | 3 | 0 | 0 ✅ 全完成 |
| ATM-2 | 3 | 1 | 8 |
| ATM-2.5 | 0 | 0 | 3 |
| ATM-3~6 | 0 | 0 | 32 |
| **Total** | **29** | **1** | **41** → **完成率 ~41%** |

---

## 命題 1：原子版號 + 不退轉保證 + Rollback

### 現有基礎設施（已建成）

```
atomic-spec.schema.json
  └─ hashLock: { specHash, codeHash, testHash }  ← ATM-1-0003 已定義

atomic-registry.json
  └─ ATM-CORE-0001: { specHash: ok, codeHash: ok, testHash: ok }  ← ATM-1.5-0002 已實作

atm verify --self  ← 修改任何一行即偵測 drift  ← ATM-1.5-0002 已驗證

test-report.schema.json  ← ATM-2-0003 已建立；test runner 產出 JSON report

ATM-2-0004 Registry + HashLock MVP  ← 正在實作中
```

### 缺少的三塊拼圖

**1. Version History（版本歷史陣列）**
目前 registry 只記錄 CURRENT hash，沒有前版紀錄。

```jsonc
// 現在的 registry entry
{ "atomId": "atom.core-seed", "specHash": "abc123", "codeHash": "def456" }

// 需要的結構
{
  "atomId": "atom.core-seed",
  "currentVersion": "1.1.0",
  "versions": [
    { "version": "1.0.0", "specHash": "abc123", "codeHash": "def456", "testHash": "ghi789", "timestamp": "..." },
    { "version": "1.1.0", "specHash": "xxx000", "codeHash": "yyy111", "testHash": "zzz222", "timestamp": "..." }
  ]
}
```

**建議時機**：ATM-2-0004（正在 in-progress）的自然延伸，或緊接其後的 follow-up 卡。

**2. Non-regression Gate（不退轉閘門）**
版本升級時，新版 v1.1 必須通過 v1.0 的所有 test fixtures + v1.1 新增的 tests。

```
atm upgrade <atom-id> --from v1.0 --to v1.1
  Step 1: 跑 v1.0 的 regression fixtures against v1.1 code → 必須全綠
  Step 2: 跑 v1.1 的新 tests → 必須全綠
  Step 3: 比較 test coverage → v1.1 >= v1.0
  Step 4: 計算新 hashLock → 寫入 registry
```

**建議時機**：ATM-2-0005（Police plugin API）+ ATM-2-0004（Registry）組合。

**3. Rollback Command（回退指令）**

```
atm rollback <atom-id> [version]
  Step 1: 從 versions[] 取出目標版本的 hashLock
  Step 2: 還原 spec/code/test 到該版本（透過 git checkout 或 artifact store）
  Step 3: 驗證 hashLock 一致
  Step 4: 更新 registry currentVersion
```

**建議時機**：ATM-2-0004 完成後立即可建，因為 version history 和 rollback 是同一個 registry 擴充。

### 可行性結論

✅ **完全可行**。三塊拼圖都建立在已有基礎上（spec schema 有 hashLock 預留、test runner 已產 JSON report、registry 正在建構中）。不需要新的抽象概念，只需在 ATM-2-0004/0005 的自然工作中擴充。

---

## 命題 2：ATM 框架級版本管理

### 現有狀態

| 機制 | 已實作？ | 位置 |
|---|---|---|
| Phase indicator | ✅ | `atm status` 顯示 `B1-complete` |
| CHANGELOG | ✅ | ATM-1.5-0003 新增 Phase B1 entry |
| package.json version | ❓ | 上游 repo 有 package.json 但可能未設 semver |
| Schema version | ✅ | `atomic-spec.schema.json` 有 `atmSchemaVersion` |
| Alpha0/Alpha1 定義 | ✅ | ATM-0-0014 已明確列出 |

### 缺少什麼

**1. Framework Semantic Version**
```
0.1.0-alpha0 = seed + CLI + basic schemas + self-hosting gate
0.2.0-alpha1 = + police + governance bundle + neutrality scanner
0.3.0-beta   = + adapters + case studies
1.0.0        = stable release
```

**2. Atom ↔ Framework Version Constraint**
```jsonc
// 在 atomic-spec.schema.json 中
{
  "compatibility": {
    "atmMinVersion": "0.1.0-alpha0",
    "atmMaxVersion": "0.2.0-alpha1"
  }
}
```

注意：`compatibility` 欄位已在 ATM-1-0003 的 Atomic Spec schema 中預留，但尚未強制 ATM version 版號格式。

**3. Migration Guide**
版本跳升時需要遷移指南：哪些 schema 欄位改了、registry 格式是否相容、hash 演算法是否變動。

### 建議

在 alpha0 gate（ATM-2.5-0002）通過後，正式確立 `0.1.0-alpha0` 版號。這是自然的版號錨定點——第一次有可驗證的 "空白 repo 可自舉" 證據。

可行性：✅ **低成本高價值**。加一個 version 欄位到根 package.json + 在 alpha0 gate 成功時自動標記 git tag 即可。

---

## 命題 3：自我回饋進步迴圈（最重要的創新）

### 使用者的核心構想

```
Atom v1.0 ──→ 生產環境使用 ──→ 收集回饋/品質證據
                                        ↓
                               提議新版本 v1.1
                                        ↓
                         驗證機制證明品質是否進步
                                        ↓
                    品質警察自動審查 + 人類審核清單
                                        ↓
                     通過 → 升級到 v1.1；不通過 → 保留 v1.0
```

這本質上是把原子的生命週期從「單次交付」延伸為「持續演化」，且演化由**證據驅動**而非**意願驅動**。

### 已有基礎設施的映射

| 迴圈環節 | 對應 ATM 組件 | 狀態 |
|---|---|---|
| 生產環境使用 | 宿主專案（3KLife 等） | ✅ 存在 |
| 回饋收集 | ATM-2-0009 Artifact/Evidence Store | ⏳ schema 計畫中 |
| 品質證據 | `test-report.schema.json` (ATM-2-0003) | ✅ 已建 |
| 品質比較 | Regression Matrix (ATM-1-0003 schema) | ✅ schema 已定義 |
| 品質警察 | ATM-2-0005 Police plugin API | ⏳ 計畫中 |
| 人類審核清單 | **尚未規劃** | ❌ 需新增 |
| 版本升級閘門 | ATM-2-0004 Registry + HashLock | 🟡 in-progress |

### 需要新增的三個機制

**1. Usage Evidence Schema（使用回饋 schema）**

在 ATM-2-0009（Evidence Store）中擴充：

```jsonc
{
  "$schema": "evidence.schema.json",
  "atomId": "atom.core-seed",
  "version": "1.0.0",
  "evidenceType": "usage-feedback",
  "metrics": {
    "invocationCount": 1423,
    "errorRate": 0.02,
    "avgLatencyMs": 45,
    "edgeCasePatterns": ["empty input", "unicode overflow"],
    "regressionIncidents": 0
  },
  "collectedAt": "2026-06-01T00:00:00Z",
  "collectedBy": "3klife-adapter"
}
```

**2. Quality Improvement Gate（品質進步閘門）**

在 ATM-2-0005（Police plugin）中建立：

```
atm upgrade <atom-id> --propose v1.1
  Step 1: Non-regression check（v1.0 tests 全過）
  Step 2: Quality comparison：
    - v1.1 error rate <= v1.0 error rate ？
    - v1.1 coverage >= v1.0 coverage ？
    - v1.1 handles v1.0 documented edge cases ？
  Step 3: New capability proof（v1.1 新 tests 全過）
  Step 4: 產出 upgrade-proposal.json
```

**3. Human Review Queue（人類審核佇列）**

```jsonc
// .atm/reports/upgrade-proposals.json
{
  "proposals": [
    {
      "atomId": "atom.core-seed",
      "from": "1.0.0",
      "to": "1.1.0",
      "proposedBy": "ClaudeCode",
      "proposedAt": "2026-06-15T10:00:00Z",
      "automatedGates": {
        "nonRegression": "pass",
        "qualityImprovement": "pass (error rate 2% → 0.5%)",
        "newCapability": "pass (3 new edge case tests)"
      },
      "humanReview": "pending",      // ← 人類在此批准或拒絕
      "humanDecision": null,
      "humanNotes": null
    }
  ]
}
```

人類看到的是一張**結構化審核清單**，而非原始程式碼：
- ✅ 舊版測試全過
- ✅ 品質指標改善（error rate 2% → 0.5%）
- ✅ 新增 3 個邊界測試
- ⏳ 等待人類批准

人類只需點「approve」或「reject + 原因」。

### 完整迴圈示意

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   Atom v1.0 ──→ Production Use                  │
│       ↑              ↓                          │
│       │         Evidence Collection              │
│       │              ↓                          │
│       │         Quality Metrics                  │
│       │              ↓                          │
│       │    ┌── AI proposes v1.1 ──┐             │
│       │    │                      │             │
│       │    ↓                      ↓             │
│       │  Non-regression      Quality Gate       │
│       │  (v1.0 tests pass?)  (metrics improved?)│
│       │    ↓                      ↓             │
│       │    └──── Both pass? ──────┘             │
│       │              ↓                          │
│       │       Police Review                      │
│       │       (automated rules)                  │
│       │              ↓                          │
│       │       Human Review Queue                 │
│       │       (approve / reject)                 │
│       │              ↓                          │
│       │         ┌────┴────┐                     │
│       │         ↓         ↓                     │
│       │     Approve    Reject                    │
│       │         ↓         ↓                     │
│       │  Registry ←─ v1.1  Keep v1.0            │
│       │  updated    + log rejection              │
│       │         ↓                               │
│       └─── v1.1 enters production ──────────────┘
│                                                 │
└──── Self-Improving Feedback Loop ───────────────┘
```

### 可行性評估

| 面向 | 評估 |
|---|---|
| 技術可行性 | ✅ 所有基礎設施已存在或在建中 |
| 架構相容性 | ✅ 自然擴充 registry + evidence + police |
| 實作時機 | ⚠️ 需要 ATM-2-0004/0005/0009 先完成 |
| 第一個可驗證的迴圈 | alpha1 期間：seed atom 的 v1.0 → v1.1 演化 |
| 風險 | 中低：最大風險是 evidence schema 過度設計；建議 alpha0 時只收最小 metrics |

### 建議實作路線

| 時間點 | 動作 | 卡號 |
|---|---|---|
| ATM-2-0004 完成後 | 在 registry 加入 `versions[]` 陣列 | ATM-2-0004 延伸或 follow-up |
| ATM-2-0005 實作時 | Police API 加入 `upgrade-gate` 規則 | ATM-2-0005 |
| ATM-2-0009 實作時 | Evidence schema 加入 `usage-feedback` type | ATM-2-0009 |
| Alpha0 達標後 | 框架版號 `0.1.0-alpha0` + git tag | ATM-2.5-0002 通過時 |
| Alpha1 期間 | 第一次完整迴圈：seed atom v1.0 → v1.1 | 新卡 |
| Alpha1 期間 | Human review queue 機制 + 審核 UI/CLI | 新卡 |

---

## 總結

| 命題 | 可行？ | 現有基礎 | 缺少什麼 | 建議時機 |
|---|---|---|---|---|
| 原子版號 + 不退轉 + rollback | ✅ 完全可行 | hashLock + registry + test runner | versions[] + rollback CLI | ATM-2-0004 延伸 |
| ATM 框架版號管理 | ✅ 低成本高價值 | schema version + CHANGELOG | semver + git tag + compatibility | alpha0 達標時 |
| 自我回饋進步迴圈 | ✅ 可行且創新 | evidence + police + regression | usage schema + quality gate + human queue | alpha1 期間首次完整驗證 |

**核心洞察**：使用者提出的三個命題不是獨立需求，而是同一個架構願景的三個面向——**原子的持續演化由證據驅動、由機器驗證、由人類把關**。ATM 的現有設計已經為這個願景鋪好了大部分基礎設施。

---

---

# Part IV：Roadmap §7.1 Bootstrap Atoms vs 當前實作 vs 反饋迴圈
