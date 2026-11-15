# 線上試玩版無頭實玩驗收（playtest-online）

`tools_node/playtest-online.js` 用 puppeteer-core 加本機 Chrome 無頭，每次以 `browser.createBrowserContext()` 開全新情境（等同新玩家，沒有舊的 localStorage／快取），依序實玩：

步驟順序為 1→2→2b→3→5→6→4（轉蛋放最後，因為轉蛋返回大廳的狀態本身是檢查項）。

1. 開機 → LoginScene → 開始遊戲 → LobbyScene，等「正在準備大廳」進度消失（記錄耗時）
2. 新玩家開場（依規格順序點按鈕；多頁「繼續」鈕可重複點）
3. 大廳走動小人：點擊，確認對話泡泡出現
4. 轉蛋：切換每個池子一次，切一輪後右欄節點不疊加
5. 人物介紹：第一位武將，逐分頁截圖；「命」分頁檢查血統樹底板 = 主體寬−720 × 主體高
6. 出征打一場戰鬥到結算，回大廳（卡住超過 120 秒記為失敗）

每步記錄耗時、截圖、期間的 console error 與 pageerror。pageerror 會讓該步失敗；console error 只記錄。

## 用法

```bash
# 線上試玩版（預設 https://eaglhuang.github.io/3klife-play/）
node tools_node/playtest-online.js

# 本機建置目錄（先 node tools_node/build-web.js）；自動起本機靜態伺服器
node tools_node/playtest-online.js --dir build/web-desktop

# 高視窗
node tools_node/playtest-online.js --viewport 1920x1475

# 指定輸出目錄、Chrome 路徑、單步卡住上限（毫秒）
node tools_node/playtest-online.js --out artifacts/playtest-online/run1 --browser "C:/Program Files/Google/Chrome/Application/chrome.exe" --stuck 120000
```

| 參數 | 預設 | 說明 |
| --- | --- | --- |
| `--url` | 線上試玩版 | 目標網址 |
| `--dir` | — | 本機建置目錄；給了就忽略 `--url` |
| `--out` | `artifacts/playtest-online/<時間戳>` | 截圖與 `report.json` 的輸出目錄（`artifacts/` 已被 git 忽略） |
| `--viewport` | `1920x1080` | 視窗尺寸 `WxH` |
| `--browser` | 自動偵測 | Chrome／Edge 路徑，也可用環境變數 `CHROME_PATH` |
| `--stuck` | `120000` | 單步卡住上限（毫秒） |
| `--login-settle` | `12000` | 進 LoginScene 後等多久才點開始（毫秒）；設 `1000` 可重現「點太快」的開機 pageerror |

puppeteer-core 從本 repo 的 `node_modules` 找；在 git worktree 內會自動改找主目錄的 `node_modules`，也可用環境變數 `PLAYTEST_NODE_MODULES` 指定。

## 輸出與結束碼

- `<out>/report.json`：每步的 `ok`、`durationMs`、`reason`、`detail`、`screenshot`、`console`、`pageErrors`，以及整體 `passed`。
- `<out>/NN-<步驟>.png`：每步結束時的截圖（人物分頁、轉蛋池子另有截圖）。
- 結束碼：`0` 全部通過；`1` 有步驟失敗；`2` 環境問題（找不到 puppeteer、Chrome 或建置目錄）。

## 注意

- 大廳選單用底欄 `BtnCat*` 加子選單文字（`BtnSub0..4` 同名，靠鈕上文字辨認：商店→轉蛋、武將→武將名冊、出征→戰場）；`lobby-menu-map` 步驟會把每個分類的子選單記進報告。
- 人物介紹分頁用鈕上文字首字（將／屬／命／技／寶／兵）辨認；血統樹底板以 `CharacterDs3MainBloodlineRoot`、`TabBloodlineContent` 為候選量尺寸。
- 節點名稱以程式為準（例如開場按鈕 `BtnIntroNext`、`BtnShowcaseNext`；大廳走動小人為 `crowd-<武將>`）。若遊戲改名，報告的「逾時」或「找不到…」會直接指出缺哪個名稱。
- 本工具不改遊戲程式；發現的問題只寫進報告。
