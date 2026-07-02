---
owner: project-captain
status: active
related_plan: docs/ReportDemo/內部人員交易報表轉媒體儲存系統_功能里程碑計畫.md
agent_team_plan: docs/ReportDemo/內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md
planning_repo: 3KLife
target_repo: reportdemo-target-system
created_at: 2026-07-02
---

# ReportDemo Task Card Index

本目錄依據「功能里程碑計畫」拆成可派工的功能任務卡。任務卡格式參考 `docs/ai_atomic_framework/team-agents/tasks`，但本目錄只作為 ReportDemo 專案規劃與派工來源，不修改 AI-Atomic-Framework 任務生命週期。

## Task Card Contract

- 每張 `TASK-RPT-*` 卡都必須對應一個功能里程碑項目。
- 每張卡都要保留舊系統覆蓋欄位；未知程式碼以 `舊系統報表模組_功能別XXX.xxx` 或 `舊系統資料轉換_SP_功能別XXX.sql` 代稱。
- 任務卡不得跳過 Golden Dataset、Shadow Validation、權限、Data Scope、稽核與 rollback 驗證。
- 目標系統 repo 尚未建立前，`target_repo` 使用 `reportdemo-target-system` 佔位；建立後需批次替換。

## Agent Team Dispatch Contract

- `Agent Team計畫書 v1.0` 是本任務卡目錄的 Agent Team 派工 source of truth，與 `3KLife` repo 或 `AI-Atomic-Framework` repo 沒有執行依賴。
- 正式接卡前需確認 Agent role、reviewer、validator、human sign-off 與 ADR gate。
- M5、M7、M8、M9 或涉及正式資料的任務卡，需額外納入 Security / Permission、Audit / Evidence、QA / Validation 或人類簽核。
- 若 Agent 自動決策與資安、稽核或 ADR 衝突，任務卡不得 closure，需先升級人類或 ADR 裁決。
- 違規阻擋機制至少包含：任務卡 scope、tool sandbox / CI scope check、validator / reviewer、command-backed evidence 與 closure gate。

## Task Roster

