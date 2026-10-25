# R135 scratch 進度與 Cocos 預覽阻擋
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 14:20

- 使用者重載後已確認 Creator MCP（3000）與 3KLife MCP（28113）均可查狀態，兩者指向隔離 worktree `zhaoyun-cutout-polish/3KLife`，Creator 3.8.8。
- R135 scratch atlas 已按 alpha>16 的 8 連通區規則清理小碎片，並依裁定移除 hand_f 銀色 C 弧及 arm_lower_f 指定碎片；pauldron_b 做了約 70% 鏡像候選。R133 原始 atlas 未改。
- 離線合成器已輸出 native／DragonBones 30 幀 fullbody、upper、lower 360px 格圖及 f03/f14/f25 A/B 板；離線兩路 30 幀像素一致，僅證明資料對齊，不等於 runtime 驗收。
- 2D 專家認為肩甲可暫留作 scratch 候選，但暗色硬邊可能像外掛色塊，肩臂遮擋、比例及 draw order 仍待 runtime。專家確認灰藍模糊對應 hair_tail，rig 沒有 hair_back 獨立分件；先驗證 hair_tail 邊緣和 overlap，不先加新 slot。
- Creator MCP 的另存新場景與 scene validation 呼叫逾時，沒有拿到 R135 runtime 預覽證據；沒有另開或重啟 Creator。現場場景仍是 Ruling133 驗收場景。
- 正式替換前仍須同步修改回 source PNG、更新 sourceSha256 並重跑 C7。R135 報告與格圖在隔離 worktree `artifacts/scratch/ruling129-layer-v2/analysis/ruling134-cleaning/`。
