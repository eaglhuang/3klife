# LoongBones 免費方案匯出探針（R174 第 1 輪）

- 網頁版本：LoongBones 1.3.1
- 測試專案：現有空白 `newLoongbones` 工作區；載入內建 `Mesh Example`（Ubbie，24 FPS，含 `stand` 動作與 `Ubbie_tex` 資源）
- 匯出格式：DragonBones JSON + texture atlas
- 匯出資料版本選項：僅 `5.5`、`6.0`，沒有 `5.6.300`
- 已勾選 Data、Texture 後按 Export，介面回覆：`Only VIP users can use this feature. Please upgrade to VIP first.`
- 下載目錄沒有產生輸出檔，因此沒有 LoongBones 原生資料可供 Cocos Creator 3.8.8 匯入；不能宣稱 exporter 或 mesh/換裝已驗證。
- 匯入的內建範例已 Undo，工作區回到原本空白 armature1；沒有保存或發布範例。

## 判定

此帳號的免費方案不能完成正式 DragonBones JSON/texture 匯出，且可選版本不含指定的 5.6.300。LoongBones 免費線本輪 `blocked-by-VIP-export`，不建議購買會員作為低成本管線的前置；若未來取得授權，可用第 2 輪再做一組真實趙雲素材端到端驗收。目前 Cocos DragonBones 5.6.300 proxy 只證明 runtime，不能替代 LoongBones exporter 證據。
