# [PROG-2-0115] 傭兵池正式入口接線（MERC-07 的 UI 入口部分）

給：Codex Agent｜里程碑：M6（傭兵）｜WBS v3：MERC-07，P1，狀態「未開始」｜性質：UI 接線（不改核心規則）

## 為什麼做
傭兵池的 presenter（PR #145）已合併，但 master 上玩家在轉蛋頁找不到入口：0110 實機驗收時，點遍 BtnPoolNext 8 次仍看不到傭兵池文字。也就是說目前只有畫面元件，沒有可操作的入口。本卡只補入口與導向，讓玩家能從正式 UI 進到傭兵池。

## 開工前
- `git fetch origin`，看 **master 的 git log**、開著的 PR 與遠端分支；確認 MERC-07 的入口沒有被別的 PR 做過（#208 是 0110 的驗收草稿，不是入口）。
- 先讀 `assets/scripts/ui/` 內傭兵池 presenter 與轉蛋頁（GameplayGacha）的入口結構，找出既有按鈕的寫法，照同樣寫法加入口。

## 範圍
- 在轉蛋頁（或工單驗收時 PM 指定的既有頁面）加一個「傭兵」入口按鈕，點擊後開啟既有傭兵池 presenter，並以現有資料來源顯示（沒有資料時顯示既有的空狀態，不要硬塞假資料）。
- 入口文字與位置照既有 UI 規格；找不到規格原文就用既有按鈕的風格，並在 PR 說明寫明。
- 不改傭兵的規則、不改存檔格式、不改 `generals.json`、不改 spec JSON。
- 不做其他 MERC 項目（結義、告別等另卡）。

## 驗收
- 命令列建置 Web 版，用 Playwright 真實滑鼠從登入走到傭兵池：截圖（入口所在位置、點擊後的傭兵池畫面）附在 PR 上。
- 若入口需要的資料在存檔中不存在，停下來回報，不要自行新增資料。

## 共同規則（每張都適用）
- 只用本工單編號，不得自行另取編號。
- 不開 Cocos 編輯器；不手改 meta；UTF-8 無 BOM；`git diff --check` 通過。
- 驗收：全套 headless 通過（`npx ts-node --project tsconfig.test.json tests/run-cli.ts`），`compute-gate --profile standard --agent-feedback` 通過。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明測試結果與截圖位置，然後解鎖。
