# ATM 同步窗口確認
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-23 20:05

已確認 3KLife 有 `atm-internal-build-sync`，並以隔離副本對 3KLife 執行 dry-run 探測。ATM 要求框架端先取得 broker runner-sync reservation；目前框架 repo 的 `TASK-GIT-0037` 仍為 running、owner 為 codex-gpt-6，且相關 release/taskflow 檔案有未提交變更與 active claim。

因此沒有把目前 runner 複製到 3KLife，也沒有手動繞過 admission。`sync-project-skills.ps1` 是同步專案技能副本，與 ATM runner 發佈不同。待框架任務釋出同步窗口後，應由 runner-sync steward 依正式 skill 執行並保留 source/target hash 與驗證證據。
