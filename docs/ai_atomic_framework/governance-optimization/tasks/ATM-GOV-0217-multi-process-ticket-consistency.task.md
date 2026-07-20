---
task_id: ATM-GOV-0217
title: Multi-process ticket consistency
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0216"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/lifecycle.ts"
  - "packages/core/src/broker/ticket-store.ts"
  - "packages/core/src/broker/wave-broker-scheduler.ts"
  - "schemas/governance/broker-ticket.schema.json"
  - "tests/cli/broker-ticket-cas-consistency.test.ts"
  - "tests/cli/broker-ticket-crash-recovery.test.ts"
  - "tests/cli/broker-ticket-fairness.test.ts"
deliverables:
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/lifecycle.ts"
  - "packages/core/src/broker/ticket-store.ts"
  - "packages/core/src/broker/wave-broker-scheduler.ts"
  - "schemas/governance/broker-ticket.schema.json"
  - "tests/cli/broker-ticket-cas-consistency.test.ts"
  - "tests/cli/broker-ticket-crash-recovery.test.ts"
  - "tests/cli/broker-ticket-fairness.test.ts"
validators:
  - "node --strip-types tests/cli/broker-ticket-cas-consistency.test.ts"
  - "node --strip-types tests/cli/broker-ticket-crash-recovery.test.ts"
  - "node --strip-types tests/cli/broker-ticket-fairness.test.ts"
  - "npm run validate:schemas"
  - "npm run validate:broker-registry"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0217 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.broker-ticket-state-machine"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T16:10:22.207Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T16:10:22.207Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T16-10-22-207Z-close-8eafb8cc1e09"
lastTransitionAt: "2026-07-20T16:10:22.207Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6ca2c01230eea7e679ec9f19adadd4d051f57fe6"
---

# ATM-GOV-0217 Multi-process ticket consistency

## Intent

讓 ticket、queue、proposal、session、evidence 在多 process 下具備 atomic/CAS 一致性、單一喚醒者、公平排程、adopt/revalidate/cancel/reconcile。

## Required Work

- 用 temp-file + rename + digest CAS 寫入所有 ticket transition。
- 實作 single-flight successor wakeup、deterministic aging、bounded bypass。
- 支援失主 adopt、stale-base revalidation、side-effect reconcile、cancel without forged receipt。
- 每個 transition 帶 idempotency key、actor/task/lane、previous/next digest。

## Acceptance

- [ ] 100 個並行 transition fixture 無 lost update、duplicate head 或 starvation。
- [ ] orphan owner 可由正式 adopt command 接手，原 owner 復活不能覆蓋新 state。
- [ ] stale sealed base 產 revalidation ticket，不追逐 HEAD loop。
- [ ] cancel stale queue entry 不需偽造 runner/build receipt。

## Verification

```bash
node --strip-types tests/cli/broker-ticket-cas-consistency.test.ts
node --strip-types tests/cli/broker-ticket-crash-recovery.test.ts
node --strip-types tests/cli/broker-ticket-fairness.test.ts
npm run validate:schemas
npm run validate:broker-registry
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- atm.brokerTicket.v1 hardened state machine

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:04.411Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0217-multi-process-ticket-consistency.task.md","contentDigest":"sha256:66be656ac710ce6485f5a76a6f13b5a920e35ce14a9e92d14f834fd468f46009"} -->
