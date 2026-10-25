# 0136 引導時序修復驗證

- Cocos 3.8.8 Web 建置來源：ea87c6b52；基底 master 4f07b2c69。
- 真實滑鼠步驟：BtnStart、BtnIntroNext ×4、BtnDestinyRoll、BtnDestinyRow0、BtnNextTutorial ×3。
- 新帳號無預設存檔；僅讀節點座標與文字，未注入狀態。瀏覽器錯誤 0。
- 修復前於宿命抽選前已有 TutorialStep 1/3，修復後只有選將成功才出現引導。
- 引導行為測試 7 項通過，完整 headless 2445 passed、3 skipped；語法與 ESLint 2/2、編碼通過。
- LobbyScene 淨減 1 行，沒有透過壓縮程式碼規避既有大檔限制。
- 完整 0133（首戰勝敗、紅顏、舊檔、三比例）尚未通過；本診斷 completed=false，不能充當整卡驗收。
- manifest 重建已執行，但既有工具將無關任務總數由 321 改成 55 並回退他卡狀態；該生成差異已還原，未混入修復。
