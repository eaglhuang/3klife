# PROG-2-0131 教官卡詳情實機驗收：未通過

- 驗證基準：origin/master 4f07b2c6965c1b44fbc711c2d82ef5a8111cfccc；實際使用既有獨立 build/web-hud-0137（0137 版面修復工作樹）。不是乾淨 master 的整體驗收；教官詳情 Controller、MentorCardTabs 與 mentor-card-detail-main.json 與 master 無差異。
- 操作：從無存檔登入，依序點擊序章、宿命抽選與教學。按卡片明示允許，僅用 openMentorCardDetail 除錯入口提供 ★2、六列效果／事件／小插曲的測試卡；不修改存檔、子嗣或培育資料。頁籤與關閉使用實際滑鼠點擊。
- 步驟 1：面板已掛載且預設隱藏，通過。
- 步驟 2：預設「▸ 支援效果」，三個頁籤存在，通過。
- **步驟 3 不符**：切到培育事件，組 4／5／6 雖顯示「需達 ★3／4／5 才可發動」，同列 RowLabel3／4／5 仍 active 且顯示事件名稱。正式卡要求未達星等的列只顯示鎖頭文字。
- 依卡片停止後續正式驗收。步驟 4 文字不超框與步驟 6 真實培育入口尚未驗收；不把局部操作成功當整卡通過。
- 瀏覽器／引擎錯誤 0；acceptance-review.json 與 events-crop.png 保存失敗證據。

## 腳本與判讀校正

第一輪 harness 使用不相容的 page.waitForTimeout，失敗輸出保留於 artifacts/0131-harness-first-run，已修為一般 Promise 等待後重跑。這是驗收腳本錯誤，不是遊戲錯誤。

重跑的初版檢查只確認鎖頭存在，漏查事件名稱仍可見，因此 mentor-observation.json 的 steps1to5Passed:true 不是有效驗收結論。逐條核對卡片後，以 review-observation.js 對原始觀察追加內容可見性檢查，確實回傳失敗；acceptance-review.json 為修正後的正式判讀。沒有竄改原始觀察。mentor-checks.js 已補上同一斷言，未再執行後續遊戲操作。

畫面先裁出面板，以 125px 檢視不足以辨識列文字，再升至 250px：可見未解鎖列同時保留名稱及右側鎖頭文字。

## Handoff Summary

修改檔案：只有 0131 協作卡與 artifacts/PROG-2-0131 驗收資料；沒有修改遊戲程式或 UI 規格。
決策紀錄：依正式卡第 3 步拒絕通過，後續修復另卡處理。
Blocker：未達星等事件列仍顯示內容。
Post-flight：文字編碼 PASS；沒有遊戲程式修改，未重跑整套遊戲測試／UI static。
下一步：另立修復卡修正鎖定列的內容顯示，再重跑 0131，最後完成真實培育入口的有／無教官情境。
