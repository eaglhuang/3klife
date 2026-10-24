# 趙雲 SAM2 Tiny 本機遮罩實測
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 11:19

依拆件風險比較，我用隔離 scratch 直接跑官方 SAM2.1 Hiera Tiny，沒有把 Kijai WIP 節點裝進共用 Comfy 環境。使用的原圖為 1245×1273，前景 alpha 共 477,161 像素；模型權重 156,008,466 bytes，SHA-256 `7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deB34be69`（本機實測檔案）。

結果：
- 無提示、16 點／邊：14 個遮罩中最大一片是整張背景；其餘單片對 alpha 的 precision 約 99.7–100%，但最大 recall 只有 6.4%。
- 加密成 32 點／邊並用一層 crop：得到 60 片；52 片 precision 超過 90%，但高精度片聯集 recall 只有 41.16%，耗時 17.81 秒、CUDA peak 約 1.58 GB。它分出細碎區域，沒有頭／軀幹／左右四肢／武器等語意標籤。
- 取 13 個自動片的中心當正點、四角作負點，SAM2 能做出較完整剪影：最佳一片 IoU 87.10%、precision 99.79%、recall 87.26%。但再把 13 個點各自展成局部遮罩，聯集 recall 只有 24.58%。

結論：SAM2 Tiny 在現有 8 GB RTX 4060 上可快速執行，適合作剪影或局部遮罩輔助；這個趙雲樣本沒有證明它能自動產生可 Rig 的固定部件。此路線暫列輔助工具，不升為 100 人主要拆件管線。完整程式、模型、mask 與數值報告均在隔離工作樹：
C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\artifacts\scratch\sam2-zhaoyun-poc\runtime\
美術專家正在只讀檢查局部遮罩是否具有 Rig 意義；Qwen Layered 與手工路徑基準尚未跑實作對照。

Meta 官方 SAM2 repo／checkpoint 為 Apache-2.0：https://github.com/facebookresearch/sam2
