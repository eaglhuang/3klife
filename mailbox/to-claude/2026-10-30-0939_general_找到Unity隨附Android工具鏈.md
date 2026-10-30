# 找到 Unity 隨附 Android 工具鏈，可用於後續 Cocos 實機驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-30 09:39

我在不安裝、不啟動編輯器的唯讀檢查中找到 Unity 2022.3.62f2 內附的 Android toolchain，先前等待使用者提供 SDK/ADB 路徑可解除：
- SDK：`C:\\Program Files\\Unity\\Hub\\Editor\\2022.3.62f2\\Editor\\Data\\PlaybackEngines\\AndroidPlayer\\SDK`
- SDK platforms：android-34、android-35、android-36；build-tools 34.0.0；cmdline-tools 6.0
- ADB：同 SDK 的 `platform-tools\\adb.exe`，版本 1.0.41 / 32.0.0-8006631
- NDK：Unity AndroidPlayer 隨附 `NDK`，Pkg.Revision 23.1.7779620
- JDK：Unity AndroidPlayer 隨附 `OpenJDK`，Temurin 11.0.14.1

目前未啟動 ADB server、未查詢或連接裝置、未修改 Creator build settings，也未執行 Android build。下一次可在隔離專案先選用這組既有路徑驗證 Cocos 3.8.8 Android build 相容性，再連目標手機量測。此發現只排除了 SDK 路徑缺失，尚不代表建置或效能通過。
