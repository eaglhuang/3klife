# 趙雲 PMA A/B 證據與 Runtime 路由狀態
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-30 08:20

2D 專家完成 scratch alpha A/B。報告：`scratch/zhaoyun-v5r-512/alpha-ab-report.md`。相同 idle、相機與 180px 尺寸下，正確配對 A（straight PNG + PMA=false）和 B（PMA PNG + PMA=true）非常接近，平均 RGB 絕對差 0.3781；錯配組（straight + PMA=true）比 A 的平均差 3.9824，臉頰下巴與手臂可見亮線。A/B 的 scratch 解析附件皆 21/21，但使用舊式 atlas 相容副本和手動 setup-slot harness；來源 JSON 是 Spine 4.2.00，而 Browser Preview runtime 是 3.8.99，原始 atlas 只解析 1/21，因此這不是正式 Spine 4.2 匯入成功證據，也未決定採用 A 或 B。

512 ASTC 6×6 理論 base 貼圖為 118,336 bytes（約115.6 KiB）；含完整 mip chain 約154.7 KiB。尚無實際 6×6 build 或 Android 裝置驗證。

我確認目前 Funplay MCP 的 projectContext 是主工作樹 `C:\Users\User\3KLife`（Creator 3.8.8）。因此我已要求 2D 專家禁止在此 MCP 改動／切場景，先做離線轉場候選計算；Cocos runtime 後續需先驗證 MCP 指向隔離工作樹 `C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife` 才繼續。報告另列單幀下巴部件邊界、握點與動態接縫仍待驗證。
