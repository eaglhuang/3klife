# 劉備回憶意圖劇場

這是一個資料驅動的互動小遊戲原型。  
頁面會優先讀取 `npc-brain` API 回傳的真實資料：

- `persona`
- `relationshipEdges`
- `evidenceCards`
- `activitySeeds`
- `itemRelations`（目前若 runtime 尚未輸出，會先是空陣列）

如果 API 沒有啟動，頁面會自動退回示範資料，不會整個壞掉。

## 目前玩法

- 先選一個觸發角度：`眾生 / 情義 / 戰場 / 宿敵 / 恩義 / 日常 / 情感`
- 再選互動對象
- 同一個劉備，因為對象不同，會出現不同的：
  - 回憶描述
  - 情緒轉折
  - 對白
  - 下一步想做的事
- 女性角色會特別影響「情感 / 家室 / 去留」這條敘事線
- 自動上演改成慢節奏，而且每一幕會淡入，不會一下跳完

## 啟動方式

先開 `npc-brain` API：

```powershell
Set-Location C:\Users\User\3KLife\server\npc-brain
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

再開靜態頁面：

```powershell
Set-Location C:\Users\User\3KLife
python -m http.server 8787 --bind 127.0.0.1
```

最後打開：

```text
http://127.0.0.1:8787/examples/liu-bei-memory-intent-game/index.html
```

如果要指定別的 API base 或別的人物，可以加 query string：

```text
http://127.0.0.1:8787/examples/liu-bei-memory-intent-game/index.html?generalId=liu-bei&apiBase=http://127.0.0.1:8000
```

## 插圖與台詞能力

- 已接上 `POST /v1/npc/scene-illustration`，右側會直接出圖。
- 同一個 `prompt + model + aspectRatio + imageSize` 會命中快取，不重複生成。
- 已接上 `POST /v1/npc/dialogue`，台詞會優先由真實 persona + evidence 生成。
- 若 LLM 不可用，台詞才會退回模板 fallback（頁面會顯示來源）。

## 舊 8000 程序清理

如果你懷疑 `8000` 是舊版背景程序，可先查 PID 再刪：

```powershell
netstat -ano | Select-String ":8000"
Stop-Process -Id <PID> -Force
```

再重啟新版：

```powershell
cmd /c start "" /b C:\Users\User\3KLife\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir C:\Users\User\3KLife\server\npc-brain
```

## 設計重點

- 不直接把 ETL/RAG 原始檔案塞進頁面
- 由 `npc-brain` 在 API 層先整理成 narrative-friendly payload
- 前端只負責：
  - 選角度
  - 選對象
  - 根據真資料把人物演活

這樣後面如果你要把劉備換成關羽、孫權、呂布，甚至擴成全武將，前端不用重寫，只要後端 payload 結構維持一致就能沿用。
