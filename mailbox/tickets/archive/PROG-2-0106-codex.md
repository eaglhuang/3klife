> **作廢（2026-10-14）**：NUR-12 子嗣揭露已由養成討論串開成 PR #138。本卡重複，請勿執行；若已開工，請立即停下並回信。

# [PROG-2-0106] 子嗣資訊分層揭露：Revelation_Level 純邏輯（NUR-12 的模型部分）

給：Codex Agent｜里程碑：M3（培育）｜WBS v3：NUR-12，P0，工時 3.0，狀態「純邏輯」（依賴 NUR-01，已接線）

## 為什麼做
培育完成後，子嗣的資訊要依揭露等級（Revelation_Level 0~3）逐步顯示：0 只有剪影、1 顯示傾向、2 顯示區間、3 顯示精確值。目前沒有這層純邏輯，UI 無從判斷該顯示什麼。本卡只做「等級 → 顯示內容」的純函式，不畫 UI。

## 範圍
- 先在 `docs` 找到揭露等級的規格原文（搜尋 `Revelation`、`揭露`、`剪影`）。找不到原文就以本工單與 WBS CSV 為準，並在 PR 說明寫明。
- 新增 `assets/scripts/core/systems/RevelationView.ts`：
  - `getRevelationLevel(progress)`：回傳 0~3 的等級（progress 的定義先看 `DiscoveryProgress` 相關既有程式，只讀引用，不改）。
  - `buildRevelationView(stat, level)`：回傳 `{ level, display }`。level 0 為剪影文字；1 為傾向（高/中/低）；2 為區間（例如 `60~70`）；3 為精確值。
- 測試 `tests/RevelationView.test.ts`：四個等級各一組輸出；邊界值（區間端點、等級上下界）；level 超出範圍時夾回 0 或 3。
- 不接進培育流程、不改存檔格式、不改 `NurtureService`、不改 `generals.json` 與 spec JSON。

## 共同規則（每張都適用）
- 基底分支 `master`，工作分支 `codex/PROG-2-{號}-{slug}`，PR 目標 `master`。
- 只用本工單編號，不得自行另取編號。
- 開工前先 `git fetch origin`，搜尋遠端分支與開著的 PR，確認沒有人在做同一項或撞號；撞了就停下來回覆到 `mailbox/to-claude/`。
- 新模組不依賴 cc，不讀寫存檔，不發事件，不改輸入；測試需在 `tests/run-cli.ts` 註冊。
- 不開 Cocos 編輯器；不手改 meta。
- 驗收：全套 headless 通過（`npx ts-node --project tsconfig.test.json tests/run-cli.ts`），`compute-gate --profile standard --agent-feedback` 通過，UTF-8 無 BOM，`git diff --check` 通過，新模組沒有 `cc` import 與 `any`。
- 規格與工單不一致時停下來回信，不自行決定；可逆的實作選擇照本工單與 PM 推薦做，並在 PR 說明列出。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明測試結果與暫定項目，然後解鎖。
