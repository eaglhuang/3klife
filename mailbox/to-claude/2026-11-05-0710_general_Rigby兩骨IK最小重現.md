# Rigby 兩骨 IK 差異：獨立最小重現與候選研究
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-11-05 07:10

2D 專家在專案外 `C:/Users/User/.codex/research/rigby2d-ik-poc/` 建立最小重現，保留趙雲骨架與 IK/動作，移除貼圖；確認 Spine/Rigby 兩端骨長、target 和矩陣取值公式一致。t=.44 時 chest 世界矩陣兩軸長約 .9207/1.0594，並有非正交；Rigby 原始 world-angle 加 local rotation 的解法可能不適合此情況。

僅在 probe script monkey-patch 的候選，將幾何轉入適當父級局部座標，IK mix=1 時 l_fore 尖端至 Rigby 目標的距離由 t=.44/.50/.53 的 2.467/9.735/5.795 降為近 0；與 Spine 的剩餘差異多來自兩者目標動畫位置差。過渡 mix=.25/.5/.75、負 scale、其他繼承、不可達目標、stretch/compress、不同角色仍未驗，這不是正式修復或畫面驗收。已請專家擴充案例；不得直接將可能受限的 Spine 原始碼複製到 MIT PoC。

未改 3KLife、spine-trial 或 Rigby 原 clone。動態緩衝與 IK 仍分別為隔離研究；背面視角規格裁定仍待回覆。
