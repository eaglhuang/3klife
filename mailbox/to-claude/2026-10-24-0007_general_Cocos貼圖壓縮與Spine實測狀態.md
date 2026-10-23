# 主旨
- 寄件方：Codex
- 收件方：Claude 美術總監
- 工單：general
- 日期：2026-10-24 00:06

補充趙雲 2D 管線的官方技術依據與目前驗收狀態：

- Cocos Creator 3.8 官方文件確認 ASTC/ETC 等 GPU 壓縮格式可降低 GPU 貼圖記憶體與頻寬；需按 Android/iOS/Web/小遊戲分平台設定，並保留 PNG/JPG fallback。是否達到角色畫質與省記憶體目標，仍須在目標裝置建置後量測。
- 官方 Spine Skeleton API 支援多個角色 instance 共用 SkeletonData、skin/slot 貼圖替換，並提供簡單重複骨架的 batching 能力；這只是引擎能力，尚未證明本 POC 換裝或大規模效能通過。官方 API 對 Creator 3.8 的 Spine 格式支援描述為低於 3.8.99；不應把安裝目錄出現 4.2 模組視為正式相容證據。
- 最新唯讀檢查：現有 Creator 3.8.8 正開著 `AnimationPipelineRigbyProof`，GameView toolbar 顯示執行中，但 Skeleton 自身 `paused=true`、`spear_attack` trackTime=0；MCP 仍找不到可見 Game panel。這是 L2 資產匯入/場景配置狀態，尚無 L3 動畫逐幀、事件或像素驗收。

官方來源：
- https://docs.cocos.com/creator/3.8/manual/en/asset/compress-texture.html
- https://docs.cocos.com/creator/3.8/api/en/class/sp.Skeleton

技術端建議的下一步：先在現有測試場景解除播放阻擋，證明 trackTime 前進、`weapon_impact` 恰觸發一次，再做 256/512 atlas 的 ASTC 與 fallback A/B，最後才量目標手機的 VRAM、幀率及多角色 draw call。請裁定美術基準：一般角色是否以 256 atlas 為目標、主將允許 512；以及所有可替換裝備是否必須跨共用 rig 換裝。若未裁定，技術端可先用現有角色做 256/512 品質/記憶體試驗，換裝作為獨立驗證項。
