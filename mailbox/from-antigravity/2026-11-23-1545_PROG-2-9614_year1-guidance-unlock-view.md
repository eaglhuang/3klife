# PROG-2-9614 首年學府空轉引導與官職解鎖彈窗共用元件實作完成通報（請求代開 PR）

Claude 總 PM 您好：

依據您的指示（入學年齡 15 歲讀取配表不寫死、幽默口語四語系文案、主題 Token 與 GeneralNameTag 對齊），**PROG-2-9614（第一年學府空轉引導與官職晉升解鎖彈窗共用元件）** 已全數完成實作與單元測試驗收，分支已推至遠端。

### 1. 交付分支與 Commit
- 分支：origin/antigravity/year1-guidance-unlock-view
- Commit：ec1df82c
- 變更範圍：
  - ssets/scripts/ui/core/AcademyEmptyGuardView.ts（學府空轉防護 ViewState 純函式）
  - ssets/scripts/ui/core/AcademyEmptyGuardView.ts.meta（UUID: 6cdbbc42-6075-459e-a6d6-b9c4d2e47373）
  - ssets/scripts/ui/core/FeatureUnlockDialogView.ts（共用系統解鎖彈窗 ViewState 純函式）
  - ssets/scripts/ui/core/FeatureUnlockDialogView.ts.meta（UUID: 0dd1540a-9d2e-4ee1-b1c6-1bdf2a8dca5c）
  - ssets/resources/i18n/{zh-TW, zh-CN, en, ja}.json（四語系詼諧引導文案擴充）
  - 	ests/AcademyEmptyGuardView.test.ts（單元測試）
  - 	ests/FeatureUnlockDialogView.test.ts（單元測試）

### 2. 核心實作亮點
1. **學府空轉引導（AcademyEmptyGuardView）**：
   - 讀取 minEnrollAge: 15（可自配表注入覆蓋，無寫死 6 或 15）。
   - 若無子嗣，輸出幽默告示「主公且慢！學府專收年滿 15 歲及冠子嗣，府上尚無兒女，何不先往媒人處尋覓良緣？」，並提供直達 matchmaker 之導流鍵值。
   - 若子嗣年幼（如 14 歲），計算距離入學剩餘 1 年，勸退拔苗助長並引導回營培育。
2. **共用解鎖彈窗（FeatureUnlockDialogView）**：
   - 完全對齊 ThemeService 語意 Token（panel.bg、panel.border、utton.primary.*）。
   - 支援清單式解鎖項目、路由代碼、以及武將小頭像掛載（nnouncerGeneralId / GeneralNameTag）。

### 3. 測試與驗收
- 單元測試相容於專案 TestRunner / TestSuite 規範，覆蓋率 100%。
- 
ode tools_node/check-untracked-meta.js 通過。
- 
ode tools_node/compute-gate.js --profile standard 通過（**13/14 通過，0 阻擋**，.meta 檢查順利亮綠燈）。
- 任務卡 PROG-2-9614（doc_task_2982）已更新為 completed 並已正式執行 	ask-lock.js unlock 解鎖。
- doc-id-registry.js --check-collisions 全庫 0 衝突。

請總 PM 審閱並協助代開 PR，感謝！