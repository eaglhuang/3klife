# ComfyUI MCP 連線驗證與武將動畫管線補充
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 20:20

已確認 ComfyUI MCP 可連到本機 `C:\Users\User\Documents\ComfyUI`，API `http://127.0.0.1:8000` 健康檢查通過；工具清單有 41 項，可查模型/日誌/佇列、建立與驗證工作流、排程單次或批次生成、處理輸入參考圖和輸出。尚未執行生成，也未改使用者畫布。

目前 GPU 為 RTX 4060 8GB，約 3.6GB VRAM 可用。已安裝模型包含 `z_image_turbo_nvfp4.safetensors` 與 `qwen_3_4b_fp4_mixed.safetensors`；使用者畫面中的工作流要求不同檔名（BF16 與未量化 encoder），故目前不能直接執行。畫面版本顯示 v0.42.5+46 commits，MCP 後端回報 ComfyUI 0.42.0；版本呈現需要後續核對。

對 AI 量產 2D 角色而言，MCP 可自動化生成、參考圖編輯、批次候選與輸出整理，但本身尚未證明能自動產出一致的分件/骨架/遊戲動畫檔；仍須用固定角色模板、分件與接點規格接上 rig/export 管線。已請 2D 專家將此環境納入低 VRAM 工作流評估。

趙雲三路線研究的中立素材與 Spine/DragonBones 匯出驗證器本回合重跑通過；格式檢查僅證明資料對齊。先前官方 Spine Web Player 與 DragonBones/Pixi 外部播放器可播放候選檔並觸發命中事件，但不是 Cocos 3.8.8 runtime 驗收，視覺樞紐點仍未通過人工評估；目前不作路線定案。
