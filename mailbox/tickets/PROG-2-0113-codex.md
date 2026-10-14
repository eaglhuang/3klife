# [PROG-2-0113] 雙池定位與死亡傳承提示的純文案模型（GCH-10 的資料部分）

給：Codex Agent｜里程碑：M6（轉蛋）｜WBS v3：GCH-10，P1，工時 1.0，狀態「未開始」（依賴 GCH-08，已接線）

## 為什麼做
卡池頁與新手引導要明示「血統種子／培育深度」兩個池子的定位；名將詳情頁要提示「死亡後會留下英靈卡與虎符卡，且不會在抽卡結果掉落」。目前沒有統一的提示資料來源，畫面各自寫死。本卡只做「哪個池子顯示哪段提示」的純資料模型，不接畫面。

## 開工前
- `git fetch origin`，看 **master 的 git log**（不只看開著的 PR 與分支），確認 PROG-2-0113 沒有人做過；先搜尋 `assets/scripts` 內既有的卡池提示文字，若已有等價來源就停下回信。
- 工作分支 `codex/PROG-2-0113-gacha-pool-hints`，base `master`。

## 範圍
- 新增 `assets/scripts/core/config/GachaPoolHints.ts`：
  - `GACHA_POOL_HINTS`：兩個池子各一組定位文字（血統種子、培育深度）與一段死亡傳承提示（英靈卡、虎符卡，註明不在抽卡結果掉落）。文字欄位用 key，不寫死在 UI。
  - `getPoolHint(poolId)`：回傳該池的提示物件；未知 poolId 回傳 `null`，不拋例外。
  - `getDeathLegacyHint()`：回傳死亡傳承提示。
- 測試 `tests/GachaPoolHints.test.ts`：兩池各回傳正確 key；未知池回 `null`；死亡傳承提示包含「英靈卡」「虎符卡」與「不掉落」的標記欄位；資料物件不可被修改（冷凍或回傳副本）。
- 不改卡池頁、不改新手引導、不改抽卡機率與結果、不改 `generals.json`。文字內容若與規格原文不同，停下來回信。

## 共同規則（每張都適用）
- 只用本工單編號，不得自行另取編號。
- 開工前查撞號與遠端分支；撞了就停下來回覆到 `mailbox/to-claude/`。
- 新模組不依賴 cc，不讀寫存檔，不發事件；測試需在 `tests/run-cli.ts` 註冊（若主線已自動收集則依慣例）。
- 不開 Cocos 編輯器；不手改 meta；UTF-8 無 BOM；`git diff --check` 通過。
- 驗收：全套 headless 通過（`npx ts-node --project tsconfig.test.json tests/run-cli.ts`），`compute-gate --profile standard --agent-feedback` 通過。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明測試結果與暫定項目，然後解鎖。
