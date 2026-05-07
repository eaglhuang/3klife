# NPC Brain Memory System — Data Model（§4-§5）

> 這是 `npc-brain-武將互動記憶系統.md` 的「Data Model（§4-§5）」分片。完整索引見 `docs/tech/npc-brain-武將互動記憶系統.md`。

## 4. 資料模型

### 4.1 Server 端：`InteractionEvent`（原始事件）

```python
# server/npc-brain/app/interaction_memory.py

class InteractionEvent(BaseModel):
    eventId: str               # uuid4，server 端生成
    saveId: str
    generalId: str
    eventType: str             # "dialogue" | "promise_made" | "gift_given" | "quest_accepted" ...
    summary: str               # 最多 200 字的純文字描述
    keywords: list[str] = []   # 本次互動涉及的 keywordKey
    playerAction: str | None = None   # 玩家選擇的行動描述
    generalReaction: str | None = None
    isMilestone: bool = False  # 是否應寫入 longTerm
    createdAt: str             # ISO 8601 UTC
```

**設計決策**：`InteractionEvent` 刻意保持扁平與簡短。它是 LLM 壓縮的原料，事件越精簡，壓縮 prompt 的 token 消耗越低。

### 4.2 Server 端：`GeneralMemoryData`（壓縮記憶）

```python
class GeneralMemoryData(BaseModel):
    saveId: str
    generalId: str
    schemaVersion: int = 1     # 壓縮 prompt 合約版本，改 prompt 時 bump
    shortTerm: str = ""
    longTerm: str = ""
    playerProfile: str = ""
    promises: str = ""
    lastCompressedIdx: int = 0   # 安全指針：已成功納入壓縮的事件數量
    uncompressedCount: int = 0   # 已收到的總事件數，用於崩潰偵測
    lastCompressedAt: str | None = None
```

**`schemaVersion` 的作用**：壓縮 prompt 改版後，舊記憶是在舊語意下壓縮的。載入時如果 `schemaVersion` 與 `CURRENT_MEMORY_SCHEMA_VERSION` 不符，系統應從原始 `InteractionEvent` 日誌重新壓縮，而不是繼承格式不一致的舊記憶。

**`lastCompressedIdx` 的作用**：見第 8 節「安全壓縮機制」。

### 4.3 Cocos 端 TypeScript 介面（新增至 `NpcDialogueService.ts`）

```typescript
// 新增介面

export interface NpcInteractionEventPayload {
    saveId: string;
    generalId: string;
    eventType: string;
    summary: string;
    keywords?: string[];
    playerAction?: string;
    generalReaction?: string;
    isMilestone?: boolean;
}

export interface NpcGeneralMemory {
    saveId: string;
    generalId: string;
    schemaVersion: number;
    shortTerm: string;
    longTerm: string;
    playerProfile: string;
    promises: string;
    lastCompressedIdx: number;
    uncompressedCount: number;
    lastCompressedAt?: string | null;
}

export interface NpcGeneralMemoryContext {
    saveId: string;
    shortTerm?: string;
    longTerm?: string;
    playerProfile?: string;
    promises?: string;
}

// 修改現有介面（加入兩個可選欄位）
export interface NpcDialogueRequest {
    // ...（既有欄位不變）
    saveId?: string;                         // 新增：供 server 端 auto-fetch 記憶
    memoryContext?: NpcGeneralMemoryContext; // 新增：可選的 client-side override
}
```

---

## 5. 儲存佈局與路徑

### 新增目錄（執行時自動建立）

```
server/npc-brain/local/
    interaction-events/
        <saveId>__<generalId>.jsonl    # append-only 原始事件日誌
    general-memory/
        <saveId>__<generalId>.json     # 當前壓縮記憶 blob
```

命名用 `__`（雙底線）分隔，因為 `saveId` 與 `generalId` 本身含有 `-`（如 `save-001`、`zhang-fei`），雙底線在目視與 glob 上都清晰可辨。

### 為什麼是 flat JSONL，不是 SQLite

`SQLiteVecStubAdapter` 目前是 stub，`upsert()` / `query()` 均拋 `NotImplementedError`。為避免阻塞依賴，原始事件日誌採用與現有 `npc-dialogue-history.jsonl` 相同的 JSONL 模式：

- 無額外依賴
- Append 操作 O(1)
- 每個 `(saveId, generalId)` 獨立一份檔案，壓縮時只讀該檔案，無需全表掃描

日後若要遷移至 SQLite 或 PostgreSQL JSONB，只需替換 `interaction_memory.py` 的 I/O 函式，上層邏輯不動。

---
