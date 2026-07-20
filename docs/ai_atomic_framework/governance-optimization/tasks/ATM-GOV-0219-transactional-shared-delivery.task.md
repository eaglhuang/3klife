---
task_id: ATM-GOV-0219
title: Transactional shared delivery
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0216"
  - "ATM-GOV-0217"
  - "ATM-GOV-0218"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "packages/core/src/broker/shared-delivery-commit.ts"
  - "packages/core/src/broker/shared-delivery-saga.ts"
  - "packages/cli/src/commands/evidence/command-runs.ts"
  - "schemas/governance/command-manifest.schema.json"
  - "tests/cli/command-manifest-shellless.test.ts"
  - "tests/cli/shared-delivery-idempotency.test.ts"
  - "tests/cli/generated-write-manifest.test.ts"
deliverables:
  - "packages/core/src/broker/shared-delivery-commit.ts"
  - "packages/core/src/broker/shared-delivery-saga.ts"
  - "packages/cli/src/commands/evidence/command-runs.ts"
  - "schemas/governance/command-manifest.schema.json"
  - "tests/cli/command-manifest-shellless.test.ts"
  - "tests/cli/shared-delivery-idempotency.test.ts"
  - "tests/cli/generated-write-manifest.test.ts"
validators:
  - "node --strip-types tests/cli/command-manifest-shellless.test.ts"
  - "node --strip-types tests/cli/shared-delivery-idempotency.test.ts"
  - "node --strip-types tests/cli/generated-write-manifest.test.ts"
  - "npm run validate:schemas"
  - "npm run validate:brokered-write"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0219 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.transactional-shared-delivery"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T17:04:41.204Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T17:04:41.204Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T17-04-41-204Z-close-12c77a0b0e5b"
lastTransitionAt: "2026-07-20T17:04:41.204Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "acdb5166e9760e55a00c0465ac0410b4728fe7ad"
---

# ATM-GOV-0219 Transactional shared delivery

## Intent

把 generated write、Git delivery、release artifacts、checkpoint、closeback 變成 shellless、temp-index、可重試、冪等的交易式 shared delivery。

## Required Work

- 新增 `atm.commandManifest.v1`，default shell=false，含 executable、argv、cwd、env refs、timeout、IO digest。
- generated write 使用 argv/JSON manifest；舊 `--run-command` 只在 queue-only compatibility path 可用並提示 deprecated。
- Git 使用 temp index/tree 與 stdin pathspec，禁止 shell interpolation。
- 所有 side effect 有 idempotency key、receipt、reconcile/rollback path。

## Acceptance

- [ ] default-on path 拒絕 shell command string。
- [ ] 同一 delivery 重跑三次不重複 commit/close/push/release/checkpoint。
- [ ] 空白/quote/Unicode/長路徑 pathspec fixture 通過。
- [ ] generated write manifest 可重算 digest，失敗不產成功 receipt。

## Verification

```bash
node --strip-types tests/cli/command-manifest-shellless.test.ts
node --strip-types tests/cli/shared-delivery-idempotency.test.ts
node --strip-types tests/cli/generated-write-manifest.test.ts
npm run validate:schemas
npm run validate:brokered-write
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- atm.commandManifest.v1
- deprecated --run-command compatibility notice

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:09.631Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0219-transactional-shared-delivery.task.md","contentDigest":"sha256:d93cf70e1e482891b69e06a8e700fa80cbd9241404b8a6f12ec1b85832a44ebf"} -->
