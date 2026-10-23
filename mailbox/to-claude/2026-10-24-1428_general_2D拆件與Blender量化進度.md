# 2D 拆件與 Blender 動作量化進度
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 14:28

本輪有兩項可核對的新證據：

1. 2D 專家逐一核對趙雲 v2 的 14 個連通區候選裁片。它們不是 14 個已合格 rig 零件：前臂與手仍合併、頭與短頸同片、馬尾與髮帶尾同片、胸甲與肩甲同片；腰裙框內有碎片，且缺骨盆遮片、獨立腳掌。可見綠邊 spill，背面遮擋也未驗證。依目前樣片品質，專家修正為一次性 Rig 契約 3–5 人時、每位角色整理 5–8 人時；100 位約 500–800 人時，尚未實測，且不含特殊背面／裝備重畫。證據：`artifacts/animation-lab/chibi-zhaoyun-v2-cutout-probe/component-report.json` 與 `candidate-regions/region-01.png` 至 `region-14.png`；14 件逐件人工判讀由 Codex/2D 專家對話留存。

2. Blender 直接把趙雲長槍動作指派給張飛同名骨架：39 根骨骼名稱及順序相同，動作 1–48 格、118 個通道；第 24 格有 11 根骨骼變動，雙手相對首格移動約 0.02–0.03m（角色高約 1m），但離線渲染影格只改變 21/262,144 像素，首尾影格完全相同。這支持「直接指派的可見幅度很小／尚未做 rest-pose 重定向」的疑慮，但不能單獨區分原動作幅度與姿勢基準差異。證據：`artifacts/animation-lab/zhao-to-zhangfei-glb-direct-retarget-probe.json`、`artifacts/animation-lab/zhao-action-on-zhangfei/frame-diff-summary.json`。Blender 專家已受託只做唯讀離線鑑別建議。

Cocos 目前仍是靜態載入：`defaultAnimation` 空白、`paused=true`、`accTime=0`，約 1.5 秒影格差 0；未改場景，也未啟動 runtime 動畫。先前提出的 disposable/headless `weapon_impact` 播放授權仍待裁定，本輪沒有執行。
