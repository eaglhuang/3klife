# PROG-2-0137 季節 HUD 入口修復

- 修復前：1920×1080 的英靈按鈕中心為 (192,-12)，實際點擊無法開圖鑑。
- 修復：既有卡片高度 232→504，保留按鈕 296×40、間距 8；英靈排在天下沙盤下方。沒有修改遊戲規則或 0132 驗收卡。
- 幾何回歸：原版失敗（OpenDomesticButton 超出卡片）；修正版全部子元件位於卡內、卡片位於畫布內、無垂直重疊，英靈順序正確。
- Cocos CLI Web 編譯完成：build/web-hud-0137。既有 cocos-mcp-server 缺 uuid 警告仍存在，編譯成功。
- 真實指標操作：登入→序章→宿命抽選→教學→英靈→關閉。英靈中心 (192,308)，關閉中心 (960,832)；圖鑑標題、數量、清單可見，關閉後關閉按鈕消失。瀏覽器錯誤 0。
- web-entry/report.json 沿用 0132 診斷格式，completed:false 表示未執行完整 0132；本次開關動作另由 spirit-entry-flow.js 的斷言確認。未注入英靈資料，未聲稱有資料、捲動、多語及手機驗收通過。
- HUD 裁切縮圖以 125px 檢視，入口已位於畫面內。

## 驗證與限制

- geometry-after.json：PASS；geometry-receipt.log：原生命令證據已登錄。
- validate-ui-specs --strict --check-content-contract：PASS（既有正式 skin 路徑提醒保留）。
- compute-gate ui-spec-contract：1/1 PASS。
- standard-isolated.log：9/9 PASS；暫存先前 ATM 修復與 0133 殘留後執行，隨即完整恢復並保留 stash。不把其他卡片工作混入本修復。
- snapshot.log：既有基準差異 +255/~19，沒有更新整份 baseline。結構快照不比較純數值，實際幾何另由上述回歸覆蓋。
- asset-db refresh：localhost:7456 未開啟；改用獨立 CLI 編譯與實際 Web 操作。
- manifest 生成器會把既有任務總數 321 改為 55，已還原生成物，沒有覆寫他卡狀態。
- 編碼檢查：PASS。編譯產生的未追蹤 meta 與五份字型 meta 異動已清除／還原。

## Handoff Summary

修改檔案：lobby-season-hud-main.json，三個版面數值；0137 任務卡與檢查證據。
決策紀錄：以固定容器高度容納既有按鈕，不縮小文字或變更其他面板。
Blocker：完整 0132 驗收尚待後續重跑；本修復的入口開關檢查通過。
Post-flight：validate PASS；snapshot 既有差異；encoding PASS。
下一步：審查修復 PR，合入後依正式 0132 範圍重新驗收。
