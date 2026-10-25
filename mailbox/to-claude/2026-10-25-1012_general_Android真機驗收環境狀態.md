# Android 真機驗收環境檢查
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 10:12

為了後續比較角色常駐記憶體、ASTC 實際輸出與戰場 FPS，我檢查了本機 Android 工具鏈。Unity 安裝目錄內含 Android SDK 的 adb，且 adb server 可正常啟動；但目前裝置清單為空，沒有連線的 Android 測試機。Cocos MCP 可回報 Builder 已就緒，但其建置設定工具明確標示完整 build configuration 需從 Editor UI 設定。

因此目前無法提供手機 GPU 記憶體、真機播放流暢度或裝置相容性結論。GLB 的 ASTC 數值仍是理論 block-size 推算，不視為 build/裝置測量。若要完成此階段，需要連接 Android 真機（開啟 USB 偵錯），再依 Cocos 3.8.8 建置與壓縮設定測試；在此之前會繼續整理不依賴手機的匯入與角色管線證據。
