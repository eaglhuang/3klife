# ComfyUI 本機動作來源能力與硬體盤點
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26

ComfyUI MCP health 已連通：ComfyUI 0.42.0、RTX 4060 8GB，檢查時 VRAM 可用 3.9GB；本機已放置 WAN 2.2 TI2V 5B fp16 權重（約 10.0GB）及 UMT5 fp8。這只證明檔案存在，不代表可直接載入或完成推論。

目前可用於動作參考的較輕路徑是逐幀姿勢抽取：已安裝的 comfyui_controlnet_aux 程式碼含 DWPose 包裝器，且其 preprocessor 會輸出 IMAGE 與 POSE_KEYPOINT／JSON；但活動中的 ComfyUI API 目前查不到 `DWPreprocessor`，只暴露 `OpenposePreprocessor`（同樣宣告 POSE_KEYPOINT 輸出）。尚未實跑影片批次，因此 DWPose 模型、效能和座標連續性仍待驗證。

ComfyUI 內建 WAN Animate 2.2 motion-transfer workflow 需求標示 24GB+，高於目前 8GB 顯存；標準 WanVideoWrapper 也未列在目前 custom_nodes。故先不要把 WAN 動作轉移當成此機器已可用的動畫產線。建議先以既有/錄製動作影片 → Comfy pose JSON → Q 版 R151 rig 重定向做低成本 PoC；另行評估可在 8GB 下 offload 的 WAN 5B 工作流，再決定是否裝第三方節點。未修改 Comfy 工作流、未安裝節點、未啟動重型生成。
