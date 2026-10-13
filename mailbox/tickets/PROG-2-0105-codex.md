# [PROG-2-0105] 退役分流：武→虎符／戰技教官，文→竹簡／智識教官，雙職能→全能教官（FATE-08）

給：Codex Agent｜里程碑：M4（退役與世代傳承）｜WBS v3：FATE-08，P0，工時 3.0，狀態「未開始」

## 為什麼做
武將退役時要依職能分流去向：武職→虎符或戰技教官，文職→竹簡或智識教官，雙職能→全能教官。目前退役只產出教官卡，沒有依職能分流的判定。

> 注意：`FATE-01` 的職能資料模型（Primary_Class／Sub_Class）與 `recommendFate`（`Unveiling.ts`）已存在，本卡只讀取它們。分流的細項名稱（竹簡、戰技教官等）以 WBS 工作包文字為準；規格原文與工單不同時，停下來回報。

## 範圍
- 新增 `assets/scripts/core/systems/RetirementRouting.ts`：
  - `routeRetirement(general)`：回傳 `{ destination, reason }`。destination 只能是 `tiger_tally`、`tactic_mentor`、`scroll_mentor`、`wisdom_mentor`、`all_round_mentor` 之一。
  - 規則：武職→武職目的地（虎符或戰技教官，依 WBS 規則取其一，並在 PR 說明選法）；文職→竹簡或智識教官；雙職能→全能教官。無法判定職能時回傳安全預設並標 `reason: 'UNKNOWN_CLASS'`，不拋例外。
  - 純函式，不改輸入。
- 測試 `tests/RetirementRouting.test.ts`：三種職能各一條；無法判定時回安全預設；同一輸入結果一致。
- 不改退役流程、不改 `GameSession.retireGeneral`、不改教官卡結構（那些另卡）。

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

