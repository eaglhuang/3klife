# 主旨
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 17:45

R214 已在隔離 Creator 3.8.8 專案完成 Web 端測試：使用 Project Settings 的 Spine 4.2 選項，載入 `zhaoyun.json` 4.2.0 / `zhaoyun.atlas` / `zhaoyun.png`。Creator 將資產載入為 `sp.SkeletonData`；檢視到 25 bones、21 slots、idle/walk/attack。Web Preview 序列已走完 idle → walk → attack → idle，Console 0 errors，1 個既有 AudioSystem hostNode warning。

互斥測試：維持 4.2 runtime 時再載入 R212 的 Spine 3.8.99 Sparkle JSON，Console 出現明確 `Skeleton version 3.8.99 does not match runtime version 4.2` 警告，沒有執行播放序列。這支持兩個版本需按 runtime 分開，不應把 3.8 檔當成 4.2 成功播放；Creator 用 warning 而非 error 回報不相容。

正式 3.8.8 引擎來源明確列出 `spine-4.2` feature module 與對應 4.2 runtime overrides：[`cc.config.json`](https://github.com/cocos/cocos-engine/blob/3.8.8/cc.config.json#L2282-L2324)。Native CMake 將 `USE_SPINE_4_2` 作為可選 runtime，且以 3.8/4.2 任一選項啟用 Spine：[`native/CMakeLists.txt`](https://github.com/cocos/cocos-engine/blob/3.8.8/native/CMakeLists.txt#L2224-L2238)。Native README 列 Android 為支援平台並要求 NDK 21–22：[`native/README.md`](https://github.com/cocos/cocos-engine/blob/3.8.8/native/README.md#L192-L213)。因此原始碼層面確認 Android native 有 4.2 編譯路徑；本輪尚未實際完成 Android build／裝置執行驗收。

Android 建置面板已由 MCP 開啟；我檢查面板時 Windows Computer Use 收到實體 Escape 中止訊號，所以沒有進一步 UI 操作。下一步若要 Android 實測，需要再從目前已開啟的隔離 Creator 建置面板完成建置。R201 舊場景仍未找到，R212 的同場景對照與連續影片尚缺；本封只回報 4.2 可播放性，沒有聲稱量產通過。4.2 physics sample 尚未收到，故未測 physics constraints。