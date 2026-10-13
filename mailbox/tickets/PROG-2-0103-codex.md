# [PROG-2-0103] 因子遮罩狀態：灰鎖與亮起的純邏輯（FUL-03 的模型部分）

給：Codex Agent｜里程碑：M2（因子解鎖）｜WBS v3：FUL-03，P0，工時 3.0，狀態「純邏輯」（依賴 FUL-02，已完成）

## 為什麼做
PROG-2-0100 已有 `getFactorVisibility`（可見／鎖定、requiredLevel）。遮罩的顯示狀態還沒有：未達等級要顯示『??? (Lv N 解鎖)』，解鎖後要有一次亮起動畫的觸發狀態。本卡只做「狀態與文字」的純邏輯，不畫 UI。

## 範圍
- 新增 `assets/scripts/core/systems/FactorMaskState.ts`：
  - `buildFactorMaskView(factor, playerDiscoveryLevel, previousView?)`：回傳 `{ label, locked, playAnimation }`。鎖定時 label 為 `??? (Lv N 解鎖)`，N 取 requiredLevel；解鎖時 label 為因子名稱，且只有「從鎖定變成解鎖」那一次 playAnimation 為 true。
  - 直接使用 PROG-2-0100 的 `isGeneFactorVisible` 與 `FACTOR_DISCOVERY_LEVEL`（只讀，不改）。
- 測試 `tests/FactorMaskState.test.ts`：鎖定文字含正確等級；解鎖後文字是因子名；亮起動畫只觸發一次；已解鎖重複呼叫不再觸發；缺名稱時用 id。
- 不做 UI（畫面元件與實機截圖另卡）。

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

