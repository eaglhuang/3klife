<!-- doc_id: doc_spec_0686 -->
# 3KLife 客戶端NPC互動記憶四段結構讀寫與上報壓縮狀態機規格書

> **規格代碼**：SPEC-DATA-BRAIN11  
> **關聯 WBS**：BRAIN-11（M11 互動記憶 API M1-M4 與 M5 壓縮）、BRAIN-13（M11 Cocos 互動記憶 adapter 與事件回寫）、NPC-09（M1 NPC_Memory 本地 read model）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

為使三國名將具備跨章節與跨劇情的深層情感記憶，且避免存檔體積與同步封包無限膨脹，本規格書制定客戶端 `NpcMemoryAdapter` 之**四段記憶資料結構（Four-Stage Memory Architecture）**與**本地 LRU 壓縮狀態機（M5 Compression FSM）**。確保記憶在單將 $2\text{KB}$ 硬預算內精準沉澱，並以非阻塞方式回寫存檔與同步中台。

---

## 2. 四段記憶資料模型 (M1 ~ M4)

每個名將之記憶載荷嚴格劃分為四個獨立層級：

```typescript
export interface GeneralMemoryStructure {
  generalId: string;                  // 武將 ID
  lastUpdatedTimestamp: number;       // 最後更新時間戳
  
  // M1: 短期工作記憶 (Working Context，上限 3 輪)
  shortTermTurns: Array<{
    turnId: string;
    playerTopic: string;              // 玩家輸入或選取主題
    npcResponseSnippet: string;       // NPC 回應前 30 字摘要
  }>;
  
  // M2: 情感態度錨點 (Sentiment Anchor)
  sentimentAnchor: {
    favorabilityScore: number;        // 好感度數值 (0 ~ 100)
    currentDisposition: 'devoted' | 'friendly' | 'neutral' | 'guarded' | 'hostile';
    intimacyTitle: string;            // 稱謂階梯 (如 "主公" / "使君" / "足下")
  };
  
  // M3: 重大共歷事件 (Shared Milestones，上限 10 筆)
  milestones: Array<{
    eventId: string;                  // 如 "EVENT_CHANG_BAN_RESCUE"
    yearSeason: string;               // 如 "196_AUTUMN"
    impactWeight: number;             // 1 ~ 5
    summary: string;                  // 最長 24 字
  }>;
  
  // M4: 宿命抉擇摘要 (Destiny Decisions，上限 5 筆)
  destinyDecisions: Array<{
    dilemmaId: string;
    choiceTag: string;                // 如 "CHOICE_SPARE_LVMENG"
    consequenceDigest: string;        // 最長 30 字
  }>;
}
```

---

## 3. 本地 M5 壓縮狀態機與傳輸省略規範

### 3.1 壓縮觸發與淘汰策略 (LRU Eviction)

1. **體積預算**：單一武將之 `GeneralMemoryStructure` JSON 序列化大小上限為 $2048\text{ Bytes}$。
2. **超限壓縮流程**：
   - 當資料大小 $> 2048\text{B}$ 時，觸發壓縮狀態機：
     - **第一級**：將 `shortTermTurns`（M1）壓縮為單一 40 字之上下文摘要。
     - **第二級**：若仍超限，對 `milestones`（M3）依 `impactWeight` 升序與時間戳淘汰最低優先級事件。
     - **保底約束**：`sentimentAnchor`（M2）與 `destinyDecisions`（M4）永遠禁止被自動淘汰。

### 3.2 網路傳輸全空省略規則 (Empty Payload Omission)

在發送 `/sync/delta` 或請求中台生成對話時，若該武將之四段記憶均為空（M1=0、M2 初始、M3=0、M4=0），客戶端**強制在請求中省略 `playerGeneralMemory` 欄位**，杜絕無意義空物件佔用傳輸頻寬。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-BRAIN-11-01【短期記憶 3 輪滾動覆蓋】**：連續進行 5 輪對話，驗證 `shortTermTurns` 嚴格僅保留最近 3 輪，最舊的 2 輪自動移出。
- **TC-BRAIN-11-02【單將 2KB 超限壓縮觸發】**：連續寫入 15 筆共歷事件致使體積達 2.6KB，壓縮狀態機啟動，成功淘汰 5 筆低權重事件，將體積壓回 $1980\text{ Bytes} \le 2048\text{B}$。
- **TC-BRAIN-11-03【全空記憶上報省略驗證】**：以新獲得且未曾互動之武將發起對話，請求 Body 中確實驗證無 `playerGeneralMemory` 鍵值。
