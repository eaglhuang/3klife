<!-- doc_id: doc_spec_0333 -->
# NPC記憶模型與離線情境回溯規格書

> **責任邊界**：本檔為 NPC 記憶適配器（NpcMemoryAdapter）、情境召回（Recall_Context）與離線模板填槽對話的單一真相來源。
> **關聯 WBS**：DS-09（NPC_Memory 最小 read model）、DS-04（Data 掛載點）、NPC-01（NPC 人性化）。
> **整併裁決**：確立記憶資料單向回寫與隱私隔離：**嚴禁上傳整份玩家存檔**，僅傳遞 180 字元之最小互動載荷。

---

## §1. 互動事件最小載荷協議 (Payload Contract)

當玩家與武將完成對話、戰場交流或學府互動時，系統透過 `NpcMemoryAdapter` 派發標準回寫事件：

```typescript
export interface NpcInteractionCompletedPayload {
  saveId?: string;                 // 玩家存檔唯一識別碼
  generalId: string;               // 武將模板代碼（如 'zhao_yun'）
  eventType: string;               // 事件型態（如 'battle_triumph'）
  summary: string;                 // 事件情境摘要，【嚴格限制 180 字元內】
  keywords?: string[];             // 語義檢索關鍵字標籤
  playerAction?: string | null;    // 玩家選擇或決策
  generalReaction?: string | null; // 武將情態反饋
  isMilestone?: boolean;           // 是否為歷史重大里程碑
  fallbackUsed?: boolean;          // 是否使用了兜底模板句
}
```

### 記憶防污染守則 (Anti-Pollution Rule)

- **兜底句過濾**：若本次對話觸發了通用保底台詞（`fallbackUsed === true`），**後端強制中斷寫入**，嚴禁將機械式範本句污染至武將長期記憶庫。
- **長度硬約束**：`summary` 超過 180 字元自動截斷（`summary.slice(0, 180)`），防止日誌無限膨脹。

---

## §2. 離線情境回溯與模板填槽機制 (Template Slot Values)

在無網路連線或離線遊玩情境下，系統完全不依賴遠端大腦向量檢索，改採純本機填槽引擎：

```
[玩家發起對話] ──> 是否離線?
      │
      ├──> [是: 離線] ──> 讀取本機 Recall_Context ──> 填入 Template_Slot_Values
      │                                                     │
      └──> [否: 連網] ──> 查詢最小 Read Model ───────────────┴─> 生成沉浸台詞
```

### 本地插值填槽範例

| 槽位變數 Key | 資料來源 | 替換文字範例 |
|:---|:---|:---|
| `{PlayerName}` | 當前君主自訂名稱 | 「主公」、「黃將軍」 |
| `{Location}` | 當前所在城市或地圖格 | 「許昌」、「長坂坡」、「水鏡莊」 |
| `{Companion}` | 當前隊伍中好感度最高武將 | 「關雲長」、「諸葛孔明」 |
| `{RecentBattle}`| 最近一次出征獲勝之戰役名 | 「官渡之戰」、「赤壁水戰」 |

---

## §3. 本機記憶快照與容量淘汰協議

武將在客戶端本機的記憶歷史儲存於 `Player_Save.Data.General_Journal` 下：

1. **容量天花板**：單一武將最多保留 **50 條記憶條目**。
2. **淘汰演算法 (Milestone Protection)**：
   - 當記憶條目達 50 條時，系統自動剔除最古老的一筆記錄。
   - **里程碑保護**：標記為 `isMilestone: true` 之重大歷史記憶（如初次結義、登基稱帝、平定一州）**永久鎖定**，不可被自然滾動淘汰。
