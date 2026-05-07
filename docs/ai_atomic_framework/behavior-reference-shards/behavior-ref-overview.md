# 原子行為參考手冊 — 概覽與行為總表

> 這是 `原子行為參考手冊.md` 的「概覽與行為總表」分片。完整索引見 `docs/ai_atomic_framework/原子行為參考手冊.md`。

<!-- doc_id: doc_other_0045 -->
# 原子行為參考手冊（Atom Behavior Reference）

> 本文件是 ATM 框架中所有原子行為的完整參考。主計畫書（`關於進化版的原子提案.md` Part V §6~§9）引用本文件。
> 對應任務卡 chain：`ATM-IDENTITY-BEHAVIOR-V1`（ATM-2-0028 ~ ATM-2-0033）

---

## 1. 概覽

### 1.1 設計原則

1. **行為本身就是原子**：每個 behavior 是一顆 governed atom（spec + code + test），可被 registry 管理、hash-lock 鎖定、被另一個 behavior 觸發
2. **行為由 plugin 提供**：core 只定義 `AtomBehavior` interface 與 evidence schema；具體行為由 reference plugin pack 實作；專案可加自己的 behavior plugin
3. **每個行為都有 5 個合約面**：trigger → evidence → gates → registry transition → rollback
4. **行為可組合**：dedup-merge = similarity-scan + merge + sweep；polymorphic-evolve = polymorphize + evolve

### 1.2 行為分類（4 類）

| 分類 | 英文 | 包含的行為 | 說明 |
|---|---|---|---|
| **拓撲類** | Topology | split / merge / compose / dedup-merge / atomize | 改變原子數量或 map 結構 |
| **品質類** | Quality | evolve / polymorphize | 改能力不改身份 |
| **衛生類** | Sanitation | sweep / expire | 移除或棄用 |
| **整合類** | Integration | infect / atomize | 接入 legacy 系統 |

> 注意：`atomize` 同時屬於 Topology 和 Integration（因為它既產新原子又接入 legacy）。

---

## 2. 行為總表

| # | 中文 | 行為 ID | 拓撲變化 | 觸發條件 | 前置狀態 | Lineage tag |
|---|---|---|---|---|---|---|
| 1 | 分裂 | `behavior.split` | 1 → 2+ | 手動 / size police / **demand police（子功能被 ≥2 caller 引用）** | active | `bornBy: split` |
| 2 | 合併 | `behavior.merge` | 2+ → 1 | 手動 / dedup proposal | 都是 active | `bornBy: merge` |
| 3 | 串接（含樹狀） | `behavior.compose` | n atoms → 1 map | 手動 / pattern detection | n 個 active | `bornBy: compose`（在 map） |
| 4 | 自動吞噬（去重） | `behavior.dedup-merge` | 2 → 1 | dedup police + similarity ≥90% | active + active | `bornBy: merge`（dedup 變體） |
| 5 | 清理 | `behavior.sweep` | 1 → 1 (deprecated) | unused-caller scan | active 且 0 callers | 不改 lineage，只改 status |
| 6 | 演化 | `behavior.evolve` | 1@v1 → 1@v2 | usage-feedback / human propose | active@vN | `bornBy: evolve` |
| 7 | 自我毀滅（TTL） | `behavior.expire` | 1 → 1 (expired) | scheduled scan + ttl.expiresAt | deprecated 且 TTL 已到 | 不改 lineage |
| 8 | 多形 | `behavior.polymorphize` | 1 spec → n instances | 偵測高度相似 spec（差異可被維度參數解釋） | active | `bornBy: polymorphize` |
| **9** | **感染** | **`behavior.infect`** | **0 atoms → patch plan** | **legacy 區段 sf 與已有 atom 相同** | **目標 atom 是 active** | **atom 端 caller +1** |
| **10** | **轉化（原子化）** | **`behavior.atomize`** | **legacy → 1 新 atom** | **手動 / pattern detection** | **legacy 區段識別 + sf 計算** | **`bornBy: atomize`** |

---
