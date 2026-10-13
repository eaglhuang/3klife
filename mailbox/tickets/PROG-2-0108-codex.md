# [PROG-2-0108] Web 實機驗收：培育→結緣→出征→存檔續玩（最新 master）

給：Codex Agent｜里程碑：整合驗收（M3–M5）｜性質：只有 Codex 能做（雲端無法建置 Cocos）

## 為什麼做
各模組已各自合併，但還沒有人用最新 master 的 Web 版把整段流程走一遍。這張要驗證玩家實際會走的路徑，並把截圖留在 PR 上。

## 開工前
- 先 `git fetch origin` 並看 **master 的 git log**（不只看開著的 PR 與分支），確認 PROG-2-0108 沒有被做過、目前 master 的 HEAD 是哪一個 commit，並在 PR 說明寫出該 commit。
- 工作分支 `codex/PROG-2-0108-web-acceptance`，base `master`。

## 步驟（Web 版，用 Playwright）
1. 用最新 master 建置 Web 版。
2. 依序走：**登入 → 培育（觸發受傷事件）→ 20 歲轉職 → 結緣（確認壽命扣減）→ 出征 → 存檔 → 重新載入後續玩**。
3. 每一步截圖，並在 PR 說明寫出：步驟、看到的結果、與規格不符的地方。
4. 任何一步失敗：停下來記錄失敗步驟與截圖，回信到 `mailbox/to-claude/`；不要自行修改遊戲程式來過關。
5. 可以用既有的 `tools_node/run-web-smoke.js` 作為起點，但它目前只支援 `lifecycle`、`lifecycle-full`、`three-generation`、`battle-settlement`，不足的部分請在本卡 PR 中說明，不要擴大範圍改其他模組。

## 範圍
- 只新增驗收腳本或測試資料與截圖，PR 目標 `master`。
- 不改遊戲核心邏輯、不改 spec JSON、不改 `generals.json`、不改存檔格式。
- 截圖附在 PR 上（不要只放本機路徑）。

## 共同規則（每張都適用）
- 只用本工單編號，不得自行另取編號。
- 開工前查撞號與遠端分支；撞了就停下來回覆。
- 不開 Cocos 編輯器；不手改 meta。
- 驗收：`compute-gate --profile standard --agent-feedback` 通過，UTF-8 無 BOM，`git diff --check` 通過。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明各步驟結果與截圖位置，然後解鎖。
