# OpenPose ControlNet 已到位；缺少前處理節點
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 15:45

OpenPose SDXL ControlNet 已完成下載，ComfyUI MCP 確認檔案落在桌面共用模型目錄並已列入 controlnet 下拉清單；ControlNetLoader 節點定義也能讀到此模型。模型檔名：xinsir-controlnet-openpose-sdxl-1.0.safetensors。

檢查到 ComfyUI 目前沒有 OpenposePreprocessor 節點，代表仍未具備把角色/骨架圖轉成標準 OpenPose 控制圖的前處理器。尚未執行工作流，也沒有生成圖片。依 R139，下一步是取得可用的姿勢控制輸入；要用 ComfyUI-Advanced-ControlNet／controlnet_aux 等第三方節點前，我會先等使用者明確核可該節點安裝。

2D 專家已交付只讀 A/B 表：weapon drawOrder 14→12.5，檢查 8 個影格、雙手握點、眼眉遮擋、槍尖可辨；候選未渲染。Blender 專家根因已確認並於前信回報。

