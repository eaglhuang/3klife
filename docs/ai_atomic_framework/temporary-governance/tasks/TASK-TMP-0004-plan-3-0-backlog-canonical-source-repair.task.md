---
task_id: TASK-TMP-0004
title: Plan 3.0 backlog canonical source repair
status: done
owner: atm-governance
priority: P0
milestone: ATM-3.0-R0
severity: P0
depends_on: []
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "TMP owns one-time canonical-source repair for projection-only backlog rows; it does not implement product behavior."
scopePaths:
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-213.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-214.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-215.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-216.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-21-217.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-21-218.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-213.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-214.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-215.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-20-216.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-21-217.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-21-218.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types scripts/validate-governance-projections.ts --write"
  - "node --strip-types scripts/validate-governance-projections.ts"
  - "git diff --check"
errorCodes: []
createdByCommand: atm plan card create
closed_at: 2026-07-21T17:47:00+08:00
closeback_note: "Target ledger is done/released; planning closeback repaired after Plan 3 evidence audit."
evidence:
  required: command-backed
producer:
  - "Six canonical backlog item shards and one generator-produced projection digest."
consumer:
  - "ATM-GOV-0226"
missingData:
  - "Projection rows are historical input; preserve their full finding, expected behavior, evidence and follow-up rather than shortening them during migration."
dataDrivenStopRule:
  - "Stop if a row cannot be mapped losslessly to atm.governanceBacklogItem.v1 or if the rebuilt projection differs from the six source items."
out_of_scope:
  - "No product bug fix and no direct edit to generated projection rows after rebuild."
  - "No status change beyond preserving the currently recorded Open state."
rollback:
  strategy: revert-commit
  notes: "Revert all six shards and their generated projection together; never leave projection-only rows as the rollback result."
atomizationImpact:
  ownerAtomOrMap: "atm.governance.backlog-projection"
  mapUpdates: []
  extractionCandidates: []
---

# TASK-TMP-0004 Plan 3.0 backlog canonical source repair

## Intent

把誤寫在 generated Markdown projection、沒有 canonical item source 的六筆 0014／0015 dogfood backlog 轉成正式 item shards。這是一次性資料修復；完成後 `ATM-GOV-0226` census 才能讀到可重建、可 closeback 的完整基線。

## Required Work

- 依 `atm.governanceBacklogItem.v1` 建立 `-213` 至 `-218` 六份 JSON，完整保留投影中的日期、類型、嚴重度、狀態、area、finding、expected behavior、evidence/repro 與 follow-up。
- 僅以 projection generator 重建 Markdown；禁止直接維護六列。
- 封存六份 item digest、projection before/after digest、generator command 與 validation receipt。
- 若 generator 對排序或 schema 有不同要求，以 schema/generator 為準並記錄差異，不以手工表格格式為權威。

## Acceptance

- [ ] 六個完整 ID 各有且只有一份 canonical item shard，schema validation 全通過。
- [ ] 重建兩次得到相同 projection digest，且 `-213` 至 `-218` 不再依賴手寫 Markdown 才存在。
- [ ] projection 中六列的語意欄位與 item shards 一致，狀態仍維持原始 `Open`，後續由 owning GOV card 以 evidence closeback。
- [ ] target delivery、ledger evidence 與 projection rebuild receipt 完整後，本卡關閉且不留下臨時轉換檔。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T04:31:49.630Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0004-plan-3-0-backlog-canonical-source-repair.task.md","contentDigest":"sha256:76d33795339c09869d2fd5bd8df01cf3180097f7885a7c881a476298da1cebef"} -->
