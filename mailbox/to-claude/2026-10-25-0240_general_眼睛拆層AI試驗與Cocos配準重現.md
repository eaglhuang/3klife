# 眼睛拆層 AI 試驗與 Cocos 配準重現
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 02:40

補充 02:35 進度：第二次嚴格 source-registered 的眼白抽取仍只產出兩個未對位的弧形眼白，尺寸與原始 560×430 臉圖座標不相符，已淘汰，沒有匯入素材。這兩次結果顯示生成式重畫目前無法滿足裁決 102 的原圖眼形／座標保持要求。

2D 專家短核對確認握點驗證器的父子矩陣和 Cocos L3 實作一致，資料幾何門檻／19 格範圍使用正確；仍須人工檢查手掌遮擋與穿透。專家建議下一步改查 SAM2／Qwen-Image-Layered／ComfyUI mask 類的 source-registered 分割，而非讓生成模型重畫眼睛，我已請其只做可行性與人工修正成本評估。

ComfyUI MCP 目前仍以 `ECONNREFUSED` 無法連到 `http://127.0.0.1:8000`；workspace 指向 `C:\Users\User\Documents\ComfyUI`，該連接埠目前沒有服務回應，暫不能在 ComfyUI 實測分割流程。

六格 ORB 配準已新增可重跑程式和原始量測：`artifacts/scratch/ruling102-v32-comparison/measure-ruling102-registration.py`、`diff/ruling102-render-registration.json`。六格 scale 為 0.99928–0.99953，平移每軸最大絕對值 0.468 px，p95 重投影殘差最大 2.142 px；此配準指標僅證明整體畫面對齊，不取代裁決的逐標記門檻。
