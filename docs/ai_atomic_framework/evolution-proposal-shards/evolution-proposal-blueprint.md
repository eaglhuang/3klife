# 關於進化版的原子提案 — Roadmap 藍圖與融合分析

> 這是 `關於進化版的原子提案.md` 的「Roadmap 藍圖與融合分析」分片。完整索引見 `docs/ai_atomic_framework/關於進化版的原子提案.md`。

## 使用者提供的 Roadmap §7.1 原始藍圖

10 個 bootstrap atoms 構成原子的完整生命週期管線。

## 三向對照表

| # | Roadmap Atom | 功能 | 當前 ATM 卡號 | 狀態 | Upstream commit |
|---|---|---|---|---|---|
| 000001 | **ParseAtomicSpec** | 讀 spec → 驗 schema → normalized model | ATM-2-0001 | ✅ **done** | `87c689c` |
| 000002 | **GenerateAtomicScaffold** | 從 spec 產 workbench 檔案 | ATM-2-0002 | ✅ **done** | `b8a3270` |
| 000003 | **BuildAgentPrompt** | 從 spec 產 AI prompt（含禁止規則） | 無直接卡（部分在 ATM-1-0008 bootstrap） | ⏳ 概念存在 |
| 000004 | **ExecuteAgentTask** | 呼叫 AI agent（Effect Node） | 無直接卡 | ⏳ 概念存在 |
| 000005 | **RunAtomicTest** | sandbox 跑測試、收集 metrics | ATM-2-0003 | ✅ **done** | `391b462` |
| 000006 | **ValidateAtomicOutput** | spec 合規、forbidden import、side effect | ATM-2-0005 | ⏳ open |
| 000007 | **ComputeAtomicHash** | specHash / codeHash / testHash | ATM-2-0004 | 🟡 **in-progress** |
| 000008 | **UpdateAtomicRegistry** | 通過後更新 registry + 標記 stable | ATM-2-0004 | 🟡 **in-progress** |
| 000009 | **InjectAtomicIntoLegacy** | 注入 stable atom 到 legacy script | ATM-3/ATM-4 adapter | ⏳ 未來 |
| 000010 | **RunRegressionMatrix** | 跑 regression、阻止品質退轉 | ATM-2-0005 + regression schema | ⏳ open |

**已完成 3/10、進行中 2/10、計畫中 5/10。**

---

## 原始管線 vs 反饋迴圈的關係

### 原始管線 = 「原子的誕生」

```
ParseAtomicSpec → GenerateScaffold → BuildAgentPrompt → ExecuteAgent
        ↓
RunAtomicTest → ValidateOutput → ComputeHash → UpdateRegistry
        ↓
InjectIntoLegacy → RunRegressionMatrix
```

這是一條**線性管線**：從 spec 到穩定原子的單次交付。

### 使用者的反饋迴圈 = 「原子的演化」

```
                    ┌────────────────────────────────────┐
                    ↓                                    │
Atom v1.0 → 生產使用 → 證據收集 → v1.1 提議             │
                         ↓                              │
              Non-regression (000010)                    │
              + Quality Gate (NEW)                       │
                         ↓                              │
              Police (000006) + Human Review             │
                         ↓                              │
              ComputeHash (000007)                       │
              → UpdateRegistry (000008)                  │
                         ↓                              │
                    Atom v1.1 ──────────────────────────┘
```

### 關鍵洞察：兩條管線共享同一組工具

**原始的 10 個 bootstrap atoms 同時服務於「誕生」和「演化」兩條管線。** 差別在於：

| 管線 | ParseSpec | RunTest | ValidateOutput | ComputeHash | UpdateRegistry | RunRegression |
|---|---|---|---|---|---|---|
| **誕生管線** | 讀新 spec | 跑新 tests | 驗新 code | 算新 hash | 寫新 entry | 確認不退轉 |
| **演化管線** | 讀**更新**的 spec | 跑 v1.0 tests + v1.1 tests | 驗更新的 code | **比較** hash 差異 | 更新 **version history** | **比較** v1.0 vs v1.1 品質 |

演化管線不需要全新的工具——它需要的是**把現有工具加上版本比較維度**。

---

## 需要新增的「演化專用」能力

### 現有原子的擴充（不需新建，只需增強）

| 原子 | 誕生模式（已有） | 演化模式（需增） |
|---|---|---|
| **000005 RunAtomicTest** | 收集 pass/fail | + 收集 **品質指標**（latency / error rate / coverage delta） |
| **000007 ComputeAtomicHash** | 計算三段 hash | + **比較** v1.0 hash vs v1.1 hash，產出 drift report |
| **000008 UpdateAtomicRegistry** | 寫入當前 entry | + 維護 **versions[]** 陣列 + rollback 支援 |
| **000010 RunRegressionMatrix** | 驗證不退轉 | + **品質比較報告**（v1.1 error rate vs v1.0 error rate） |

