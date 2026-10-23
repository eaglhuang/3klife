# ATM Bug and Optimization Backlog — TASK-UI-9001 實作期間的治理觀察（2026-10-21）

> 這是 `ATM_BUG_OPTIMIZATION_BACKLOG.md` 的「TASK-UI-9001 實作期間的治理觀察（2026-10-21）」分片。完整索引見 `docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md`。

## TASK-UI-9001 實作期間的治理觀察（2026-10-21）

- [ ] 本機維護卡與 PM 的 PROG-2-0150 撞號：以 master 卡與本機卡的用途比對可重現。影響是可能覆寫正式驗收規格；本次保留 PM 卡，正常釋放舊 claim，改用 TASK-UI-9001。建議跨來源開卡前查遠端與信箱並提供共享編號預留。
- [ ] 任務作者曾將自己的規劃 MD／索引列入產品 deliverables，與 planning-only 邊界衝突；這是本次開卡錯誤，尚不能歸因框架缺陷。本卡已區分 13 個 scopePaths 與 9 個 deliverables；建議匯入預檢提早指出這類自相矛盾契約，保留原有邊界。
- [ ] 舊 frozen runner 匯入新卡時遺失 scope、deliverables 與 validators。以 import dry-run 比對可檢出；正式 internal-release 複製 runner 後恢復 13／9／7 個欄位。發布驗證仍有失敗，不能當成整體更新完成。
- [ ] 過期 TASK-TEAM-0088 active lease 阻擋本機排程。此隔離工作目錄以正常 takeover／release 解開，沒有標 done，也不代表其他工作目錄或共用阻擋已解除；建議 next 明確提示過期租約的正常處理路徑。
- [ ] 新 runner 的 doctor 要求舊 adopter 未具備的 first-principles 檔與 Schedule A；setup 又將 .codex/worktrees 內的合法受管 checkout 判為 ATM_SETUP_UNSAFE_TARGET。偵測：doctor 與 setup --cwd . --agents none --dry-run。建議提供可預覽且保留既有治理內容的版本遷移，並辨識受管 Git worktree；本次未 force 初始化、未改寫憲章。另 tasks audit 回報 488 個歷史錯誤，須另立範圍查核，不能以本維護卡批次修寫。
- [ ] start 的拆分措辭路由回傳 upgrade --propose --behavior behavior.split --dry-run，但該命令缺少必填 --atom 而回 ATM_CLI_USAGE。正式 next --claim 的 normal playbook 已有完整任務契約；建議 start 產生可執行參數或回報缺少 atom 的具體證據，避免死路指令。

- Keep this file as a checklist; do not close items silently.
- When an item becomes a real task card, add the task id under related tasks.
- When fixed, mark the checkbox and add the closing commit or evidence command.
- Do not use this backlog as authority to bypass ATM routing, task claim, evidence, or closure rules.
