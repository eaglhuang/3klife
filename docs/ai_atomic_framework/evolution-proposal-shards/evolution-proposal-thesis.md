# 關於進化版的原子提案 — 命題與防護模型

> 這是 `關於進化版的原子提案.md` 的「命題與防護模型」分片。完整索引見 `docs/ai_atomic_framework/關於進化版的原子提案.md`。

## 命題

> 「等框架穩定後，應該用 Hash-lock 鎖起來，或者也轉化為原子管理，這樣就不會被輕易改動了。」

## 關鍵發現：ATM 已經在做這件事

ATM-1.5 phase（Seed-as-Spec）正是「框架用自己的治理語言管理自己」的第一次實證：

| 里程碑 | 已完成？ | 做了什麼 |
|---|---|---|
| ATM-1.5-0001 Seed-as-Spec | ✅ commit `ad5f091` | 種子（seed.js ~300 LOC）第一次用自己的 Atomic Spec schema 描述自己 → `atom-seed-spec.json` |
| ATM-1.5-0002 hash-lock self-verify | ✅ commit `d3ac9cf` | `atm verify --self` 驗證 specHash / codeHash / testHash 三段一致；改一行 seed.js 就偵測到 drift |
| ATM-1.5-0003 governed 收編 | ✅ commit `d90c2f6` | 舊 hand-written seed 標 `@deprecated`；ATM-CORE-0002 成為 governed 繼承者；Phase B1 complete |

**結論：hash-lock 和自我原子化不是二選一，它們是互補的兩層。** ATM-1.5 已經同時使用了兩者。

---

## 三層防護模型（推薦方案）

Hash-lock 和原子化各有適用場景。最穩健的方案是分層防護：

### Layer 1 — 不可變核心（Constitutional Immutables）→ 只用 Hash-lock

這一層定義「什麼是原子」。它本身不能是原子（否則誰來治理治理者？）。

| 組件 | 保護機制 | 理由 |
|---|---|---|
| `schemas/atomic-spec.schema.json` | hash-lock + schema version | 改這個等於改原子的定義本身 |
| `schemas/registry.schema.json` | hash-lock + schema version | registry 是所有原子的真相索引 |
| `schemas/regression-matrix.schema.json` | hash-lock + schema version | regression 是品質閘門的契約 |
| Hash-lock 演算法本身 | 只能透過 schema migration ceremony 更改 | 改 hash 演算法 = 所有現有 hash 失效 |

**修改方式**：不能 patch——必須 **版本遷移**（atmSchemaVersion bump + migration script + 全 registry 重算 hash）。這相當於「修憲程序」。

### Layer 2 — 自治原子（Self-Governed Atoms）→ Hash-lock + 原子化治理

這一層是框架的可演化部分。它們本身就是原子，用 ATM 的治理流程管理自己。

| 組件 | Atom ID | 狀態 | Hash-lock | 原子化治理 |
|---|---|---|---|---|
| Seed (core bootstrap) | ATM-CORE-0001/0002（`logicalName: atom.core-seed`） | ✅ governed | ✅ 三段 hash | ✅ `atm verify --self` |
| neutralityScanner | ATM-CORE-0003（`logicalName: atom.plugin-rule-guard.neutrality-scanner`） | ⏳ 計畫中 | 計畫中 | 計畫中 |
| Police plugin rules | 計畫中 (ATM-2-0005) | ⏳ | 計畫中 | 計畫中 |
| Registry manager | 計畫中 (ATM-2-0004) | ⏳ | 計畫中 | 計畫中 |
| CLI commands | 已建立 (ATM-1-0004) | 待收編 | 待補 | 待補 |
| Adapter interfaces | 已建立 (ATM-1-0005/6) | 待收編 | 待補 | 待補 |

**修改方式**：走 ATM 標準流程——spec 更新 → hash 重算 → regression 驗證 → registry 更新。任何 hash drift 都會被 `atm verify --self` 攔截。

### Layer 3 — 可變配置（Mutable Configuration）→ 標準版本控制

這一層是消費者自訂的部分，不適合原子化。

| 組件 | 保護機制 | 理由 |
|---|---|---|
| `.atm/profile` | git + task-lock | 每個專案不同；原子化開銷不值得 |
| Adapter 設定 | git + schema validation | 配置隨宿主專案變化 |
| Bootstrap templates | git + hash 校驗（輕量） | 快速迭代中，全原子化太重 |

---

## 為什麼不能只用 Hash-lock？

Hash-lock 解決的是「完整性偵測」（THAT something changed），但它不解決：

| 問題 | Hash-lock 能解決？ | 原子化治理能解決？ |
|---|---|---|
| 有人改了一行程式碼 → 偵測到 | ✅ | ✅ |
| 判斷這個改動是否合法 | ❌ | ✅（spec / regression / police） |
| 自動回退到上一個已知好的版本 | ❌ | ✅（registry 有版本歷史） |
| 確保改動不破壞下游消費者 | ❌ | ✅（regression matrix） |
| 追蹤誰、何時、為何改動 | ❌（只知道 hash 不同） | ✅（evidence / artifact / log） |

**Hash-lock 是必要但不充分的。** 它是原子化治理的基礎設施之一，不是替代方案。

## 為什麼不能全部原子化？

有些東西不能是原子——因為它們定義了「什麼是原子」。如果核心 schema 本身也是原子，就產生循環依賴：

```
原子需要 atomic-spec.schema.json 才能被驗證
atomic-spec.schema.json 如果是原子，就需要自己來驗證自己
→ 自驗證悖論
```

ATM-1.5 用一個巧妙的方式部分解決了這個悖論：seed 用自己的 spec 描述自己（ATM-CORE-0001），然後由 ATM-CORE-0002 接管治理。但核心 **schema 本身**仍然在原子系統之外——它是「憲法」，不是「法律」。

---

## 結論與建議

| 方案 | 適用場景 | 可行性 | 推薦度 |
|---|---|---|---|
| 只用 Hash-lock | ❌ 不足——偵測到變化但無法治理演化 | 技術可行但不完整 | ⚠️ 僅作為基礎層 |
| 全部原子化 | ❌ 不可能——核心 schema 存在自驗證悖論 | 結構性不可行 | ❌ |
| **三層防護（推薦）** | ✅ 不可變核心 + 自治原子 + 可變配置 | ✅ 完全可行，ATM-1.5 已是實證 | **✅ 推薦** |

**ATM 已經在正確的路上。** ATM-1.5 phase 完成了自舉悖論的第一輪化解（seed 用自己描述自己、hash-lock 自我驗證、governed 收編）。接下來的路線圖自然地延伸這個模型：

1. **alpha0 後**：hash-lock 核心 schemas（Layer 1 就位）
2. **alpha1 中**：CLI、adapters、police rules 收編為原子（Layer 2 擴展）
3. **alpha1 後**：框架演化完全透過 ATM 標準流程管理（Layer 2 全覆蓋）

2026-05-08 補強：Layer 2 全覆蓋必須由 `ATM-2-0050` 的 framework function atomization manifest 驗證，不再只靠文件承諾。

不需要新增任何機制——現有的 hash-lock + atom spec + registry + `atm verify --self` 已經構成完整的三層防護基礎。缺的只是把更多組件收編進 registry（ATM-2 phase 的自然工作）。

---

---

# Part III：三個延伸架構命題

> 使用者在確認三層防護模型後追問三件事：
> 1. 利用原子版號保證功能不退轉 + rollback 機制
> 2. 整個 ATM 也需要版本管理
> 3. 原子使用過程中的回饋 → 新版本 → 品質警察驗證 → 人類審核 → 自我進步迴圈

