# 原子行為參考手冊 — 各行為詳細說明

> 這是 `原子行為參考手冊.md` 的「各行為詳細說明」分片。完整索引見 `docs/ai_atomic_framework/原子行為參考手冊.md`。

## 3. 各行為詳細說明

### 3.1 behavior.split（分裂）

| 項目 | 說明 |
|---|---|
| **觸發** | (1) 手動——人類判斷原子職責過多；(2) size police——程式碼行數/複雜度超標；(3) **demand police——原子中特定子功能被 ≥2 外部系統/原子引用** |
| **前置狀態** | active |
| **結果** | 2+ 個 active atoms（各帶 `lineage.bornBy: split`、`parentRefs: [原 atom FQID]`） |
| **evidence** | split-plan + 新舊 sf 比對 |
| **狀態轉換** | 原 atom → deprecated（若全部功能都轉移）或 active（若只分出部分） |
| **rollback** | 合併回原 atom + 刪除新 atoms |

### 3.2 behavior.merge（合併）

| 項目 | 說明 |
|---|---|
| **觸發** | 手動 / dedup proposal |
| **前置狀態** | 所有參與者都是 active |
| **結果** | 1 個 active（合併後）+ N 個 deprecated |
| **evidence** | merge-plan + 合併後 sf |
| **狀態轉換** | 被吸收者 → deprecated |
| **rollback** | split 回各自 atom + 恢復 caller refs |

### 3.3 behavior.compose（串接/組合）

| 項目 | 說明 |
|---|---|
| **觸發** | 手動 / pattern detection |
| **前置狀態** | n 個 active atoms |
| **結果** | 同 atoms 不變，新增 1 個 map（active） |
| **evidence** | map composition + members[] + edges[] |
| **狀態轉換** | 新增 map entry in registry |
| **rollback** | 刪除 map entry |

### 3.4 behavior.dedup-merge（自動吞噬/去重）

| 項目 | 說明 |
|---|---|
| **觸發** | dedup police 偵測 sf 100% 或 similarity ≥ 90% + human approve |
| **前置狀態** | 兩個 active atoms |
| **結果** | 1 個 active + 1 個 deprecated |
| **evidence** | similarity-report + dedup-decision |
| **狀態轉換** | 被吸收者 → deprecated；所有 caller refs 導向存活者 |
| **rollback** | 恢復被吸收者為 active + 恢復 caller refs |

### 3.5 behavior.sweep（清理）

| 項目 | 說明 |
|---|---|
| **觸發** | unused-caller scan（0 callers 持續 N 天） |
| **前置狀態** | active 且 0 callers |
| **結果** | 1 → 1（deprecated） |
| **evidence** | unused-report + caller list（空） |
| **狀態轉換** | active → deprecated |
| **rollback** | 恢復為 active |

### 3.6 behavior.evolve（演化）

| 項目 | 說明 |
|---|---|
| **觸發** | usage-feedback / human propose / quality police |
| **前置狀態** | active@vN |
| **結果** | active@vN+1（舊版仍 active 直到 sweep） |
| **evidence** | upgrade-proposal + quality-comparison + automated gates |
| **狀態轉換** | 新版 active；舊版維持 active（callers 可自行遷移） |
| **rollback** | 刪除新版 + registry 回指舊版 |

### 3.7 behavior.expire（自我毀滅/TTL）

| 項目 | 說明 |
|---|---|
| **觸發** | scheduled scan + ttl.expiresAt 已過 |
| **前置狀態** | deprecated 且 TTL 已到 / sweep 已過寬限 |
| **結果** | 1 → 1（expired，終態） |
| **evidence** | expiry-report |
| **狀態轉換** | deprecated → expired |
| **rollback** | 不可 rollback（終態） |

### 3.8 behavior.polymorphize（多形）

| 項目 | 說明 |
|---|---|
| **觸發** | 偵測高度相似 spec——差異可被維度參數解釋（見 §4 廣義多形化） |
| **前置狀態** | active |
| **結果** | active (template) + N validated（實例為 lazy，不展開到 registry） |
| **evidence** | polymorph-template + dimension-spec |
| **狀態轉換** | 原 atom 成為 template；被統一的 atoms → deprecated |
| **rollback** | 展開 template 回各自獨立 atoms |

### 3.9 behavior.infect（感染）

| 項目 | 說明 |
|---|---|
| **觸發** | legacy 區段被偵測 sf 與已有 atom 相同 |
| **前置狀態** | 目標 atom 是 active |
| **結果** | 0 新 atoms；產生 patch plan（legacy 呼叫改為 atom 呼叫） |
| **evidence** | infect-plan + dry-run patch + 新 caller refs |
| **狀態轉換** | 目標 atom 不變；legacy 注入點記錄到 caller list |
| **rollback** | 移除 caller ref + 還原 legacy 呼叫 |

### 3.10 behavior.atomize（轉化/原子化）

| 項目 | 說明 |
|---|---|
| **觸發** | 手動 case study / 提案 / legacy pattern detection |
| **前置狀態** | legacy 區段識別 + sf 計算 |
| **結果** | 1 個新 atom（draft → validated → active） |
| **evidence** | atomize-proposal + 新 atom spec + 對映 legacy patch + sf |
| **狀態轉換** | 新 atom 走完整 promote 流程 |
| **rollback** | 刪除新 atom + 還原 legacy |
| **Lineage** | `bornBy: atomize`，`parentRefs: ["legacy://<host>/<path>#L<start>-L<end>"]` |

---
