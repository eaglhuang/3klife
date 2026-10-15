# 0132：HUD 英靈入口超出畫面，停止驗收

- Web 建置來源 ea87c6b52，master 基底 4f07b2c6965c1b44fbc711c2d82ef5a8111cfccc；本輪只新增驗收證據，未改遊戲程式或版面。
- 新隔離帳號以實際滑鼠走完開場、轉蛋選將與三段引導，沒有注入英靈卡、存檔欄位或控制器呼叫。
- 英靈入口節點 BtnOpenSpiritCodex 為 enabled，但換算至 1920×1080 canvas 的實際滑鼠中心為 x=192、y=-12，超出畫面上緣。pointer-points.json 保存座標。
- 實際點擊後 CodexTitle／CodexCount／CodexList／關閉鈕沒有出現在 active UI，圖鑑未開啟；browser errorCount=0 不代表互動通過。
- hud.png 為入口狀態；codex.png 是點擊嘗試後仍未開啟的畫面，不是通過截圖。codex-observation.json 保存點擊前後完整 active 節點。
- 來源配置 lobby-season-hud-main.json：SeasonHudCard 高 232，英靈鈕 bottom=344、高 40；沙盤 bottom=296。與實際入口超出上緣的觀測一致。
- 左側 HUD 已裁切並先以 125px 檢視，上緣裁切可辨識，沒有升級讀取原圖。
- 正式卡第一步不符即停止；空狀態、有卡／超過六位、多語系、關閉、phone-16-9 均未通過，不注入測試資料補齊。
- 完整卡維持 blocked，需另立版面修復範圍後重驗。
