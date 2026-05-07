# NPC Brain Memory System — Ops & Milestones（§9-§12）

> 這是 `npc-brain-武將互動記憶系統.md` 的「Ops & Milestones（§9-§12）」分片。完整索引見 `docs/tech/npc-brain-武將互動記憶系統.md`。

## 9. 環境變數

新增至 `server/npc-brain/.env`：

```dotenv
NPC_MEMORY_COMPRESS_INTERVAL=50        # 累積多少新事件後觸發背景壓縮
NPC_MEMORY_RECENT_WINDOW=15            # 壓縮後在 context 中保留的最近原始事件數
NPC_MEMORY_EVENTS_ROOT=local/interaction-events
NPC_MEMORY_STORE_ROOT=local/general-memory
NPC_MEMORY_COMPRESS_MODEL=gemini_flash # 壓縮專用 LLM provider
```

`CURRENT_MEMORY_SCHEMA_VERSION = 1` 定義為程式碼常數（`interaction_memory.py`），不做 env var，因為它是合約版本，應該跟著 code 走，不應被環境變數覆蓋。

---

## 10. 里程碑與 Checklist

### M1 — Schema & Models
**目標**：定義所有資料結構，建立後續所有里程碑的合約基礎。

新增：`server/npc-brain/app/interaction_memory.py`

- [ ] `InteractionEvent` Pydantic model（含所有欄位與預設值）
- [ ] `GeneralMemoryData` Pydantic model（含 `schemaVersion`、`lastCompressedIdx`、`uncompressedCount`）
- [ ] `GeneralMemoryContext` slim model（純文字段，供 DialogueRequest 使用）
- [ ] `CURRENT_MEMORY_SCHEMA_VERSION = 1` 常數
- [ ] `UPDATE_INTERVAL` / `RECENT_WINDOW` 常數（env-var 可覆蓋）
- [ ] `_key(save_id, general_id) -> str` 輔助函式（`f"{save_id}__{general_id}"`）
- [ ] `_events_path()` / `_memory_path()` 路徑建構函式（基於 env-var root）
- [ ] TypeScript：`NpcInteractionEventPayload`、`NpcGeneralMemory`、`NpcGeneralMemoryContext` 介面加入 `NpcDialogueService.ts`
- [ ] TypeScript：`NpcDialogueRequest` 加 `saveId?` 與 `memoryContext?` 欄位

**驗收**：`from app.interaction_memory import InteractionEvent, GeneralMemoryData` 無 import 錯誤；TypeScript compile 無報錯。

---

### M2 — Storage I/O Layer
**目標**：實作 JSONL append / read 與 JSON atomic write，確保基礎 I/O 正確。

在 `interaction_memory.py` 繼續實作：

- [ ] `append_interaction_event(event: InteractionEvent) -> None`（append mode，OSError 靜默 log）
- [ ] `load_interaction_events(save_id, general_id) -> list[InteractionEvent]`（逐行 parse，略過損毀行）
- [ ] `load_general_memory(save_id, general_id) -> GeneralMemoryData`（不存在時回傳空白 model，不建立檔案）
- [ ] `save_general_memory(memory: GeneralMemoryData) -> None`（atomic write：`.tmp` → `replace()`）
- [ ] `increment_uncompressed_count(save_id, general_id) -> GeneralMemoryData`（load → +1 → save → return）
- [ ] 目錄在首次寫入時自動建立（`mkdir(parents=True, exist_ok=True)`）
- [ ] 本地 round-trip 測試（`if __name__ == "__main__"` block）：append 一筆 event，load 後驗證內容相等

**驗收**：`python -c "from app.interaction_memory import *; print('ok')"` 通過；round-trip block 輸出 `ok`。

---

### M3 — New API Routes
**目標**：四個新端點上線，`/healthz` 含 memory 段。

修改：`server/npc-brain/app/main.py`

- [ ] `POST /v1/npc/interaction-events`：validate → assign eventId/createdAt → append → increment count → schedule background compression if delta >= UPDATE_INTERVAL → return `{"ok": true, "eventId": "..."}`
- [ ] `GET /v1/npc/general-memory`：load → return（不存在則回傳空白 model）
- [ ] `POST /v1/npc/general-memory`：save → return `{"ok": true}`
- [ ] `POST /v1/npc/memory/compress`：同步執行壓縮（此時 `memory_compressor.py` 可先回傳 stub 結果）→ return updated `GeneralMemoryData`
- [ ] `/healthz` 回應加入 `memory` 段（`eventsRoot`、`storeRoot`、`compressInterval`、`recentWindow`、`schemaVersion`）

