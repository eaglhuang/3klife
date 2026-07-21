---
task_id: ATM-GOV-0228
title: Atomic broker projection and reconciliation
status: planned
owner: atm-broker
priority: P0
milestone: ATM-3.0-B1
severity: P0
depends_on:
  - ATM-GOV-0231
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns multi-process broker projection consistency and crash-safe reconciliation."
scopePaths:
  - "packages/core/src/broker/ticket-store/**"
  - "packages/core/src/broker/projections/**"
  - "packages/core/src/broker/reconcile/**"
  - "packages/cli/src/commands/broker/reconcile/**"
  - "schemas/atm.broker-projection.v1.schema.json"
  - "tests/broker/atomic-projection-reconcile.test.ts"
  - "tests/cli/broker-projection-reconcile.test.ts"
deliverables:
  - "packages/core/src/broker/projections/**"
  - "packages/core/src/broker/reconcile/**"
  - "packages/cli/src/commands/broker/reconcile/**"
  - "schemas/atm.broker-projection.v1.schema.json"
  - "tests/broker/atomic-projection-reconcile.test.ts"
  - "tests/cli/broker-projection-reconcile.test.ts"
validators:
  - "node --strip-types tests/broker/atomic-projection-reconcile.test.ts"
  - "node --strip-types tests/cli/broker-projection-reconcile.test.ts"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_STATE_DIVERGENCE"
  - "ATM_BROKER_TICKET_STALE_GENERATION"
  - "ATM_ATOMIC_WRITE_RETRY_EXHAUSTED"
createdByCommand: atm plan card create
evidence:
  required: multiprocess-command-backed
producer:
  - "Canonical projection receipts and reconcile receipts."
consumer:
  - "ATM-GOV-0233"
missingData:
  - "Windows rename retry distribution must be observed rather than hardcoded from one workstation."
dataDrivenStopRule:
  - "Stop and trip queue-only if a projection can advance without a successful canonical ticket CAS."
  - "Stop if reconcile mutates history without an auditable receipt."
out_of_scope:
  - "No scope inference or runner-sync lifecycle."
  - "No deletion of legacy BCR files in this card."
rollback:
  strategy: circuit-breaker-and-revert
  notes: "Trip to queue-only, preserve canonical tickets, then revert projection writers; readers remain fail closed on digest mismatch."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.projection-reconcile"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0228 Atomic broker projection and reconciliation

## Intent

把 queue、freeze、direction lock 與 BCR view 改成 canonical ticket 的原子 projection，並提供可重試 reconcile，使 BCR release order、queue acquisition 與 direction lock 不再各自演進。

## Required Work

- 每個 projection 寫入都帶 authority generation/digest、projection digest、watermark 與 terminal state。
- 使用 atomic replace/CAS；程序中止後由 reconcile 比對 canonical authority，重建或 quarantine。
- successor wakeup 必須 single-flight 且冪等，避免重複喚醒或 starvation。
- circuit breaker 在任何 split-brain 時自動 trip `queue-only`。

## Acceptance

- [ ] 破壞測試涵蓋寫到一半中止、CAS race、重複 reconcile、Windows sharing violation。
- [ ] 不可能同時出現兩個有效 publisher generation。
- [ ] stale projection 不能授權，reconcile 後 canonical state 與全部 views 一致。
- [ ] queue-only trip 保留 ticket/proposal/evidence，沒有 silent loss。
- [ ] source 與 frozen `node atm.mjs` 對相同 projection/reconcile probe 的 canonical behavior projection digest 一致，runner digest 已封存。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:28.841Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0228-atomic-broker-projection-and-reconciliation.task.md","contentDigest":"sha256:279c91450a83ed76e972186cb93204fc5420449c58b6059840da21434aed4b19"} -->
