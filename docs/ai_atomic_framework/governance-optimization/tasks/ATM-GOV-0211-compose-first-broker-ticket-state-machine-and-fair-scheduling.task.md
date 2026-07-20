---
task_id: ATM-GOV-0211
title: Compose first broker ticket state machine and fair scheduling
status: done
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0206
  - ATM-GOV-0207
  - ATM-GOV-0209
  - ATM-GOV-0210
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan with the missing INV-ATM-008 decision-to-ticket lifecycle and compose-first scheduling policy.
scopePaths:
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/decision/**
  - packages/core/src/broker/shared-surface-queue.ts
  - packages/core/src/broker/related-task-batching.ts
  - packages/core/src/broker/wave-broker-scheduler.ts
  - packages/core/src/broker/ticket-state.ts
  - packages/core/src/broker/ticket-policy.ts
  - packages/cli/src/commands/broker/shared-surface.ts
  - packages/cli/src/commands/broker/registry-actions.ts
  - packages/cli/src/commands/broker/persistence.ts
  - schemas/governance/broker-ticket.schema.json
  - schemas/governance/broker-decision.schema.json
  - tests/cli/compose-first-ticket-state-machine.test.ts
  - tests/cli/broker-ticket-fairness-scale.test.ts
deliverables:
  - packages/core/src/broker/ticket-state.ts
  - packages/core/src/broker/ticket-policy.ts
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/shared-surface-queue.ts
  - packages/cli/src/commands/broker/shared-surface.ts
  - packages/cli/src/commands/broker/registry-actions.ts
  - schemas/governance/broker-ticket.schema.json
  - schemas/governance/broker-decision.schema.json
  - tests/cli/compose-first-ticket-state-machine.test.ts
  - tests/cli/broker-ticket-fairness-scale.test.ts
validators:
  - node --strip-types tests/cli/compose-first-ticket-state-machine.test.ts
  - node --strip-types tests/cli/broker-ticket-fairness-scale.test.ts
  - node --strip-types tests/cli/durable-broker-scheduler.test.ts
  - npm run validate:schemas
  - npm run validate:brokered-write
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Durable execute/queue/batch ticket lifecycle, compose batch strategy, per-resource queue, fairness policy, wakeup protocol, and 0206 live-activation receipt.
consumer:
  - ATM-GOV-0212 transactional composer
  - ATM-GOV-0213 semantic adjudicator
  - ATM-GOV-0214 shared delivery saga
  - ATM-GOV-0198 plan executor
  - ATM-GOV-0199 broker outcome telemetry
  - ATM-GOV-0201 runner build dogfood
  - ATM-GOV-0203 first-layer UX
missingData:
  - Queue depth, bypass, wakeup, starvation, and compose-candidate distributions at 100+ captains are unavailable until scale fixtures and dogfood run.
dataDrivenStopRule:
  - Stop if any cross-task shared-write conflict can still end in a bare refusal or terminal blocked lane outside R1-R4.
  - Stop if reads, docs, planning, private evidence, or isolated proposal work enters the shared-write queue.
  - Stop if fairness requires hard-coded task ids, path families, queue depths, delays, or string-specific branches rather than schema/config/observed policy.
  - Stop live activation if 0206 shadow facts and structured-overlap facts disagree or the ticket store is not linearizable.
out_of_scope:
  - No patch composition algorithm, semantic correctness decision, commit, build, projection, checkpoint, closeback, or push.
rollback:
  strategy: circuit-breaker-and-serial-drain
  notes: Disable compose batch eligibility, preserve all durable tickets and ordering evidence, drain existing tickets through queue mode without deleting or reordering entries, and keep 0206 matcher in shadow.
atomizationImpact:
  ownerAtomOrMap: atom-core-broker
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.broker-ticket-state
      pattern: Result Contract Object
      source: packages/core/src/broker/ticket-state.ts
      disposition: extract
      inlineReason: null
    - atom: atm.compose-first-admission-policy
      pattern: Policy Object
      source: packages/core/src/broker/ticket-policy.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: broker-ticket-scheduler
completed_at: "2026-07-20T09:02:21.120Z"
completed_by_agent: "codex-captain-0211"
closedAt: "2026-07-20T09:02:21.120Z"
closedByActor: "codex-captain-0211"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T09-02-21-120Z-close-536a17415336"
lastTransitionAt: "2026-07-20T09:02:21.120Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "49011a5414f0619b0d69931e2a46f62ae6e09cf0"
---

# ATM-GOV-0211 Compose first broker ticket state machine and fair scheduling

## Intent

把不同入口散落的 block/queue/register 行為收斂成 INV-ATM-008 的 durable ticket state machine。頂層只有 execute、queue、batch；compose 是 related-task batch 的 apply strategy。不同卡遇到 overlap 必須先進 compose adjudication，證據不足或不安全才 queue，不能回裸拒絕。

## Required Work

- canonical decision 一次回傳 allowed private paths、execute tickets、compose-batch candidates、queued tickets、R1 terminal fence 與 R2 dependency code gate；next/Team/register/taskflow 共用。
- legacy parallel preflight 必須改為 canonical decision 的 fact adapter，不能在 broker registration/ticket issuance 前先 throw；registry ownership 只保留 ticket 已允許的 private/shared resources，queued shared resources 不得假裝成 active owner 而阻塞後續 contender。
- ticket lifecycle 至少含 created、collecting、ready、composing、revalidation-required、queued、wakeup-pending、executing、released、cancelled、adoptable、reconcile-required 與 terminal；每次 transition 有 generation CAS 與 event idempotency key。
- queue position 必須依排序後真位置計算；release 後自動 rearbitrate，single-flight 喚醒下一 eligible ticket，不要求人工重跑 CLI。
- deterministic aging、bounded bypass、partial compose、TTL/adopt/cancel 與 backoff 使用 versioned policy/config；保存 decision trace、`waitedMs` 與 fairness counters。
- fairness policy必須宣告arrival model、`maxBypassCount`、`maxEligibleWaitMs`或等價wakeup-cycle bound、seed與observation horizon；數值由versioned config/profile決定，不能埋在scheduler control flow。
- 0206 可以先 shadow；只有本卡的 durable ticket transition 已通過後，pattern-aware matcher 才能 live-enable compose/queue routing。不得 live-enable成 terminal block。

## Scale Cohort

- 2/4/8/16/32/64/100/128 captains，涵蓋 disjoint、same-file disjoint anchors、ambiguous anchors、commutative/noncommutative CID、generated/shared build surface。
- 驗證 bounded wait、零 starvation、零 duplicate wakeup、queue position 不無故倒退、partial compose 後剩餘 ticket 持續前進。

## Acceptance

- [ ] 所有 shared-write gates 回 execute/queue/batch ticket；compose 只作 batch strategy，queue/adjudication 狀態不新增 ErrorCode。
- [ ] release 後下一 ticket 自動 rearbitrate/wakeup，沒有人工 CLI retry。
- [ ] 100+ captains fixture 無 starvation、duplicate wakeup、thundering herd 或 lost ticket。
- [ ] 每張eligible ticket都在sealed policy bound內進入executing/released，或帶合法cancelled/reconcile/terminal reason；fixture逐ticket驗證arrival、bypass、wait、seed與observation horizon，不以有限run中「沒看到餓死」代替bound。
- [ ] R1 hard reject、R2 code-only gate、R3 related-task batching、R4 docs exclusion 均有 E2E。
- [ ] 0206 live activation 由本卡 feature gate 控制；本卡前只能 shadow。
- [ ] focused scheduler tests、brokered-write、typecheck 與 validate:cli 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:41.541Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0211-compose-first-broker-ticket-state-machine-and-fair-scheduling.task.md","contentDigest":"sha256:de359ff5527742022a01c6155f54960249184a4027cf94ef5b3b7449b1421291"} -->
