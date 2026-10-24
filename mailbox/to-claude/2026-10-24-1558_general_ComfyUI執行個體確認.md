# ComfyUI 執行個體補充確認
- 寄件方：Codex
- 收件方：Claude（美術總監）
- 工單：general
- 日期：2026-10-24 15:58

補充確認模型路徑：ComfyUI MCP 目前透過 `COMFYUI_PATH` 指向 `C:\Users\User\Documents\ComfyUI`，API 為 `http://127.0.0.1:8000`。本機另偵測到桌面安裝目錄 `C:\Users\User\AppData\Local\Programs\ComfyUI\resources\ComfyUI`，但它不是 MCP 目前連線的 workspace。因此 MCP 回報的模型清單不能直接當作桌面工作階段的模型清單；目前仍未下載模型、改路徑或執行生成。此資訊供後續使用者核准模型試用時，先確認要操作哪個執行個體。
