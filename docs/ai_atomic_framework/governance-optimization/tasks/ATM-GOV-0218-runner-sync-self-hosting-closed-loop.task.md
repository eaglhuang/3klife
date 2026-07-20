---
task_id: ATM-GOV-0218
title: Runner sync self-hosting closed loop
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0216"
  - "ATM-GOV-0217"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "scripts/run-sealed-runner-build.ts"
  - "scripts/runner-sync-incremental-build.ts"
  - "packages/cli/src/commands/broker/steward-runtime-actions.ts"
  - "packages/cli/src/commands/tasks/claim-ownership.ts"
  - "schemas/governance/runner-sync-receipt.schema.json"
  - "tests/cli/runner-sync-self-hosting-loop.test.ts"
  - "tests/cli/runner-sync-stale-sha-recovery.test.ts"
deliverables:
  - "scripts/run-sealed-runner-build.ts"
  - "scripts/runner-sync-incremental-build.ts"
  - "packages/cli/src/commands/broker/steward-runtime-actions.ts"
  - "packages/cli/src/commands/tasks/claim-ownership.ts"
  - "schemas/governance/runner-sync-receipt.schema.json"
  - "tests/cli/runner-sync-self-hosting-loop.test.ts"
  - "tests/cli/runner-sync-stale-sha-recovery.test.ts"
validators:
  - "node --strip-types tests/cli/runner-sync-self-hosting-loop.test.ts"
  - "node --strip-types tests/cli/runner-sync-stale-sha-recovery.test.ts"
  - "npm run validate:runner-entrypoints"
  - "npm run validate:runner-reproducibility"
  - "npm run validate:onefile-release"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0218 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.runner-sync-steward"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T16:38:17.257Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T16:38:17.257Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T16-38-17-257Z-close-7b0d28d9becf"
lastTransitionAt: "2026-07-20T16:38:17.257Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "93c3c19fedf255828b3e3ccc3245324ad6aafd6e"
---

# ATM-GOV-0218 Runner sync self-hosting closed loop

## Intent

把 runner-sync 修成自我託管閉環：統一 actor/task ID 正規化，自動 temp claim，HEAD 移動時 coalesce/revalidate，build receipt 自動推進並釋放 queue。

## Required Work

- requiredCommand 必須使用正規化 task id，並補齊 claim/files prerequisites。
- HEAD 移動時 coalesce/revalidate，不進無限追 SHA loop。
- build receipt 自動 release queue；stale/cancel 用正式 cancel/reconcile。
- cache hit 不污染 manifests；Windows atomic retry 與 actor identity 寫入 receipt。

## Acceptance

- [ ] dot/special actor id 的 emitted command 可直接執行。
- [ ] stale SHA reservation 到 current HEAD build 有單一 recovery command。
- [ ] cache-hit/cache-miss/HEAD-moved/orphan-claim/Windows retry fixtures 全過。
- [ ] node atm.mjs、onefile、root-drop runner parity 通過。

## Verification

```bash
node --strip-types tests/cli/runner-sync-self-hosting-loop.test.ts
node --strip-types tests/cli/runner-sync-stale-sha-recovery.test.ts
npm run validate:runner-entrypoints
npm run validate:runner-reproducibility
npm run validate:onefile-release
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- atm.runnerSyncReceipt.v1

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:07.228Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0218-runner-sync-self-hosting-closed-loop.task.md","contentDigest":"sha256:042c69ab581037ee3506d6e8da9d7249049ea5a0e8cb402b81e38a7a947dec0b"} -->