**驗收**：
```bash
curl http://127.0.0.1:8765/healthz | python3 -m json.tool | grep -A 8 '"memory"'
curl -X POST http://127.0.0.1:8765/v1/npc/interaction-events \
  -H "Content-Type: application/json" \
  -d '{"saveId":"dev","generalId":"zhang-fei","eventType":"dialogue","summary":"test"}' 
# → {"ok": true, "eventId": "..."}
```

---

### M4 — Memory Injection into Dialogue
**目標**：`/v1/npc/dialogue` 支援 `saveId` 傳入並自動注入武將記憶到 prompt。

修改：`npc_dialogue_service.py`、`llm_dialogue_renderer.py`

- [ ] `DialogueRequest` 加 `saveId: str | None = None` 和 `memoryContext: GeneralMemoryContext | None = None`
- [ ] `build_dialogue()` 中：若 `saveId` 存在且 `memoryContext` 為 None，呼叫 `load_general_memory()` 並填充 `memoryContext`（四段全空則略過）
- [ ] `DialoguePromptPackage` 加 `memoryContext: dict | None = None`
- [ ] `GeminiDialogueProvider._build_prompt()`：當 `memoryContext` 非空且非全空字串時，注入 `playerGeneralMemory` block（位置：`personaCardSubset` 之後、`resolvedEvidence` 之前）
- [ ] `LocalLlamaDialogueProvider._build_local_system_prompt()`：同上，以系統提示附加方式注入
- [ ] 空值規則：四段全空時完全省略 `playerGeneralMemory` key

**驗收**：
```bash
# 先 seed 一份記憶
curl -X POST http://127.0.0.1:8765/v1/npc/general-memory \
  -H "Content-Type: application/json" \
  -d '{"saveId":"dev","generalId":"zhang-fei","schemaVersion":1,"shortTerm":"玩家剛問了長坂坡之事","longTerm":"","playerProfile":"","promises":"","lastCompressedIdx":0,"uncompressedCount":1}'

# 帶 saveId 呼叫 dialogue，以 NPC_LLM_DEBUG=1 確認 prompt 含 playerGeneralMemory
NPC_LLM_DEBUG=1 curl -X POST http://127.0.0.1:8765/v1/npc/dialogue \
  -H "Content-Type: application/json" \
  -d '{"generalId":"zhang-fei","saveId":"dev","locale":"zh-TW","speechContextMode":"life_chat","maxChars":90,"selectedKeywordKeys":[]}'
# server log 應出現 playerGeneralMemory block
```

---

### M5 — Safety Compression
**目標**：實作四段並行 LLM 壓縮 + 安全指針推進邏輯。

新增：`server/npc-brain/app/memory_compressor.py`

- [ ] `build_compress_short_term_prompt()` — 指令：從事件中摘要最近互動的氛圍與話題，100–200 字，第三人稱或武將視角均可
- [ ] `build_compress_long_term_prompt()` — 指令：只提取真正的里程碑事件（`isMilestone=true` 或 LLM 判斷），略過日常對話
- [ ] `build_compress_player_profile_prompt()` — 指令：從事件中推斷武將對玩家的認知，包含名字（若曾提及）、立場、行為模式
- [ ] `build_compress_promises_prompt()` — 指令：列出尚未兌現的承諾；若無，回傳空字串
- [ ] `async compress_all_sections(events, current_memory, persona_subset) -> tuple[str, str, str, str]` — `asyncio.gather` 四個 `gemini_flash` calls
- [ ] 指針推進邏輯：`compress_all_sections` 全成功後 → 寫回四段 + `lastCompressedIdx = uncompressedCount` + `lastCompressedAt` → `save_general_memory`；任一失敗 → `log_debug_event("memory.compress.failed")` → 不動指針
- [ ] `schedule_background_compression()` — 包 try/except，`asyncio.create_task()`
- [ ] `POST /v1/npc/memory/compress` 改為呼叫真正的 `compress_all_sections`（而非 M3 的 stub）

**驗收**：
```bash
# 先 seed 60 筆事件
# POST /v1/npc/memory/compress?force=true
# 確認 lastCompressedIdx = 60
curl "http://127.0.0.1:8765/v1/npc/general-memory?saveId=dev&generalId=zhang-fei" \
  | python3 -c "import sys,json; m=json.load(sys.stdin); print('idx:', m['lastCompressedIdx'], 'count:', m['uncompressedCount'])"

# 失敗模擬：monkeypatch 一個 section 拋出 Exception，確認 idx 不變
```

---

### M6 — Cocos Adapter
**目標**：Cocos 端完成事件回寫，對話後互動事件出現在 server JSONL。

新增：`assets/scripts/core/dialogue/NpcMemoryAdapter.ts`  
修改：`assets/scripts/core/services/NpcDialogueService.ts`、`assets/scripts/core/managers/ServiceLoader.ts`

