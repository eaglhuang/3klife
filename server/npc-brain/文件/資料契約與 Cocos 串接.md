<!-- doc_id: doc_server_service_0007 -->
# 資料契約與 Cocos 串接

> 說明 npc-brain runtime 對外 DTO、來源 artifact、以及 Cocos 端應如何串接 keyword options 與 dialogue 測試流程。

## 前端接入時最重要的原則

1. **前端只負責選擇，不負責推理**：UI 選武將、context、keywords；evidence 與 provider 決策交給 server。
2. **保留 debug 欄位**：`providerTrace`、`qualityWarnings`、`repairUsed` 對開發期很重要，不要在前端提早丟掉。
3. **不要把 runtime 決策寫死在 Cocos**：武將最終決策未來會依賴世界事件、玩家行為與互動歷史。
4. **互動結果要能回寫**：玩家和武將的互動、任務與聲望變化，最終都應回到 server-side 真相層。

## 來源 artifact

service 預設讀取：

- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/context-options.response.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/keyword-options.response.json`

若要更新這些產物，先重跑 pipeline：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_api_readiness_index.py --general-id zhang-fei --overwrite
```

## 主要 API

- `GET /v1/npc/context-options`
- `GET /v1/npc/keyword-options`
- `POST /v1/npc/dialogue`

## 關鍵 request 欄位

```json
{
  "generalId": "zhang-fei",
  "contextKey": "changban-bridge",
  "selectedKeywordKeys": ["cao-cao", "serpent-spear"],
  "toneMode": "in-character",
  "locale": "zh-TW",
  "speechContextMode": "life_chat",
  "llmModelPreset": "fallback_chain",
  "maxChars": 90
}
```

## 關鍵 response 欄位

最值得前端保留 / 顯示的欄位：

- `text`
- `usedKeywords`
- `rejectedKeywordKeys`
- `evidenceRefs`
- `provider`
- `model`
- `providerTrace`
- `qualityWarnings`
- `repairUsed`

## Cocos dev test flow

建議流程：

1. 玩家點選武將
2. 先呼叫：

```text
GET /v1/npc/keyword-options?generalId=zhang-fei&categories=person,item,event&limitPerCategory=8
```

3. 下拉顯示 `label`，送出時用 `keywordKey`
4. 按「對話測試」時呼叫：

```text
POST /v1/npc/dialogue
```

## 前端整合建議

### 1. 不要把 fetch 分散在 UI component

建議集中用 `NpcDialogueService` 包 API，避免每個按鈕各打各的。

### 2. keyword 選項與 context 應分開處理

- `contextKey` 代表情境
- `selectedKeywordKeys` 代表本次對話聚焦內容
- `speechContextMode` 代表發話角度

三者不要混成同一組 enum。

### 3. Debug panel 應至少顯示

- provider / model
- providerTrace
- repairUsed
- qualityWarnings
- evidenceRefs

### 4. 玩家行為與互動紀錄最終也會進決策層

未來若要做真正 NPC 行為決策，Cocos 端除了呼叫對話 API，也需要能把：

- 玩家指令
- 玩家任務選擇
- 與武將互動結果

送回 server-side 真相層，供後續 persona / world-state / memory decision engine 使用。

## 什麼不該由前端決定？

前端不應自行決定：

- 哪個 evidence 最重要
- 哪個 provider 該 fallback
- 角色 persona 該如何改寫

這些應由 server 端統一管理。

## 相關文件

- [README.md](../README.md)
- [對話服務與模型回退](./對話服務與模型回退.md)
- [開發啟動與煙霧測試](./開發啟動與煙霧測試.md)
- [三國人物資料推進流程](./三國人物資料推進流程.md)
