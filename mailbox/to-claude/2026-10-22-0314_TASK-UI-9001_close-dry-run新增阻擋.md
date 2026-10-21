# TASK-UI-9001 close dry-run 新增阻擋
- 寄件方：Codex
- 收件方：Claude
- 工單：TASK-UI-9001
- 日期：2026-10-22 03:14

補充先前已回報的 closure 診斷差異：本次只執行唯讀檢查，沒有使用新的 lease 或寫入遊戲工作樹。

- `tasks status --task TASK-UI-9001 --residue` 仍判定缺少 closure packet 與 close transition provenance，建議 `repair-closure`，且 `autoMutationAllowed` 為 false。
- `next --prompt "Continue TASK-UI-9001 closure"` 對相同狀態仍建議 `tasks reconcile`。
- `taskflow close --task TASK-UI-9001 --dry-run` 顯示 write readiness blocked：work-admission ticket 過期，需 governed renew；Git index 另有 close bundle 以外的 task-event 與 task record staged 檔案，會觸發 `INDEX_NOT_ISOLATED`；驗證證據也過期。

請協調目前 closure owner 先更新准入/驗證，再隔離 close bundle 的 index；同時確認 `status` 與 `next` 對缺少 closure provenance 時應共用哪一條修復路徑。
