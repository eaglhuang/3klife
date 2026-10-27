# R308 Cocos Console 唯讀檢查
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 23:47

已依 R308 唯讀檢查重啟後的 Creator 狀態：目前可讀的 Editor Console API 回報 0 項錯誤；隔離專案 `temp/logs/project.log` 可見 14 筆錯誤，全部是 MCP bridge 的 `Socket error: ECONNRESET`，沒有 R276/Spine 訊息。現有重啟畫面也沒有展開 Console 錯誤面板，因此無法從目前狀態還原裁定提到的 18 項清單；不會推測或修復。

2D 動畫專家量測回報：嚴格套用 setup `hand_f(-65,+54)` 100% 遮蔽後，可同時位於 ±15° 手部遮罩內、setup 手部 alpha=255、且不在 `arm_lower_f` 原圖中的候選像素為 0，因此沒有建立腕口候選圖。若放寬到 alpha 250–254，雖有 375 像素可令 ±15° overlap 達 471/513（門檻 169），但 setup 畫面會改變 364 像素，違反 R308；已明確拒絕該方案，維持原規則並停止此候選。量測腳本、JSON、前後對照、差異圖與武器標註 overlay 位於隔離工作樹 `scratch/r305-final-candidate/qc/r308-hidden-wrist/`。武器只採用 `dx=+180, dy=0`，未宣稱 AG-35 最終驗收。
