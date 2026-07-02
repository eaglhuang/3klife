---
task_id: TASK-RPT-0007
source_milestone: M1-01
title: "建立匯入批次管理"
status: planned
owner: backend-dba
priority: P0
milestone: M1
depends_on:
  - "TASK-RPT-0006"
related_plan: "docs/ReportDemo/內部人員交易報表轉媒體儲存系統_功能里程碑計畫.md"
agent_team_plan: "docs/ReportDemo/內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md"
planning_repo: 3KLife
target_repo: reportdemo-target-system
closure_authority: planning_repo
scopePaths:
  - "docs/ReportDemo/tasks/TASK-RPT-*-import-batch-management.task.md"
  - "docs/ReportDemo/evidence/M1-01/**"
  - "src/ReportDemo.Import/**"
  - "db/migrations/reportdemo/**"
  - "legacy/舊系統報表模組_功能別101.xxx"
  - "legacy/舊系統資料轉換_SP_功能別101.sql"
deliverables:
  - "docs/ReportDemo/evidence/M1-01/implementation-notes.md"
  - "docs/ReportDemo/evidence/M1-01/validation-result.md"
  - "目標系統 repo 中對應功能程式碼、DB migration、測試與操作文件"
validators:
  - "git diff --check"
  - "目標系統 repo 建立後補：dotnet test 或等效自動化測試"
  - "目標系統 repo 建立後補：Golden Dataset / Shadow Validation 比對命令"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit-or-feature-flag-disable
  notes: "若已進入正式資料流程，需先依 rollback runbook 停用新功能並回復舊系統路徑。"
atomizationImpact:
  ownerAtomOrMap: "reportdemo.m1.import-batch-management"
  mapUpdates:
    - "待目標系統 repo 建立後補入 atom/path map"
  notes: "本卡先定義功能工作包；實作 repo 建立後需補齊實際 atom/map 與檔案邊界。"
outOfScope:
  - "使用未脫敏正式資料進行開發或一般測試"
  - "未完成舊系統覆蓋比對即切換正式流程"
  - "繞過 Admin、Data Scope、稽核與告警要求"
nonGoals:
  - "一次性重寫所有舊系統功能"
  - "在未完成 PoC / Gate 前承諾最終技術選型"
---
# TASK-RPT-0007 - M1-01 建立匯入批次管理

## Goal

完成 `M1-01` 對應功能，並能證明新系統涵蓋舊系統必要行為；未知舊系統程式碼先以象徵性代號標記，後續盤點時替換為真實名稱。

## Legacy Coverage

- 需對照：`legacy/舊系統報表模組_功能別101.xxx`
- 需對照：`legacy/舊系統資料轉換_SP_功能別101.sql`
- 若本卡涉及重寫，必須保留舊系統輸入、輸出、排序、欄位、狀態與例外案例的比對紀錄。

## Functional Scope
- 建立 Batch ID。
- 記錄來源系統、來源檔案、來源筆數、匯入時間、匯入人員或排程 ID。
- 支援匯入狀態：待處理、處理中、成功、失敗、已重跑。

## Implementation Contract

- 優先採漸進式承接：沿用、封裝、移植、重寫、廢止候選需逐項記錄。
- 不得用未脫敏正式資料做一般開發或測試；正式資料只可進受控 Shadow Validation。
- 涉及權限、資料範圍、PDF、稽核、告警或 break-glass 時，安全性與可稽核性優先於便利性。
- 每個可觀測流程需留下 trace ID / correlation ID，方便新舊系統比對與事故追蹤。

- Agent Team 派工、role、reviewer、validator、human sign-off 與 ADR gate 需依 Agent Team 計畫書 v1.0 執行：`docs/ReportDemo/內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md`。

## Deliverables

- 實作程式碼、DB migration、設定檔或文件，依本卡 `scopePaths` 控制。
- `docs/ReportDemo/evidence/M1-01/implementation-notes.md`
- `docs/ReportDemo/evidence/M1-01/validation-result.md`

## Validators

- `git diff --check`
- 目標系統 repo 建立後補：`dotnet test` 或等效自動化測試。
- 目標系統 repo 建立後補：Golden Dataset / Shadow Validation 比對命令。

## Acceptance Criteria
- 每次匯入都有唯一 Batch ID。
- 匯入失敗可查錯誤原因。
- 批次狀態可追蹤。

## Rollback

以 feature flag、路由切回舊系統、回復 migration 或 revert commit 為優先；若已接觸正式流程，必須先確認資料一致性與稽核紀錄完整。

## Notes

- 2026-07-02 | planned | 本卡由功能里程碑計畫自動拆分，等待人類確認優先順序、實際 owner 與目標系統 repo 路徑。
- 2026-07-02 | planned | 已同步 Agent Team 計畫書 v1.0；正式派工前需確認 role、reviewer、validator、human/ADR gate 與違規阻擋機制。