- [ ] `NpcDialogueService.postInteractionEvent(payload: NpcInteractionEventPayload)` 方法（呼叫現有 `_requestJson('POST', ...)`）
- [ ] `NpcDialogueService.getGeneralMemory(saveId, generalId)` 方法
- [ ] `NpcMemoryAdapter`：訂閱 `services().event.on('npc.interaction.completed', ...)`，fire-and-forget 呼叫 `postInteractionEvent()`，錯誤只 log 不拋出
- [ ] `ServiceLoader` 初始化 `NpcMemoryAdapter`
- [ ] Dialogue 完成後（`fallbackUsed === false`）emit `npc.interaction.completed`，payload 含 `saveId`、`generalId`、`eventType`、`summary`（取 `response.text.slice(0, 180)`）、`keywords`（取 `response.usedKeywords.map(k => k.keywordKey)`）

**驗收**：在 Cocos Editor Preview 完成一次武將對話，至 `server/npc-brain/local/interaction-events/` 確認 JSONL 出現新事件。

---

## 11. Smoke Test 指令

### 現有 smoke（每個里程碑結束都應通過）

```bash
cd server/npc-brain
python -m app.http_smoke_test
python -m app.cocos_flow_smoke_test
```

### 新增 memory smoke（M3 完成後可建立）

```bash
# 以 deterministic provider 避免 LLM API key 需求
NPC_LLM_PROVIDER_ORDER=deterministic python -m app.memory_smoke_test
```

`memory_smoke_test.py` 應驗證：
1. `POST /v1/npc/interaction-events` → 200 + 有效 `eventId`
2. `GET /v1/npc/general-memory` round-trip（POST 後 GET 回相同資料）
3. `POST /v1/npc/dialogue` 帶 `saveId` → 200（M4 完成後加驗 prompt 含 memory block）
4. `/healthz` 含 `memory` 段

### 手動 curl 驗收序列

```bash
# 1. 確認 healthz memory 段
curl http://127.0.0.1:8765/healthz | python3 -m json.tool | grep -A 8 memory

# 2. 寫入一筆互動事件
curl -s -X POST http://127.0.0.1:8765/v1/npc/interaction-events \
  -H "Content-Type: application/json" \
  -d '{"saveId":"dev-save","generalId":"zhang-fei","eventType":"dialogue",
       "summary":"玩家詢問了長坂坡守橋之事","keywords":["changban-bridge"],"isMilestone":true}'

# 3. 讀取當前記憶（此時四段仍為空，但 uncompressedCount=1）
curl "http://127.0.0.1:8765/v1/npc/general-memory?saveId=dev-save&generalId=zhang-fei" \
  | python3 -m json.tool

# 4. 強制觸發壓縮（需 GOOGLE_API_KEY）
curl -s -X POST http://127.0.0.1:8765/v1/npc/memory/compress \
  -H "Content-Type: application/json" \
  -d '{"saveId":"dev-save","generalId":"zhang-fei","force":true}' | python3 -m json.tool

# 5. 確認指針推進
curl "http://127.0.0.1:8765/v1/npc/general-memory?saveId=dev-save&generalId=zhang-fei" \
  | python3 -c "import sys,json; m=json.load(sys.stdin); print('idx:', m['lastCompressedIdx'], '/ count:', m['uncompressedCount'])"

# 6. 帶記憶呼叫 dialogue（NPC_LLM_DEBUG=1 顯示 prompt）
NPC_LLM_DEBUG=1 curl -s -X POST http://127.0.0.1:8765/v1/npc/dialogue \
  -H "Content-Type: application/json" \
  -d '{"generalId":"zhang-fei","saveId":"dev-save","locale":"zh-TW",
       "speechContextMode":"life_chat","selectedKeywordKeys":[],"maxChars":90}'
```

---

## 12. 相關文件

- [`server/npc-brain/文件/對話服務與模型回退.md`](../../server/npc-brain/文件/對話服務與模型回退.md) — provider chain 與 fallback 規則
- [`server/npc-brain/文件/資料契約與 Cocos 串接.md`](../../server/npc-brain/文件/資料契約與%20Cocos%20串接.md) — 現有 Cocos-server 契約
- [`server/npc-brain/文件/向量檢索與資料入庫.md`](../../server/npc-brain/文件/向量檢索與資料入庫.md) — vector DB namespace 規劃（互動記憶未來可擴充至此）
- [`docs/tech/參考用npc-dialogue-narrative-runtime-plan.md`](參考用npc-dialogue-narrative-runtime-plan.md) — 總規劃書（含 Cocos runtime 部分）
