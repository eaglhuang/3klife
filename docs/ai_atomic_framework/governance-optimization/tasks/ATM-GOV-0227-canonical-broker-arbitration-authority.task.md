---
task_id: ATM-GOV-0227
title: Canonical broker arbitration authority
status: planned
owner: atm-broker
priority: P0
milestone: ATM-3.0-B
severity: P0
depends_on:
  - ATM-GOV-0226
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns canonical shared-write arbitration and INV-ATM-008 enforcement."
scopePaths:
  - "packages/core/src/broker/contracts/**"
  - "packages/core/src/broker/ticket-authority/**"
  - "packages/core/src/schemas/broker-ticket.ts"
  - "schemas/atm.broker-ticket.v1.schema.json"
  - "tests/broker/canonical-arbitration-authority.test.ts"
  - "tests/broker/terminal-ticket-authorization.test.ts"
deliverables:
  - "packages/core/src/broker/contracts/**"
  - "packages/core/src/broker/ticket-authority/**"
  - "schemas/atm.broker-ticket.v1.schema.json"
  - "tests/broker/canonical-arbitration-authority.test.ts"
  - "tests/broker/terminal-ticket-authorization.test.ts"
validators:
  - "node --strip-types tests/broker/canonical-arbitration-authority.test.ts"
  - "node --strip-types tests/broker/terminal-ticket-authorization.test.ts"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_STATE_DIVERGENCE"
  - "ATM_BROKER_TICKET_STALE_GENERATION"
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "Canonical ticket authority and terminal authorization contract."
consumer:
  - "ATM-GOV-0228"
missingData:
  - "Existing BCR fields must be inventoried before choosing a compatibility projection."
dataDrivenStopRule:
  - "Stop if implementation introduces a second writable registry or lets currentAllowedTaskId authorize without ticket generation verification."
  - "Stop if a terminal ticket can still pass any shared-write gate."
out_of_scope:
  - "No legacy runtime migration; ATM-GOV-0233 owns migration."
  - "No queue/freeze/direction-lock storage rewrite; ATM-GOV-0228 owns projection mechanics."
rollback:
  strategy: circuit-breaker-and-revert
  notes: "Trip parallel admission to queue-only before reverting the contract implementation."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.ticket-authority"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0227 Canonical broker arbitration authority

## Intent

讓 `atm.brokerTicket.v1` 成為 shared-write 仲裁的唯一可寫 authority。BCR、release order 或 direction metadata 若沒有相同 ticket generation 與 digest，只能作診斷，不得授權。

## Required Work

- 定義 ticket generation、authority digest、terminal authorization 與 compatible projection contract。
- 移除 BCR sidecar 的獨立授權語意；保留相容讀取時必須驗證 canonical ticket。
- 讓 execute/queue/batch 與 compose apply strategy 沿用現有模型，不新增 verdict 或任務模型。

## Acceptance

- [ ] 任一 shared-write authorization 可反查唯一 canonical ticket id/generation/digest。
- [ ] completed/cancelled/expired ticket 在所有 gate 都 fail closed，不能被 stale BCR 復活。
- [ ] schema、TypeScript contract 與 tests 同版，`additionalProperties` 無漂移。
- [ ] INV-ATM-008 與 INV-ATM-009 測試通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:26.017Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0227-canonical-broker-arbitration-authority.task.md","contentDigest":"sha256:4126e1c34b1eef3a318da3e38802c121f55f5ca3dcf4917b763875f85fd1107f"} -->
