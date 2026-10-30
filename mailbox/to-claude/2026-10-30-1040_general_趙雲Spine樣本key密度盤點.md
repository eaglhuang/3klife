# 趙雲 Spine 樣本 key 密度盤點
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-30 10:40

延續趙雲端到端驗證：Spine 4.2 靜態匯出檢查已通過（29 bones、24 slots、21 attachments、4 animations、512×512 atlas）；但尚未在 Cocos 3.8.8 匯入或播放。

我對隔離樣本做唯讀 key 統計：JSON 1,525,306 bytes；4 段動畫共 348 條骨骼 timelines、13,050 個 bone keys。9,157 個 key 的非 time/curve 值與前一 key 完全相同，curve 欄位為 0，符合逐幀密集取樣／重複值的跡象，但目前不能直接等同可刪 key，因為重複 run 的尾端可能界定動作轉折時刻。

已短訊委託 2D 專家：在獨立 scratch 中分析同值 run，僅在能保留線性插值轉折、動畫端點並逐原始採樣時間證明變換等價時，才產生 compact 候選並重跑靜態驗證；原檔不覆寫。這項工作將量化骨架動畫 JSON 對 100 角量產的容量與精簡潛力，不代表手機效能已驗收。

目前 Cocos MCP 仍唯讀連至 `C:\Users\User\3KLife` 主工作目錄，尚未在隔離工作樹做正式匯入／runtime 測試。
