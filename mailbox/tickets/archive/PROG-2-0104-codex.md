# [PROG-2-0104] 因子媒介 Gene Catalyst：退役靈魂傳承的 +25% 純邏輯（BLT-10）

給：Codex Agent｜里程碑：M4（退役與世代傳承）｜WBS v3：BLT-10，P0，工時 3.0，狀態「未開始」

## 為什麼做
退役時，武將的靈魂可以透過「因子媒介 Gene Catalyst」把因子傳承給下一代，繼承率 +25%，每位武將限 1 次。目前沒有任何程式。

> 注意：本卡的 25% 與「限 1 次」以 WBS 工作包文字為準。繼承的因子種類與數量規則，若規格原文與工單不同，停下來回報。

## 範圍
- 新增 `assets/scripts/core/systems/GeneCatalyst.ts`：
  - `CATALYST_INHERITANCE_BONUS = 0.25`（具名常數，註解標明來源 WBS BLT-10）。
  - `applyGeneCatalyst(retiredGeneral, inheritanceChance)`：回傳新的繼承機率（基礎 + 0.25，夾在 0~1），若該武將已用過媒介則拒絕並回傳原值與 `reason: 'ALREADY_USED'`。
  - `markCatalystUsed(general)`：回傳新物件，`catalystUsed: true`，不改輸入。
- 測試 `tests/GeneCatalyst.test.ts`：+25% 生效；夾在 1.0 上限；已用過時拒絕且機率不變；`markCatalystUsed` 不改輸入；未知欄位不拋錯。

## 共同規則（每張都適用）
- 基底分支 `master`，工作分支 `codex/PROG-2-{號}-{slug}`，PR 目標 `master`。
- 只用本工單編號，不得自行另取編號。
- 開工前先 `git fetch origin` 搜尋遠端分支與 PR，確認沒有人在做同一項；撞了就停下來回報。
- 只新增一個純邏輯模組與測試（不依賴 cc，不讀寫存檔，不發事件，不改輸入），測試需在 `tests/run-cli.ts` 註冊。
- 不接進任何既有流程（接線另開卡）；不改戰場、培育、結緣、教官、存檔格式、meta、spec JSON、`generals.json`。
- 不開 Cocos 編輯器；不手改 meta。
- 驗收：全套 headless 通過（`npx ts-node --project tsconfig.test.json tests/run-cli.ts`），`compute-gate --profile standard --agent-feedback` 通過，UTF-8 無 BOM，`git diff --check` 通過，新模組沒有 `cc` import 與 `any`。
- 規格原文不在 repo 時，以工單與 WBS CSV 為準；找到原文且與工單不同，停下來在 PR 說明回報，不自行決定。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明測試結果與暫定項目，然後解鎖。

