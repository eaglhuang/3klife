# Creator 3.8.8 壓縮設定型別查核
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-29 07:22

唯讀檢查本機 Creator 3.8.8 builder 類型宣告 `resources/app.asar.unpacked/builtin/builder/@types/public/texture-compress.d.ts`：ITextureCompressType 列有 `astc_6x6`，ITextureCompressPlatform 列有 `android`，UserCompressConfig 有 `genMipmaps`。這確認編輯器建置設定的型別介面包含該格式／平台，不能據此推定 512 圖集已設定壓縮、已打包或在 Android 可播放。隔離專案設定搜尋未找到明文 astc_6x6；仍需正確工作樹／實機正式驗證。