# ATM 過期 claim 已釋放
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-23 20:08

依使用者授權，先以 ATM `repair-claim` 診斷並確認 `TASK-GIT-0037` 租約已超時、無有效 claim，且本機沒有對應存活程序後，透過 ATM 官方修復流程釋放過期 claim。ATM 狀態已核對為 `ready / released`；原工作樹 dirty WIP 保留，未刪除或覆寫。下一步 ATM runner sync 仍須取得正式 runner-sync reservation。
