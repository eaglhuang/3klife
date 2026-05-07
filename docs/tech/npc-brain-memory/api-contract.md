# NPC Brain Memory System — API & Contract（§6-§8）

> 這是 `npc-brain-武將互動記憶系統.md` 的「API & Contract（§6-§8）」分片。完整索引見 `docs/tech/npc-brain-武將互動記憶系統.md`。

## 6. 新 API 端點

### `POST /v1/npc/interaction-events`

玩家-武將互動完成後，Cocos 呼叫此端點寫入事件。

**行為：**
1. 驗證 payload，server 端補 `eventId`（uuid4）與 `createdAt`（UTC ISO 8601）。
2. Append 至 `local/interaction-events/<saveId>__<generalId>.jsonl`。
3. 讀取對應 `GeneralMemoryData`，`uncompressedCount += 1`，寫回。
4. 計算 `delta = uncompressedCount - lastCompressedIdx`；若 `delta >= UPDATE_INTERVAL`，以 `asyncio.create_task()` 在背景排程壓縮。
5. 立即回傳 `{"ok": true, "eventId": "<uuid>"}`，不等壓縮完成。

**不等壓縮的原因**：dialogue 請求必須快速。若 Cocos 在每次對話後都呼叫此端點，回應必須即時。記憶壓縮是背景工作，允許失敗後重試。

### `GET /v1/npc/general-memory`

**Query params**：`saveId`, `generalId`

讀取當前壓縮記憶。若 `local/general-memory/` 下不存在對應檔案，回傳所有文字段為空字串的空 `GeneralMemoryData`（不建立檔案）。

### `POST /v1/npc/general-memory`

**Body**：完整 `GeneralMemoryData`

atomic write：先寫 `.tmp`，再 `Path.replace()` 覆蓋目標。回傳 `{"ok": true}`。

### `POST /v1/npc/memory/compress`

**Body**：`{"saveId": "...", "generalId": "...", "force": false}`

開發 / 偵錯用。同步執行四段壓縮，直接回傳更新後的 `GeneralMemoryData`。`force=true` 可跳過 `delta < UPDATE_INTERVAL` 的防衛檢查。

---

## 7. 記憶注入契約

### 7.1 Server 端擴充

**`npc_dialogue_service.py`**：`DialogueRequest` 加入：
```python
saveId: str | None = None
memoryContext: GeneralMemoryContext | None = None
```

其中 `GeneralMemoryContext` 是只含文字段的 slim model（不含 `schemaVersion` 等儲存元資料）：
```python
class GeneralMemoryContext(BaseModel):
    saveId: str
    shortTerm: str = ""
    longTerm: str = ""
    playerProfile: str = ""
    promises: str = ""
```

**`llm_dialogue_renderer.py`**：`DialoguePromptPackage` 加入：
```python
memoryContext: dict | None = None
```

### 7.2 兩種注入策略

**策略 A — Server-side auto-fetch（推薦正式環境）**

Cocos 只傳 `saveId`，server 在 `build_dialogue()` 中自動讀取 `local/general-memory/` 並填充 `memoryContext`。Cocos 側不需要任何額外邏輯。

**策略 B — Client-provided（適合開發 / override）**

Cocos 先呼叫 `GET /v1/npc/general-memory` 取得記憶，再手動填入 `memoryContext`。適合開發工具列需要強制指定記憶內容的場景。

兩種策略在 server 端相容：若 `memoryContext` 已存在於 request，跳過 auto-fetch。

### 7.3 Prompt 注入格式

在 `_build_prompt()`（Gemini）與 `_build_local_system_prompt()`（LocalLlama）中，當 `package.memoryContext` 非空且非全空字串時，加入以下 key：

```json
"playerGeneralMemory": {
  "instruction": "此為玩家與本武將的互動記憶壓縮摘要，據此維持對話連貫性，不得捏造摘要以外的事實。",
  "shortTerm": "...",
  "longTerm": "...",
  "playerProfile": "...",
  "promises": "..."
}
```

**空值略過規則**：若四個文字段全為空字串，完全省略 `playerGeneralMemory`，不注入空殼物件（避免佔用 token 卻無資訊增益）。

**位置**：放在 `personaCardSubset` 之後、`resolvedEvidence` 之前。人格奠定身份，記憶描述關係狀態，歷史根據補充遠期事實——三者按此層次疊加。

---

## 8. 安全壓縮機制

### 觸發條件

```python
UPDATE_INTERVAL = int(os.environ.get("NPC_MEMORY_COMPRESS_INTERVAL") or 50)
RECENT_WINDOW   = int(os.environ.get("NPC_MEMORY_RECENT_WINDOW") or 15)

delta = uncompressedCount - lastCompressedIdx
if delta >= UPDATE_INTERVAL:
    asyncio.create_task(schedule_background_compression(...))
```

### 壓縮流水線（`memory_compressor.py`）

```
讀取全部 InteractionEvent（saveId, generalId）
↓
四段並行 LLM calls（asyncio.gather）
    ├── compress_short_term(events, current_memory, persona_subset)
    ├── compress_long_term(events, current_memory, persona_subset)
    ├── compress_player_profile(events, current_memory, persona_subset)
    └── compress_promises(events, current_memory, persona_subset)
↓
全部成功？
    是 → 寫回四段 + 推進 lastCompressedIdx + 更新 lastCompressedAt → atomic write
    否 → log_debug_event("memory.compress.failed") → 不動指針、不寫回
```

壓縮使用 `gemini_flash`（非正式 fallback chain）。理由：壓縮任務是摘要生成，不是創意對話；Flash 足夠。若 Flash 不可用，靜默跳過此輪壓縮（原始事件仍安全），不降級至 history_cache 或 deterministic provider（這兩者沒有能力正確壓縮記憶）。

### 指針推進規則（核心安全保證）

> `lastCompressedIdx` 只有在四段全部成功、且檔案已 flush 至 disk 後，才移動到 `uncompressedCount`。

這條規則保證：無論壓縮任務在哪個步驟失敗（LLM 超時、JSON 解析錯誤、磁碟滿、進程崩潰），下一次觸發時都會從同一個 `lastCompressedIdx` 重新讀取事件，不會有任何事件被永遠遺漏。

`uncompressedCount` 記錄了「已收到但不一定已壓縮」的事件總數，可在 server 啟動時用來偵測是否有未完成的壓縮需要處理。

### `RECENT_WINDOW` 的用途

`RECENT_WINDOW`（預設 15）是指：在 dialogue prompt 注入時，除了四段壓縮記憶，也可附上最近 N 筆原始 `InteractionEvent` 的 `summary`，讓武將對「剛剛發生的事」有直接認知，而不只依賴可能剛剛才被壓縮進去的摘要。

具體實作可由 `NpcBrainRuntimeAdapter`（Cocos 端）或 server auto-fetch 邏輯決定是否附帶 recent events。

### Atomic Write

```python
tmp_path = target_path.with_suffix(".json.tmp")
tmp_path.write_text(memory.model_dump_json(indent=2), encoding="utf-8")
tmp_path.replace(target_path)  # Windows 上 pathlib.Path.replace() 等效於 atomic rename
```

---
