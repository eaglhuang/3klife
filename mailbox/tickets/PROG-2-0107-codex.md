# [PROG-2-0107] 結緣資格之和平血統（Breeding_Mode）：退役武將可用 Peace_Lineage 結緣（BRD-10 純邏輯）

給：Codex Agent｜里程碑：M4（結緣）｜WBS v3：BRD-10，P0，工時 2.0，狀態「未開始」（依賴 BRD-01，已驗收）

## 為什麼做
BRD-01 已有結緣資格檢查。BRD-10 要補的是「和平血統線」：退役、未卡片化的武將，可以用 Peace_Lineage 模式結緣；但一旦卡片化，同一人就不能再走這條線。目前 `BreedingSystem` 沒有這個分支。本卡只做資格判斷的純邏輯，不接流程。

## 範圍
- 先在 `docs` 找到和平血統與退役保種的規格原文（搜尋 `Peace_Lineage`、`和平血統`、`保種`）。找不到原文就以本工單與 WBS CSV 為準，並在 PR 說明寫明。
- 新增 `assets/scripts/core/systems/PeaceLineage.ts`：
  - `canBreedPeaceLineage(general)`：回傳 `{ allowed, reason }`。條件：武將已退役（`retired`）、未卡片化（`carded` 為 false）；卡片化後回傳 `allowed: false` 並附具體 reason（例如 `CARDED_NOT_ALLOWED`）。
  - 其他條件（年齡、精力、同性、生育上限等）沿用 BRD-01 既有的檢查函式，只讀引用，不另寫一套。
- 測試 `tests/PeaceLineage.test.ts`：退役且未卡片化可結緣；卡片化後被拒且 reason 正確；未退役不可走此線；沿用 BRD-01 的條件仍然生效；不扣精力（純函式不改輸入）。
- 不接進結緣流程、不改 `BreedingSystem` 既有行為、不改存檔、不改 `generals.json`。

## 共同規則（每張都適用）
- 基底分支 `master`，工作分支 `codex/PROG-2-{號}-{slug}`，PR 目標 `master`。
- 只用本工單編號，不得自行另取編號。
- 開工前先 `git fetch origin`，搜尋遠端分支與開著的 PR，確認沒有人在做同一項或撞號；撞了就停下來回覆到 `mailbox/to-claude/`。
- 新模組不依賴 cc，不讀寫存檔，不發事件，不改輸入；測試需在 `tests/run-cli.ts` 註冊。
- 不開 Cocos 編輯器；不手改 meta。
- 驗收：全套 headless 通過（`npx ts-node --project tsconfig.test.json tests/run-cli.ts`），`compute-gate --profile standard --agent-feedback` 通過，UTF-8 無 BOM，`git diff --check` 通過，新模組沒有 `cc` import 與 `any`。
- 規格與工單不一致時停下來回信，不自行決定；可逆的實作選擇照本工單與 PM 推薦做，並在 PR 說明列出。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明測試結果與暫定項目，然後解鎖。
