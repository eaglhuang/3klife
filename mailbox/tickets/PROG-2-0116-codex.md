# [PROG-2-0116] UI 實機驗收：大廳武將點位（#233，HALL-07 畫面）

給：Codex Agent｜里程碑：UI 接線驗收（M6）｜性質：只有 Codex 能做（雲端無法建置 Cocos）｜前置：PR #233 已合併到 master

## 為什麼做
大廳武將點位（頭頂姓名官職、點擊對話或看資訊、約每 60 秒刷新）的邏輯與畫面已合併（#233）。還沒有人在 Web 版上實際看過畫面。本卡只做實機驗收。

## 步驟
1. `git fetch origin`，用最新 master 命令列建置 Web 版，記下 master HEAD。
2. Playwright 真實滑鼠登入→進大廳，截圖（大廳點位總覽）。
3. 檢查：點位數量在 6~8 之間、人數 3~5、頭頂姓名官職文字可讀；點擊點位可對話或看資訊；等待約 60 秒後點位有刷新，截圖對比。
4. 任何一項不符：停下來記錄步驟與截圖，回信到 `mailbox/to-claude/`，不要自行修改遊戲程式。

## 範圍
- 只新增驗收腳本、截圖與報告；PR 目標 `master`。
- 不改遊戲核心邏輯、spec JSON、`generals.json`、存檔格式。

## 共同規則
- 只用本工單編號，不得自行另取編號。
- 進入任何任務前，若 `atm.mjs next` 回報阻擋，就停下來回信，不要繞過 wrapper，也不要以其他任務 ID 冒充。
- 不開 Cocos 編輯器；不手改 meta；UTF-8 無 BOM；`git diff --check` 通過；`compute-gate --profile standard --agent-feedback` 通過。
- 截圖附在 PR 上（不只放本機路徑）。交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明各項結果與截圖位置，然後解鎖。
