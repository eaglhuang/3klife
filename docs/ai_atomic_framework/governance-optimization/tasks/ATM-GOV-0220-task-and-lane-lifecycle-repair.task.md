---
task_id: ATM-GOV-0220
title: Task and lane lifecycle repair
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0217"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "packages/cli/src/commands/tasks/**"
  - "packages/cli/src/commands/next/claim-readiness.ts"
  - "packages/core/src/lane/**"
  - "tests/cli/task-lane-lifecycle-repair.test.ts"
  - "tests/cli/orphan-in-progress-adoption.test.ts"
  - "tests/cli/protected-ledger-destructive-guard.test.ts"
deliverables:
  - "packages/cli/src/commands/tasks/**"
  - "packages/cli/src/commands/next/claim-readiness.ts"
  - "packages/core/src/lane/**"
  - "tests/cli/task-lane-lifecycle-repair.test.ts"
  - "tests/cli/orphan-in-progress-adoption.test.ts"
  - "tests/cli/protected-ledger-destructive-guard.test.ts"
validators:
  - "node --strip-types tests/cli/task-lane-lifecycle-repair.test.ts"
  - "node --strip-types tests/cli/orphan-in-progress-adoption.test.ts"
  - "node --strip-types tests/cli/protected-ledger-destructive-guard.test.ts"
  - "npm run validate:task-ledger-governance"
  - "npm run validate:status-machine"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0220 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.task-lane-lifecycle"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T17:29:03.239Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T17:29:03.239Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T17-29-03-239Z-close-a21aad659fc7"
lastTransitionAt: "2026-07-20T17:29:03.239Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b7ae7c83130ed19c125cd3654488c60b582effb5"
---

# ATM-GOV-0220 Task and lane lifecycle repair

## Intent

修復 task/lane 生命週期殘留：orphan in_progress adoptable、actor/lane 不一致、plan path 延續、batch/normal oscillation、scope quote/path normalization、protected ledger destructive guard。

## Required Work

- orphan in_progress 轉為可 adopt，adopt 驗證 actor/lane/session/TTL。
- 修正 actor identity、laneSessionId、claim owner、commit attribution reconcile。
- plan path、scope quote/path normalization、batch/normal route 共用 parser。
- 任何清理、rekey、closeback 只能透過正式 CLI，不直接刪 .atm。

## Acceptance

- [ ] orphan in_progress fixture 可 adopt 且保留 event history。
- [ ] actor/lane mismatch diagnose 輸出最小 reconcile command。
- [ ] scope path 含 quote/glob/space/Windows slash 的 import/claim/close 一致。
- [ ] protected ledger guard 擋下直接刪改 .atm/history。

## Verification

```bash
node --strip-types tests/cli/task-lane-lifecycle-repair.test.ts
node --strip-types tests/cli/orphan-in-progress-adoption.test.ts
node --strip-types tests/cli/protected-ledger-destructive-guard.test.ts
npm run validate:task-ledger-governance
npm run validate:status-machine
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- task/lane lifecycle recovery commands

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:12.487Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0220-task-and-lane-lifecycle-repair.task.md","contentDigest":"sha256:8dd7e830456924ffacd3c569e61f08653b5e3ecb76b4cfb861237b5f047e4aa0"} -->
