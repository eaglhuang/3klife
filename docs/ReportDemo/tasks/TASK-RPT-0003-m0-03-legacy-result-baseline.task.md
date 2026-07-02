---
task_id: TASK-RPT-0003
source_milestone: M0-03
title: "建立舊系統結果基準"
status: planned
owner: project-captain
priority: P0
milestone: M0
depends_on:
  - "TASK-RPT-0001"
  - "TASK-RPT-0002"
related_plan: "docs/ReportDemo/內部人員交易報表轉媒體儲存系統_功能里程碑計畫.md"
agent_team_plan: "docs/ReportDemo/內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md"
planning_repo: 3KLife
target_repo: reportdemo-target-system
closure_authority: planning_repo
scopePaths:
  - "docs/ReportDemo/tasks/TASK-RPT-*-legacy-result-baseline.task.md"
  - "docs/ReportDemo/evidence/M0-03/**"
  - "docs/ReportDemo/inventory/**"
  - "docs/ReportDemo/decision-records/**"
  - "legacy/舊系統報表模組_功能別003.xxx"
  - "legacy/舊系統資料轉換_SP_功能別003.sql"
deliverables:
  - "docs/ReportDemo/evidence/M0-03/implementation-notes.md"
  - "docs/ReportDemo/evidence/M0-03/validation-result.md"
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
  ownerAtomOrMap: "reportdemo.m0.legacy-result-baseline"
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
# TASK-RPT-0003 - M0-03 建立舊系統結果基準

## Goal

完成 `M0-03` 對應功能，並能證明新系統涵蓋舊系統必要行為；未知舊系統程式碼先以象徵性代號標記，後續盤點時替換為真實名稱。

## Legacy Coverage

- 需對照：`legacy/舊系統報表模組_功能別003.xxx`
- 需對照：`legacy/舊系統資料轉換_SP_功能別003.sql`
- 若本卡涉及重寫，必須保留舊系統輸入、輸出、排序、欄位、狀態與例外案例的比對紀錄。

## Functional Scope
- 選定基準批次、基準資料日期與基準報表。
- 保存舊系統輸出結果、筆數、金額、頁數、PDF metadata 與摘要 hash。
- 建立 Golden Dataset 與 expected result。
- 建立 Golden Dataset 的資料來源、資料血緣、維護責任、核准紀錄與更新流程。
- 建立 Shadow Validation Data 與 Golden Dataset 的區隔規則。

## Implementation Contract

- 優先採漸進式承接：沿用、封裝、移植、重寫、廢止候選需逐項記錄。
- 不得用未脫敏正式資料做一般開發或測試；正式資料只可進受控 Shadow Validation。
- 涉及權限、資料範圍、PDF、稽核、告警或 break-glass 時，安全性與可稽核性優先於便利性。
- 每個可觀測流程需留下 trace ID / correlation ID，方便新舊系統比對與事故追蹤。

- Agent Team 派工、role、reviewer、validator、human sign-off 與 ADR gate 需依 Agent Team 計畫書 v1.0 執行：`docs/ReportDemo/內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md`。

## Deliverables

- 實作程式碼、DB migration、設定檔或文件，依本卡 `scopePaths` 控制。
- `docs/ReportDemo/evidence/M0-03/implementation-notes.md`
- `docs/ReportDemo/evidence/M0-03/validation-result.md`

## Validators

- `git diff --check`
- 目標系統 repo 建立後補：`dotnet test` 或等效自動化測試。
- 目標系統 repo 建立後補：Golden Dataset / Shadow Validation 比對命令。

## Acceptance Criteria
- Golden Dataset 不含未脫敏正式資料。
- 每個測試案例都有 expected result。
- 舊系統基準輸出可重複取得或可查證。
- Golden Dataset 可用於 SIT、CI 或報表比對，不直接依賴正式資料庫。
- Shadow Validation Data 若涉及受控正式資料驗證，需有隔離、權限、稽核與核准紀錄。

## Rollback

以 feature flag、路由切回舊系統、回復 migration 或 revert commit 為優先；若已接觸正式流程，必須先確認資料一致性與稽核紀錄完整。

## Notes

- 2026-07-02 | planned | 本卡由功能里程碑計畫自動拆分，等待人類確認優先順序、實際 owner 與目標系統 repo 路徑。
- 2026-07-02 | planned | 已同步 Agent Team 計畫書 v1.0；正式派工前需確認 role、reviewer、validator、human/ADR gate 與違規阻擋機制。