| Task ID | Source | Milestone | Title | Status | Depends |
|---|---|---|---|---|---|
| [TASK-RPT-0001](./TASK-RPT-0001-m0-01-legacy-report-inventory.task.md) | M0-01 | M0 | 盤點既有報表 | planned | none |
| [TASK-RPT-0002](./TASK-RPT-0002-m0-02-legacy-data-source-inventory.task.md) | M0-02 | M0 | 盤點既有資料來源 | planned | none |
| [TASK-RPT-0003](./TASK-RPT-0003-m0-03-legacy-result-baseline.task.md) | M0-03 | M0 | 建立舊系統結果基準 | planned | TASK-RPT-0001, TASK-RPT-0002 |
| [TASK-RPT-0004](./TASK-RPT-0004-m0-04-third-party-cross-platform-poc.task.md) | M0-04 | M0 | 建立第三方與跨平台 PoC | planned | TASK-RPT-0001, TASK-RPT-0002 |
| [TASK-RPT-0005](./TASK-RPT-0005-m0-05-sp-sql-refactor-classification.task.md) | M0-05 | M0 | 建立 SP / SQL 改造分類 | planned | TASK-RPT-0002, TASK-RPT-0004 |
| [TASK-RPT-0006](./TASK-RPT-0006-m0-06-role-raci-critical-path.task.md) | M0-06 | M0 | 建立角色、RACI 與關鍵依賴 | planned | TASK-RPT-0001, TASK-RPT-0002, TASK-RPT-0003, TASK-RPT-0004, TASK-RPT-0005 |
| [TASK-RPT-0007](./TASK-RPT-0007-m1-01-import-batch-management.task.md) | M1-01 | M1 | 建立匯入批次管理 | planned | TASK-RPT-0006 |
| [TASK-RPT-0008](./TASK-RPT-0008-m1-02-staging-tables.task.md) | M1-02 | M1 | 建立 Staging 資料表 | planned | TASK-RPT-0002, TASK-RPT-0007 |
| [TASK-RPT-0009](./TASK-RPT-0009-m1-03-legacy-transform-porting.task.md) | M1-03 | M1 | 移植或重寫舊資料轉換邏輯 | planned | TASK-RPT-0005, TASK-RPT-0008 |
| [TASK-RPT-0010](./TASK-RPT-0010-m1-04-audit-write-foundation.task.md) | M1-04 | M1 | 建立稽核寫入基礎 | planned | TASK-RPT-0007 |
| [TASK-RPT-0011](./TASK-RPT-0011-m2-01-validation-rule-versioning.task.md) | M2-01 | M2 | 建立檢核規則版本 | planned | TASK-RPT-0003, TASK-RPT-0009 |
| [TASK-RPT-0012](./TASK-RPT-0012-m2-02-validation-result-severity.task.md) | M2-02 | M2 | 建立檢核結果等級 | planned | TASK-RPT-0011 |
| [TASK-RPT-0013](./TASK-RPT-0013-m2-03-legacy-new-validation-compare.task.md) | M2-03 | M2 | 建立新舊檢核比對 | planned | TASK-RPT-0011, TASK-RPT-0012 |
| [TASK-RPT-0014](./TASK-RPT-0014-m2-04-data-scope-foundation.task.md) | M2-04 | M2 | 建立 Data Scope 基礎規則 | planned | TASK-RPT-0006, TASK-RPT-0010 |
| [TASK-RPT-0015](./TASK-RPT-0015-m3-01-report-template-versioning.task.md) | M3-01 | M3 | 建立報表模板版本 | planned | TASK-RPT-0001, TASK-RPT-0013 |
| [TASK-RPT-0016](./TASK-RPT-0016-m3-02-report-generation-job.task.md) | M3-02 | M3 | 建立報表產生任務 | planned | TASK-RPT-0015 |
| [TASK-RPT-0017](./TASK-RPT-0017-m3-03-report-version-state-machine.task.md) | M3-03 | M3 | 建立報表版本與狀態機 | planned | TASK-RPT-0016 |
| [TASK-RPT-0018](./TASK-RPT-0018-m3-04-dual-report-production-compare.task.md) | M3-04 | M3 | 建立新舊報表雙製比對 | planned | TASK-RPT-0015, TASK-RPT-0016, TASK-RPT-0017 |
| [TASK-RPT-0019](./TASK-RPT-0019-m4-01-pdf-metadata.task.md) | M4-01 | M4 | 建立 PDF metadata | planned | TASK-RPT-0017, TASK-RPT-0018 |
| [TASK-RPT-0020](./TASK-RPT-0020-m4-02-pdf-storage-zone.task.md) | M4-02 | M4 | 建立 PDF 儲存區 | planned | TASK-RPT-0004, TASK-RPT-0019 |
| [TASK-RPT-0021](./TASK-RPT-0021-m4-03-pdf-master-integrity-check.task.md) | M4-03 | M4 | 建立 PDF 主檔完整性檢查 | planned | TASK-RPT-0019, TASK-RPT-0020 |
| [TASK-RPT-0022](./TASK-RPT-0022-m4-04-pdf-reconciliation.task.md) | M4-04 | M4 | 建立 PDF reconciliation 處理 | planned | TASK-RPT-0020, TASK-RPT-0021 |
| [TASK-RPT-0023](./TASK-RPT-0023-m5-01-download-gateway.task.md) | M5-01 | M5 | 建立下載閘道 | planned | TASK-RPT-0014, TASK-RPT-0020 |
| [TASK-RPT-0024](./TASK-RPT-0024-m5-02-dynamic-watermark.task.md) | M5-02 | M5 | 建立動態浮水印 | planned | TASK-RPT-0023 |
| [TASK-RPT-0025](./TASK-RPT-0025-m5-03-download-copy-hash.task.md) | M5-03 | M5 | 建立下載副本 Hash | planned | TASK-RPT-0023, TASK-RPT-0024 |
| [TASK-RPT-0026](./TASK-RPT-0026-m5-03a-download-copy-retention-policy.task.md) | M5-03A | M5 | 建立下載副本保存策略 | planned | TASK-RPT-0025 |
| [TASK-RPT-0027](./TASK-RPT-0027-m5-04-high-confidential-pdf-control.task.md) | M5-04 | M5 | 建立高機密 PDF 控制 | planned | TASK-RPT-0023, TASK-RPT-0024, TASK-RPT-0025, TASK-RPT-0026 |
| [TASK-RPT-0028](./TASK-RPT-0028-m6-01-report-search.task.md) | M6-01 | M6 | 建立報表查詢 | planned | TASK-RPT-0014, TASK-RPT-0017, TASK-RPT-0023 |
| [TASK-RPT-0029](./TASK-RPT-0029-m6-02-secure-preview.task.md) | M6-02 | M6 | 建立安全預覽 | planned | TASK-RPT-0024, TASK-RPT-0028 |
| [TASK-RPT-0030](./TASK-RPT-0030-m6-03-review-workflow.task.md) | M6-03 | M6 | 建立覆核流程 | planned | TASK-RPT-0017, TASK-RPT-0028 |
| [TASK-RPT-0031](./TASK-RPT-0031-m6-04-regeneration-workflow.task.md) | M6-04 | M6 | 建立重產流程 | planned | TASK-RPT-0017, TASK-RPT-0030 |
| [TASK-RPT-0032](./TASK-RPT-0032-m6-05-void-workflow.task.md) | M6-05 | M6 | 建立作廢流程 | planned | TASK-RPT-0017, TASK-RPT-0030 |
| [TASK-RPT-0033](./TASK-RPT-0033-m7-01-audit-query-hash-chain.task.md) | M7-01 | M7 | 建立稽核查詢與 Hash Chain | planned | TASK-RPT-0010, TASK-RPT-0022, TASK-RPT-0025 |
| [TASK-RPT-0034](./TASK-RPT-0034-m7-02-log-sensitive-data-protection.task.md) | M7-02 | M7 | 建立 Log 敏感資料防護 | planned | TASK-RPT-0010 |
| [TASK-RPT-0035](./TASK-RPT-0035-m7-03-alert-severity-routing.task.md) | M7-03 | M7 | 建立告警分級 | planned | TASK-RPT-0010, TASK-RPT-0021, TASK-RPT-0033, TASK-RPT-0034 |
| [TASK-RPT-0036](./TASK-RPT-0036-m8-01-role-management.task.md) | M8-01 | M8 | 建立角色管理 | planned | TASK-RPT-0014, TASK-RPT-0033 |
| [TASK-RPT-0037](./TASK-RPT-0037-m8-02-data-scope-management.task.md) | M8-02 | M8 | 建立資料範圍管理 | planned | TASK-RPT-0014, TASK-RPT-0036 |
| [TASK-RPT-0038](./TASK-RPT-0038-m8-03-break-glass-workflow.task.md) | M8-03 | M8 | 建立 break-glass 流程 | planned | TASK-RPT-0035, TASK-RPT-0036, TASK-RPT-0037 |
| [TASK-RPT-0039](./TASK-RPT-0039-m9-01-shadow-db.task.md) | M9-01 | M9 | 建立 Shadow DB | planned | TASK-RPT-0004, TASK-RPT-0005, TASK-RPT-0018 |
| [TASK-RPT-0040](./TASK-RPT-0040-m9-02-go-no-go-gate.task.md) | M9-02 | M9 | 建立 Go / No-Go Gate | planned | TASK-RPT-0018, TASK-RPT-0039 |
| [TASK-RPT-0041](./TASK-RPT-0041-m9-03-rollback-runbook.task.md) | M9-03 | M9 | 建立 Rollback Runbook | planned | TASK-RPT-0040 |
| [TASK-RPT-0042](./TASK-RPT-0042-m9-04-uat-training-operations-manual.task.md) | M9-04 | M9 | 建立 UAT、訓練與操作手冊 | planned | TASK-RPT-0040, TASK-RPT-0041 |
| [TASK-RPT-0043](./TASK-RPT-0043-m9-05-pilot-legacy-shutdown-gate.task.md) | M9-05 | M9 | 建立 Pilot 與舊系統下線 Gate | planned | TASK-RPT-0040, TASK-RPT-0041, TASK-RPT-0042 |
| [TASK-RPT-0044](./TASK-RPT-0044-m10-01-release-acceptance.task.md) | M10-01 | M10 | 功能驗收 | planned | TASK-RPT-0043 |
| [TASK-RPT-0045](./TASK-RPT-0045-m10-02-legacy-coverage-confirmation.task.md) | M10-02 | M10 | 舊系統覆蓋確認 | planned | TASK-RPT-0001, TASK-RPT-0002, TASK-RPT-0044 |

## Sequencing Note

建議先完成 M0 盤點與 PoC，再進入 M1/M9-01 的資料遷移基礎；M2-M5 可在資料基準穩定後分流開發，但 M7/M8 的稽核、告警、Admin 與 break-glass 不應延到最後才補。
