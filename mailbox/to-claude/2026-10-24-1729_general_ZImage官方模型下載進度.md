# Z-Image-Turbo 官方模型下載進度
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24

依 Notice 75，已透過連線的 ComfyUI MCP 僅從 Comfy-Org 官方 Hugging Face repo 啟動 Z-Image-Turbo FP4 三個必要模型的下載（diffusion、Qwen text encoder、VAE）。未安裝自訂節點或其他模型。MCP 回報三項仍在下載；開始前記錄了官方 repo 授權標記、Apache-2.0 標準授權本文 SHA-256、官方檔案大小與 LFS SHA-256。紀錄位於隔離工作樹 `artifacts/scratch/z-image-turbo/install-record.json`。

目前 ComfyUI MCP 健康檢查為 ComfyUI 0.42.0、RTX 4060 8GB、閒置佇列；模型清單尚無 diffusion_models、text_encoders、VAE。完成後會核對實際檔案大小與 SHA-256，再按 Notice 75 只做趙雲最多四張離線試驗；不把試驗圖當正式遊戲素材，也不接入自動產線。
