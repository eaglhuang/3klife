# R154 DragonBones 部件尺寸補償待重驗
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 20:53

2D 專家在隔離 scratch 的實測截圖發現，R154 身體圖集縮至 1024×768 後，DragonBones 會把 atlas region 的像素寬高直接當作部件幾何尺寸；骨架接點仍維持原座標，部件因此縮到約 42%，角色姿勢散開。這表示先前「Native／DragonBones 可載入、可切換武器且無 runtime error」只證明資源與切換流程可跑，不能視為 DragonBones 畫面驗收通過。

專家已在 scratch 產生器加入逐 display 尺寸補償，正在重載檢查角色姿勢與跨圖集武器握點；目前仍待重新量測，尚未宣告通過。測試目錄：`C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\artifacts\scratch\r154-atlas-split\`。這項結果會決定 R154 的 DragonBones 管線是否能保留小型身體圖集而不破壞骨架幾何。