### 真正需要新建的原子（2~3 個）

| 新原子 | 功能 | 為什麼不能合併到現有原子 |
|---|---|---|
| **000011 CollectUsageEvidence** | 從生產環境收集使用回饋（invocationCount、errorRate、edgeCasePatterns） | 這是 Effect Node（需讀外部系統），不應混入 pure compute atoms |
| **000012 ProposeAtomicUpgrade** | 從 evidence + diff 產出 upgrade-proposal.json，列出品質改善證據 | 這是 orchestration（串接 000005 + 000006 + 000010），不應內嵌 |
| **000013 HumanReviewGate** | 將 proposal 放入審核佇列，等待人類 approve / reject | 這也是 Effect Node（需等外部輸入）；不能是 pure compute |

### 注意分類

```
000011 CollectUsageEvidence  → Effect Node（讀外部系統）
000012 ProposeAtomicUpgrade  → Compute Node（純函式：evidence in → proposal out）
000013 HumanReviewGate       → Effect Node（等人類輸入）
```

這正好驗證了 ATM 的分層設計：compute atoms 處理邏輯，effect nodes 處理外部互動，兩者不混用。

---

## 融合可行性結論

### 能否一起實現？

**✅ 完全可以，而且是自然延伸。**

原因：
1. **基礎設施已就位**：ParseSpec (000001) / Scaffold (000002) / TestRunner (000005) 三個核心已 done
2. **關鍵缺口正在填補**：Registry + HashLock (000007+000008) 正 in-progress
3. **演化管線不需新框架**：只需對現有原子加「版本比較」維度 + 2~3 個新 effect/orchestration atoms
4. **Roadmap §7.1 與反饋迴圈是互補的**：一個管誕生、一個管演化，共享同一組基礎原子

### 建議實施順序

```
Phase 1（ATM-2 完成，~alpha0）
  ✅ 000001 ParseAtomicSpec         — done
  ✅ 000002 GenerateAtomicScaffold  — done
  ✅ 000005 RunAtomicTest           — done
  🟡 000007 ComputeAtomicHash      — in-progress (ATM-2-0004)
  🟡 000008 UpdateAtomicRegistry   — in-progress (ATM-2-0004)
  ⏳ 000006 ValidateAtomicOutput   — ATM-2-0005
  ⏳ 000010 RunRegressionMatrix    — ATM-2-0005

Phase 2（alpha0 → alpha1）
  ⏳ 000003 BuildAgentPrompt       — 新卡或 ATM-2 延伸
  ⏳ 000004 ExecuteAgentTask        — 新卡（Effect Node）
  ⏳ 000008+ Registry versions[]   — ATM-2-0004 延伸
  ⏳ 000005+ Quality metrics       — ATM-2-0003 延伸

Phase 3（alpha1 中，首次完整演化迴圈）
  ⏳ 000011 CollectUsageEvidence   — 新卡
  ⏳ 000012 ProposeAtomicUpgrade   — 新卡
  ⏳ 000013 HumanReviewGate        — 新卡
  ⏳ 000009 InjectAtomicIntoLegacy — ATM-3/ATM-4

Phase 4（post-alpha1，自我管理全面運轉）
  所有 000001~000013 原子本身進入 governed 狀態
  → 管線的工具用管線自己來演化
  → 完整自舉：框架治理框架
```

### 視覺化：完整架構

```
┌────────── ATM Framework ──────────────────────────────┐
│                                                       │
│  Layer 1: Constitutional Immutables (hash-lock only)  │
│  ┌───────────────────────────────────────────────┐    │
│  │ atomic-spec.schema.json                       │    │
│  │ registry.schema.json                          │    │
│  │ regression-matrix.schema.json                 │    │
│  │ Hash algorithm contract                       │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  Layer 2: Self-Governed Atoms (hash + atom governance)│
│  ┌─ Birth Pipeline ──────────────────────────────┐    │
│  │ 000001 → 000002 → 000003 → 000004            │    │
│  │         → 000005 → 000006 → 000007 → 000008  │    │
│  └───────────────────────────────────────────────┘    │
│  ┌─ Evolution Pipeline ──────────────────────────┐    │
│  │ 000011 → 000012 → 000005+000010 → 000013     │    │
│  │         → 000007 → 000008 (version update)    │    │
│  └───────────────────────────────────────────────┘    │
│  ┌─ Legacy Integration ─────────────────────────┐     │
│  │ 000009 InjectIntoLegacy                      │     │
│  │ 000010 RunRegressionMatrix                   │     │
│  └──────────────────────────────────────────────┘     │
│                                                       │
│  Layer 3: Mutable Configuration (git governance)      │
│  ┌───────────────────────────────────────────────┐    │
│  │ .atm/profile  │  adapter configs  │  templates│    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---
