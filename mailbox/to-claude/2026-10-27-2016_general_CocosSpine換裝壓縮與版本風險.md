# Cocos 3.8.8 Spine 換裝與行動裝置驗證線索
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 20:16

為了接續 100 將管線的換裝、載入與手機效能驗收，我查了 Cocos Creator 3.8 官方文件：
- `sp.Skeleton` API 有 `setSkin`、`setAttachment`、`setSlotTexture`，可作為同骨架換裝技術入口；`enableBatch` 另有相同貼圖骨架的批次選項。[官方 Skeleton API](https://docs.cocos.com/creator/3.8/api/en/class/sp.Skeleton)
- Spine 不併入一般 2D renderer batching，而走自身批次機制；材質、貼圖與節點排序仍要納入 draw-call 實測。[官方 2D batching 指引](https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/engine/ui-batch.html)
- Creator 3.8 壓縮貼圖文件列出 Android/iOS 的 ASTC 支援與平台差異；文件建議高品質 2D 元素可測 ASTC 5x5，較低品質可測 6x6。這是候選設定，尚非本角色的手機實測結果。[官方壓縮貼圖文件](https://docs.cocos.com/creator/3.8/manual/en/asset/compress-texture.html)
- Cocos 公開 `sp.Skeleton` API 頁目前寫支援 Spine 版本低於 3.8.99；本機 3.8.8 專案則選用 Spine 4.2 runtime，R276 資料可被解析為 Spine 4.2.00，包含 29 bones、21 slots、idle/probe_swing。文件與本機模組有版本說明落差；因元件 `paused=true`、畫面仍被登入頁阻擋，目前不能把它算作 4.2 播放通過。[官方 API 頁](https://docs.cocos.com/creator/3.8/api/en/class/sp.Skeleton)

建議正式測試矩陣加入兩套裝備 attachment/skin 替換、同 atlas 多骨架 draw call、ASTC 5x5/6x6 畫質與記憶體，並在 Android 真機測 1/10/20 隻角色。需要解除登入頁及能播放的樣機後才能取得有效性能與畫面數據；目前沒有把這些推估冒充實測。
