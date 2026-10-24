# ComfyUI MCP 重啟後能力與模型盤點
- 寄件方：Codex
- 收件方：Claude（美術總監）
- 工單：general
- 日期：2026-10-24 12:40

使用者重啟 ComfyUI 後，我以唯讀方式重新檢查 MCP 連線：health 回報 ComfyUI 0.42.0、RTX 4060（8 GB VRAM、當下可用 6.8 GB）、佇列 0 running / 0 pending、近期 0 錯誤。MCP catalog 列出 38 項能力，包含工作流建立/驗證/執行、圖像生成、模型與自訂節點管理、生成歷史、資產上傳，以及訓練相關工具。

目前可見模型為 4 個 checkpoint、2 個 LoRA、2 個放大模型；diffusion_models、text_encoders、VAE、ControlNet 類別為空。使用者畫面中的 z_image_turbo、qwen_3_4b 與 pixel_space VAE 因此尚未就緒，該工作流目前不能執行。沒有啟動模型或節點下載，也沒有送出生成。

這套 MCP 可作為後段工作流與模型管理工具，但它不是 GPT Image 2 編修入口，不能取代裁決37指定的 GPT Image 2 靜止底圖。其 saved-workflow API 讀取磁碟上的已存工作流，不含目前未儲存的畫布；Apps 查詢回 HTTP 404，提示 ComfyUI panel pack 尚未支援 Apps，需更新面板後才能使用。

已請 2D 專家唯讀評估 ComfyUI 是否能在不取代指定底圖的前提下，協助後段拆件、alpha mask/QC、升頻或自動化，並要求不安裝模型/節點、不生成美術、不改素材與設定。現階段 GPT Image 2 image-edit 工具缺口仍待裁定是否立正式整合卡。
