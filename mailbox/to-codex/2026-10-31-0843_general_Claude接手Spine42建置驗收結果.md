# Claude 接手 Spine 4.2 執行時驗收結果（獨立建置路線）

- 寄件方：Claude
- 收件方：Codex
- 工單：general
- 日期：2026-10-31 08:43

使用者告知 Codex 額度用完，以下 Spine 4.2 執行時驗收由 Claude 接手完成。你恢復額度後請先讀本信，不必重做。

## 一、為何編輯器預覽一直不對（根因）

- Creator 3.8.8 安裝目錄下的共用快取 `.cache/dev/preview/import-map.json` 與 `.cache/dev/editor/import-map.json`，會把 `spine-version.js`／`spine-instantiate.js` 指到 `-3.8.js` 或 `-4.2.js`。
- 哪個專案的 Creator（含無介面 CLI 建置）最後啟動，就由它改寫這兩行。
- 主專案 `C:\Users\User\3KLife` 的 `settings/v2/packages/engine.json` 沒選 spine-4.2，所以預設 3.8；獨立工作樹選了 4.2。
- 結論：同一套安裝上的兩個 Creator 無法同時預覽不同的 Spine 版本。

## 二、繞法：CLI 網頁建置

- 指令：`CocosCreator.exe --project <獨立工作樹> --build "configPath=..."`，退出碼 36 代表成功，耗時 2 分 45 秒。
- 建置時引擎以 `spine-4.2` 功能編譯到 `%TEMP%\CocosCreator\3.8.8\builder\engine\<hash>`，不經過共用預覽快取。
- 產物在 `C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\temp\claude-zy-build\web-desktop\`（temp 目錄，不進 git）。

**需要知會的副作用：** CLI 建置在 08:25 改寫了共用 import-map 為 4.2。我已在 08:28 從事前備份還原，並用 `cmp` 確認逐位元組一致（08:43 再確認一次仍一致）。這段約 3 分鐘內，主編輯器（另一位 Claude 做 UI 用）若剛好重開預覽，可能載到 4.2 別名。主編輯器全程沒有被關閉或重啟。

## 三、驗收數據（瀏覽器實測）

- 素材：v5r PMA 版 `zhaoyun_v5r_512_pma.{json,atlas,png}`。SHA 不變：PNG `31dffbde…`、atlas `7271698074eb…`、JSON `abe8dea9…`。
- 建置載入自己的 Spine 執行檔（`spine.wasm-*.js`、`spine-*.wasm`）。
- 骨架資料版本 4.2.00：29 根骨、24 個槽、21/21 個附件可見，動畫 idle／walk／guard／thrust 四支。
- PMA 為 true，1 次繪製呼叫，180 個三角形。
- 全身：四支動畫都完整，沒有斷肢。
- 臉部：沒有亮條。臉頰縱向亮度跳動 ≤10，唯一的凹陷是畫出來的嘴線。
- 180 px 高（實測正好 180 px）：乾淨，邊緣沒有閃點；腳和靴子也乾淨。

## 四、延遲 IK 的發現（需要裁定）

guard 動畫自己帶有 arm_b 的 IK 時間軸，所以程式端把 mix 設成 0 會被動畫蓋掉。實測：

| 階段 | arm_b mix | 手到握點距離 |
|---|---|---|
| walk 穩定 | 0 | 706.3 |
| 交叉淡入中段（0.13 秒） | 0.533 | 156.2 |
| 交叉淡入結束（0.25 秒） | 1 | 0.0 |
| 漸入後保持 | 1 | 0.0 |

手臂每格最大轉角 14.3°，沒有大翻轉。

結論：以目前資料，「程式驅動延遲 IK」不成立；動畫本身已在交叉淡入期間內插 IK。

- (a) 接受動畫驅動 IK（我建議這個，畫面看起來沒問題）。
- (b) 把 guard 的 IK 關鍵格移掉，改由程式驅動。

此事已交使用者裁定，裁定前請勿改 guard 資料。

## 五、尚未完成

- 場景 `ZhaoYunV5rPmaSpine42Runtime20261030.scene` 沒有 RenderRoot2D／Canvas。我只在執行時臨時補上，沒改場景檔；正式使用前要補。
- ASTC：PNG 的 meta 沒設壓縮預設，所以建置沒產生 ASTC，壓縮後的實際大小還沒量。
- 編輯器冷重載、手機實機測試都還沒做。

本信未宣稱可量產或已能播放。
