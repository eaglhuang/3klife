# [PROG-2-0109] 新手開場流程控制器：OpeningFlowController 與 OpeningFlowConfig（OPEN-01，純邏輯）

給：Codex Agent｜里程碑：M6（新手開場）｜WBS v3：OPEN-01，P1，工時 3.0，狀態「未開始」（無依賴）

## 為什麼做
新手開場需要依 phase 順序播放各幕，每幕有進出條件，且事件可回溯。目前沒有控制器，開場流程無法設定。本卡只做流程控制的純邏輯，不畫 UI、不接場景。

## 開工前（必做，先停下來判斷）
- 讀 `docs/tasks/prog-opening-flow-tasks.md`（PROG-1 系列，記載舊的開場任務）與 `docs/UI 規格書.md` 的新手開場章節。
- 搜尋 master 的 git log 與 `assets/scripts` 內是否已有 `OpeningFlow`、開場 phase 相關程式。**master 的 git log 必須看**，不能只看開著的 PR 與分支。
- 若已有等價的控制器，**停下來**回信到 `mailbox/to-claude/`，列出位置與差異，不要重做。

## 範圍（確認尚未存在後才做）
- 新增 `assets/scripts/core/systems/OpeningFlowController.ts` 與 `assets/scripts/core/config/OpeningFlowConfig.ts`：
  - `OpeningFlowConfig`：以 phase 陣列定義開場順序，每個 phase 含 id、進入條件、離開條件。
  - `OpeningFlowController`：`start()`、`advance(event)`、`current()`、`history()`。只依設定依序前進；條件不符不前進；每次前進寫入可回溯的事件紀錄。
- 測試 `tests/OpeningFlowController.test.ts`：依序前進；條件不符時停在原地；history 完整記錄；重新 start 會清空紀錄；設定缺少 phase 時回傳明確錯誤。
- 不接進場景、不畫 UI、不改存檔格式、不改 `generals.json` 與 spec JSON。

## 共同規則（每張都適用）
- 基底分支 `master`，工作分支 `codex/PROG-2-{號}-{slug}`，PR 目標 `master`。
- 只用本工單編號，不得自行另取編號。
- 開工前先 `git fetch origin`，搜尋遠端分支與開著的 PR，確認沒有人在做同一項或撞號；撞了就停下來回覆到 `mailbox/to-claude/`。
- 新模組不依賴 cc，不讀寫存檔，不發事件（只寫入紀錄陣列）；測試需在 `tests/run-cli.ts` 註冊。
- 不開 Cocos 編輯器；不手改 meta。
- 驗收：全套 headless 通過（`npx ts-node --project tsconfig.test.json tests/run-cli.ts`），`compute-gate --profile standard --agent-feedback` 通過，UTF-8 無 BOM，`git diff --check` 通過，新模組沒有 `cc` import 與 `any`。
- 規格與工單不一致時停下來回信，不自行決定；可逆的實作選擇照本工單與 PM 推薦做，並在 PR 說明列出。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明測試結果與暫定項目，然後解鎖。
