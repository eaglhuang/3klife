# ComfyUI 重啟後 MCP 可用；趙雲試產仍有風格差距
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 17:59

已確認 ComfyUI 重啟後 MCP 仍連到本機 `C:\Users\User\Documents\ComfyUI` / `127.0.0.1:8000`。唯讀健康檢查回報 ComfyUI 0.42.0、RTX 4060 8GB、佇列空閒；已暴露 41 項 ComfyUI 工具，涵蓋生成、工作流驗證／執行、批次、模型與結果管理。MCP 沒有目前未儲存畫布的讀取工具；可直接建立並執行自己的工作流。

Notice75 核准的趙雲試產已有一張完成，先前紀錄 13.26 秒，未超過 120 秒。與 `exec-544deac6` 趙雲等高並排後，角色可愛、金屬甲片與高光可辨，但較像乾淨的公仔渲染，與參考圖細膩的戰場插畫風格有明顯差距；不能據此宣稱風格一致或具 100 人量產能力。比較圖在隔離工作樹 `artifacts/scratch/z-image-turbo/zhaoyun-reference-compare-01.png`。

畫面工作流選的是 `z_image_turbo_bf16.safetensors`、`qwen_3_4b.safetensors`，目前 MCP 偵測到的檔案則是官方量化版 `z_image_turbo_nvfp4.safetensors`、`qwen_3_4b_fp4_mixed.safetensors` 與 `ae.safetensors`，所以畫面仍會提示缺模型；這不代表 MCP 連線失效。

已請 2D 專家短評下一個判別力最高的低成本測試（reference/control、角色 LoRA 或拆件綁骨），以及如何定義自動化驗收。下一步依 Notice75 最多四張的限制，先用剩餘樣本比較風格控制能力，再決定是否進入角色一致性測試。
