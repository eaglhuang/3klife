# NPC Brain Memory System — Overview（§1-§3）

> 這是 `npc-brain-武將互動記憶系統.md` 的「Overview（§1-§3）」分片。完整索引見 `docs/tech/npc-brain-武將互動記憶系統.md`。

<!-- doc_id: doc_tech_0080 -->
# 三國大腦中台：武將互動記憶系統

> 狀態：Draft | 建立：2026-05-07  
> 定位：工程學習參考文件 — 記錄設計決策的推導過程，供未來任何接手此系統的工程師獨立理解與實作。

---

## 1. 目的

三國大腦中台目前以 `local/npc-dialogue-history.jsonl` 儲存每次成功生成的台詞。這個快取的作用是「下次遇到相似 keyword + context 時，直接複用先前品質合格的輸出」。它解決的是生成效率問題。

**它不能回答的問題：**

- 這名玩家上次跟張飛說了什麼？（沒有玩家身份）
- 張飛知道玩家叫什麼名字嗎？（沒有玩家畫像）
- 張飛之前答應過玩家什麼？（沒有承諾記錄）
- 玩家在這個存檔裡已經歷了哪些里程碑？（沒有存檔區隔）

這份文件描述如何為每一對 `(saveId, generalId)` 建立一個小型、壓縮過、可注入 dialogue prompt 的**結構化互動記憶**，讓武將能夠對話時展現出對玩家的「記憶」。

---

## 2. 現有架構盤點

### 2.1 npc-brain 已有

| 組件 | 路徑 | 狀態 |
|------|------|------|
| Dialogue API | `app/main.py` `/v1/npc/dialogue` | ✅ 完整 |
| DialogueRequest schema | `app/npc_dialogue_service.py` | ✅ 完整，需擴充 |
| DialoguePromptPackage | `app/llm_dialogue_renderer.py` | ✅ 完整，需擴充 |
| Provider chain (Gemini/LocalLlama/fallback) | `app/llm_dialogue_renderer.py` | ✅ 完整 |
| History cache JSONL | `local/npc-dialogue-history.jsonl` | ✅ 回收快取（非記憶） |
| Pinecone / Qdrant vector store | `app/vector_store.py` | ✅ 完整 |
| SQLiteVecStubAdapter | `app/vector_store.py` | ❌ Stub，NotImplementedError |
| 互動事件 ingest API | — | ❌ 不存在 |
| 武將記憶 read/write API | — | ❌ 不存在 |

### 2.2 Cocos 端已有

| 組件 | 路徑 |
|------|------|
| `NpcDialogueService` (requestDialogue / getKeywordOptions) | `assets/scripts/core/services/NpcDialogueService.ts` |
| `ServiceLoader` (`services().npcDialogue`) | `assets/scripts/core/managers/ServiceLoader.ts` |
| `EventSystem` (`on / emit / onBind`) | `assets/scripts/core/systems/EventSystem.ts` |
| `UCUFLogger` | `assets/scripts/core/utils/UCUFLogger.ts` |

---

## 3. 設計原則：為什麼是四段結構

### Token 預算是起點

現有 Gemini provider 的 dialogue prompt 已包含：
- `personaCardSubset`（人格描述）
- `resolvedEvidence`（歷史根據）
- `selectedKeywords`（本次關鍵字）
- `speechContextDirective`（語境指令）

在不擠壓這些欄位的前提下，記憶注入的可用 token 約 50–120。這個約束直接決定了記憶格式：**必須是壓縮過的文字，不是原始對話記錄**。

### 四段各有不同的更新邏輯

| 段落 | 目標 token | 更新語意 | 遺忘邏輯 |
|------|-----------|---------|---------|
| `shortTerm` | 30–50 | 最近幾次互動的氛圍與話題 | 每次壓縮都完整重寫 |
| `longTerm` | 30–60 | 只保留里程碑事件 | 平凡對話不入列 |
| `playerProfile` | 20–40 | 武將對玩家的認知（名字、喜好、立場） | 累積更新，矛盾則覆蓋 |
| `promises` | 10–30 | 尚未兌現的承諾 | 兌現後清除 |

將這四段合併成一個 LLM call 的風險是：`shortTerm`（重視最近）與 `longTerm`（重視里程碑）的指令語意相反，單一 call 容易互相干擾。分四個並行 call 可以讓每段有獨立、明確的壓縮指令。

---
