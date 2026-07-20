---
task_id: ATM-GOV-0225
title: Final closure for ATM 2.0 and 2.1
status: planned
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0215"
  - "TASK-ERR-0002"
  - "ATM-GOV-0216"
  - "ATM-GOV-0217"
  - "ATM-GOV-0218"
  - "ATM-GOV-0219"
  - "ATM-GOV-0220"
  - "ATM-GOV-0221"
  - "ATM-GOV-0222"
  - "ATM-GOV-0223"
  - "ATM-GOV-0224"
  - "TASK-TMP-0002"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "docs/reports/atm-2-1-final-closure.md"
  - "scripts/validate-atm-2-1-closure.ts"
  - "tests/cli/atm-2-1-final-closure.test.ts"
deliverables:
  - "docs/reports/atm-2-1-final-closure.md"
  - "scripts/validate-atm-2-1-closure.ts"
  - "tests/cli/atm-2-1-final-closure.test.ts"
validators:
  - "node --strip-types tests/cli/atm-2-1-final-closure.test.ts"
  - "node --strip-types scripts/validate-atm-2-1-closure.ts --mode validate"
  - "npm run validate:standard"
  - "npm run validate:runner-entrypoints"
  - "npm run validate:integration-adapter"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0225 command-backed deliverables and sealed task summary."
consumer:
  - "ATM-GOV-0225 final closeout"
missingData:
  - "Implementation evidence is not yet present; this card is an execution contract."
dataDrivenStopRule:
  - "Stop if the implementation hard-codes a task id, actor id, path prefix, timing threshold, or one incident instead of a data-driven/generalized rule."
  - "Stop if a shared-write gate returns a bare refusal instead of a ticket/recovery command, except the owner-ruled R1/R2 cases."
out_of_scope:
  - "No direct edits to .atm/runtime or .atm/history."
  - "No new task/ticket registry."
rollback:
  strategy: revert-commit
  notes: "Revert the delivery commit and dispose generated artifacts through formal ATM commands; do not edit .atm runtime state directly."
atomizationImpact:
  ownerAtomOrMap: "atm.plan-final-closure"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
---

# ATM-GOV-0225 Final closure for ATM 2.0 and 2.1

## Intent

最終收官，不新增產品能力；逐 requirement 檢查功能、真平行證據、420-cell A/B、安全 controller、adopter migration、cleanup 與 backlog reconciliation。

## Required Work

- 重跑 coverage census、runner parity、adopter bootstrap/upgrade/rollback、backlog reconciliation。
- 讀取 0223 dogfood 與 0224 AB summary，逐 requirement 對照。
- 確認 TASK-TMP-0002 已透過正式 CLI 處置 residue。
- 輸出 pass/fail matrix、evidence digest、failed cells、recovery commands。

## Acceptance

- [ ] 所有上游卡 closed 且有 sealed summary。
- [ ] runner parity、adopter new install/upgrade/rollback 全過。
- [ ] 真平行 dogfood 與 420-cell A/B 達標。
- [ ] 只有全部為真才關閉；否則本卡保持 open 並列 recovery。

## Verification

```bash
node --strip-types tests/cli/atm-2-1-final-closure.test.ts
node --strip-types scripts/validate-atm-2-1-closure.ts --mode validate
npm run validate:standard
npm run validate:runner-entrypoints
npm run validate:integration-adapter
git diff --check
```

## Public Interfaces / Evidence

- final closure report; no deterministic-fixture substitute

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:20.351Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0225-final-closure-for-atm-2-0-and-2-1.task.md","contentDigest":"sha256:75c57c7936530f84988308297ee361d88b86ba4f0656d5a585b5619b60ec9ddc"} -->
