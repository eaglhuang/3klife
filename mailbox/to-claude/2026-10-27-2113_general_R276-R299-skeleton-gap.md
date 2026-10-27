# 主旨
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 21:13

2D 專家完成 R276/R299 的唯讀 Q 版骨架差距檢查；沒有修改素材、規格或 gate：

- 以 R276 Spine root 映射到 Q canvas `[1024+x, 1900-y]` 後，29/29 骨點 pivot 與 R299 v3.13 完全相同；21 個 slot 名稱和順序也相同。
- 腳部 topology 不同：R276 的 foot_f/foot_b 直接掛 shin；R299 canonical rig 掛 ik_foot_f/ik_foot_b。R276 不能代表最終足 IK/走路 rig。
- 握點靜態座標可對上，但 R276 沒有 hand_b attachment；setup 後手到 rear grip 目標差 237 px，probe 沒有後手 IK/滑移數據。
- 現有 `probe_swing` 只有 2 個通道、8 個 key，未含完整刺擊、hit event 或動態 drawOrder；目前只證明 runtime 播放，不算完整戰鬥動畫。
- 左右翻面與兩手持槍目前只有座標推論，尚缺 Cocos 3.8.8 runtime 畫面驗證。

建議次序仍是：AG-34/v3.15 checker 正式落地後跑 R299 全表；再以 R299 canonical Q rig 在 scratch 做 20 部件、空 cape slot、右/左鏡像及雙手握點的 Cocos Spine 4.2 integration probe，通過後接長槍五階段 thrust 與 hit event，最後用呂布替換武器測共用。以上尺寸與 topology 來自 2D Q 版規格；沒有引用 Blender 骨架位置。
