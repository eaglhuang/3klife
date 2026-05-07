# 原子行為參考手冊 — 廣義多形化原則

> 這是 `原子行為參考手冊.md` 的「廣義多形化原則」分片。完整索引見 `docs/ai_atomic_framework/原子行為參考手冊.md`。

## 4. 廣義多形化原則（ATM-POLY-001）

> **若兩個原子的 semantic fingerprint 差異可以被一個或多個「維度參數」解釋（即：用同一個 template + 不同參數值可以產出兩者的 spec），則它們必須被視為同一顆多形原子的不同實例。**

### 4.1 可多形化的維度

| 維度 | 範例 | 多形方式 |
|---|---|---|
| 參數 | `parseCssColor(format: 'hex')` vs `(format: 'rgb')` | template + `params.format` |
| 輸入類型 | `normalize(input: string)` vs `(input: Buffer)` | template + `typeParam.input` |
| 輸出形狀 | `parse → {value}` vs `→ {value, metadata}` | template + `outputProfile` |
| 語言 | 同 spec 的 TypeScript vs Rust 實作 | template + `lang` dimension |
| 品質 budget | 同功能但 timeout=100ms vs 1000ms | template + `performanceProfile` |
| 行為變體 | `sort(stable: true)` vs `(stable: false)` | template + `variant` |

### 4.2 對去重流程的影響

```
Dedup 比對流程（含多形判斷）：

1. sf 完全相同 → 強去重（merge candidate）
2. sf 高相似（≥90%） →
   2a. 差異可用「維度參數」解釋?
       → YES → 建議 polymorphize（不是 merge）
       → NO  → 弱去重 report
3. sf 不同 → 不重複
```

### 4.3 原子數量效益

多形化能大幅降低 registry 中的原子總數——多個變體只佔 1 個 template entry，其餘為 lazy instantiation 不佔 registry slot。

---
