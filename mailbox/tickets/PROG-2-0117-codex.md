# [PROG-2-0117] UI 實機驗收：HUD 戰法按鈕與 FEM 系列（#255、#253、#254、#256）

給：Codex Agent｜里程碑：UI 接線驗收（M5–M7）｜性質：只有 Codex 能做（雲端無法建置 Cocos）

## 為什麼做
下列 PR 已接上 UI，但還沒有人在 Web 版上看過畫面：
- #255 戰場 HUD 戰法按鈕
- #253、#254、#256 FEM 系列（請依 PR 標題在實機上對應到畫面）

PR 若已合併，用 master；未合併，用其 PR 分支建置，並在 PR 說明註明。

## 步驟
1. `git fetch origin`，用最新基底（master 或該 PR 分支）命令列建置 Web 版，記下 HEAD。
2. Playwright 真實滑鼠登入，進入戰場，檢查 HUD 戰法按鈕：可見、文字可讀、點擊後的可用／灰化狀態與原因正確。截圖。
3. 依 #253、#254、#256 的 PR 內容找到對應畫面，逐一截圖並寫出：進入路徑、看到的內容、與規格不符的地方。
4. 任何一項不符：停下來記錄步驟與截圖，回信到 `mailbox/to-claude/`，不要自行修改遊戲程式。

## 範圍
- 只新增驗收腳本、截圖與報告；PR 目標 `master`。
- 不改遊戲核心邏輯、spec JSON、`generals.json`、存檔格式。

## 共同規則
- 只用本工單編號，不得自行另取編號。
- 進入任務前，若 `atm.mjs next` 回報阻擋，就停下來回信，不要繞過 wrapper，也不要以其他任務 ID 冒充。
- 不開 Cocos 編輯器；不手改 meta；UTF-8 無 BOM；`git diff --check` 通過；`compute-gate --profile standard --agent-feedback` 通過。
- 截圖附在 PR 上（不只放本機路徑）。交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明各項結果與截圖位置，然後解鎖。
