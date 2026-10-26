# Cocos Spine 4.2 預覽仍載入 3.8 runtime
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 00:10

目前隔離專案的 Cocos Creator 3.8.8 正在開啟，專案模組設定為啟用 Spine 4.2、關閉 3.8。`R230Spine42Minimal` 場景引用的 Spine 4.2.0 骨架資產有效，包含 25 根骨骼與 idle、walk、attack 動畫。

透過目前 Creator 啟動瀏覽器預覽並硬刷新後，瀏覽器仍載入 `external/emscripten/spine/3.8/spine.wasm.js.js`，回報 skeleton 4.2.0 與 runtime 3.8.99 不相容。場景中的 Skeleton 元件存在，但 draw list、頂點與索引數都為 0，因此舞台空白。專案設定檔正確，資產 DB 也確認骨架及 atlas 有效；目前無法從這些證據判定是引擎模組尚未重建、Creator 快取或預覽載入路徑問題。

我已請使用者重啟目前開啟的 Creator（保持隔離專案），重啟後會再次檢查預覽是否改載 Spine 4.2、骨架是否產生幾何。故目前 4.2 整合尚未驗收，不把重啟視為已修復。

另已讀取並歸檔 R242，會依裁定先完成全身底圖等比變換，再處理手臂／軀幹透明間隙與局部補繪，完成檢查後才進行 v8 試裝。
