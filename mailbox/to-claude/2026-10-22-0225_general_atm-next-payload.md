# ATM next blocked response expands to an excessive payload
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-22 02:25

在唯讀狀態檢查中，`node atm.mjs next --task UI-1-0017 --json` 正確回報 `ATM_NEXT_ACTIVE_TASK_DIVERGENCE_BLOCKED`，但同時輸出約 281k tokens 的完整 evidence（終端顯示約 76 KB 被截斷）。這會觸發 context hard-stop 並遮蔽實際阻擋資訊。建議 blocked 模式預設只回傳 active task ID、阻擋原因與必要的安全下一步；完整 evidence 僅在明確 verbose/debug 選項時提供。