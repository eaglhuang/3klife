<!-- doc_id: doc_spec_0473 -->
<!-- spec_id: JRN-01 -->
# 武將日誌主檔結構與Action序號回扣API規格書

## 1. 核心定位與設計理念
本規格書定義三國生活（3KLife）武將生涯系統之「個人日誌主檔（JournalLog）結構、寫入校驗與底層行為序號回扣」規格（對應 WBS `JRN-01` 與 `PROG-2-0972`）。
武將日誌作為記錄角色一生重大戰役、內政派遣、人際互動與生涯成長之核心時間軸，堅持**只增不刪、雙向可追溯、純函式無副作用**原則：
1. **只增不刪的時間軸（Append-Only）**：日誌主檔嚴禁中間插入或刪改，時間戳採 ISO 8601 格式，保證自然字典序與時間序一致。
2. **底層行為序號回扣（Action Link）**：每筆日誌記錄底層 `Action_Records` 序號範圍 $[start, end]$，具備向歷史真實操作追溯與驗證防作弊能力。
3. **視圖與多語參數解耦**：條目保留本地化文字摘要，並支援劇本代碼 `summaryKey` 與動態佔位參數 `summaryArgs`。

---

## 2. 日誌分類與實體結構 (`JournalEntry`)
日誌條目標準結構定義如下：
```typescript
export const JOURNAL_CATEGORIES = ['BATTLE', 'DISPATCH', 'INTERACTION', 'GROWTH', 'SYSTEM'] as const;
export type JournalCategory = typeof JOURNAL_CATEGORIES[number];

export interface JournalEntry {
    entryId: string;                     // 全域唯一條目 ID
    timestamp: string;                   // ISO 8601 時間字串（如 2026-04-11T06:00:00）
    category: JournalCategory;           // 五大標準分類
    relatedGeneralUids: string[];        // 涉及之武將 UID 陣列
    priority: number;                    // 優先級（0 ~ 100）
    summary: string;                     // 條目文字摘要（預設 zh-TW）
    visibility: 'VISIBLE' | 'HIDDEN';   // 介面可見性
    sourceActionSeqRange?: [number, number]; // 底層 Action_Records 序號區間 [起, 迄]
    snapshotRef?: string;                // 對應快照 ID（如戰鬥或派遣快照）
    summaryKey?: string;                 // i18n 查表 key
    summaryArgs?: string[];              // 佔位參數
}
```

### 2.1 五大核心分類說明
- `BATTLE`（戰役）：斬將、守城、退敵、戰敗負傷等戰鬥事件。
- `DISPATCH`（派遣）：巡視、治安、商貿、情報刺探等外派任務。
- `INTERACTION`（互動）：離線對話、名士拜訪、義結金蘭、宴飲結交。
- `GROWTH`（成長）：屬性突破、戰法升階、官職晉升、領悟奧義。
- `SYSTEM`（系統）：世代傳承、除役回流、封賞賜爵等架構事件。

---

## 3. 寫入檢驗與查詢 API (`JournalLog.ts`)

### 3.1 寫入校驗規則 (`appendJournalEntry`)
新增條目時必須通過嚴格純邏輯驗證，任何一項不合即安全拒絕，原日誌狀態不變：
1. **ID 唯一性**：`entryId` 必須為非空字串，且不得與現有日誌重複。
2. **時間格式**：`timestamp` 必須符合正規表示式 `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/`。
3. **分類與優先級**：`category` 必須屬 5 大分類之一；`priority` 必須介於 0 至 100。
4. **Action 序號邊界**：若存在 `sourceActionSeqRange`，長度必須為 2，且 $0 \le start \le end$。

### 3.2 查詢過濾機制 (`queryJournal`)
提供呼叫端依條件過濾：
- 支援傳入 `generalUid`（武將個人抽屜檢視）與 `category` 篩選。
- 回傳結果深層複製，並自動依 `timestamp` 倒序排列（最新事件排在最前）。

---

## 4. Unity 與 Cocos Creator 概念對照
| 概念維度 | Cocos Creator 實作架構 | Unity 引擎對照架構 |
| :--- | :--- | :--- |
| **日誌容器** | `JournalState` 純資料結構，由 `GameSession` 統一序列化 | 類似 `TimelineEventLogSO` 或二進位事件存檔列表 |
| **序號回扣** | `sourceActionSeqRange` 索引底層 Command 歷史 | 關聯至 `ReplayCommandQueue` 執行序號 |
| **無副作用設計** | 純函式 `appendJournalEntry` 回傳新狀態副本 | 採用 Immutable Event Sourcing 模型，避免跨模組資料競爭 |

---

## 5. 驗證條件與測試矩陣 (Acceptance Gate)
1. **TC-JRN01-01 合法日誌正常寫入**：傳入完整結構，驗證成功寫入且長度 $+1$，新日誌出現在狀態中。
2. **TC-JRN01-02 重複 ID 阻斷防護**：傳入已存在之 `entryId`，驗證回傳 `duplicate-entry-id` 且拒絕寫入。
3. **TC-JRN01-03 Action 序號倒置阻斷**：傳入 `[10, 5]` 逆向序號範圍，驗證回傳 `invalid-action-range`。
4. **TC-JRN01-04 依武將 UID 倒序查詢**：針對特定武將查詢，驗證僅回傳相關條目且時間由新到舊排序。
