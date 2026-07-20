---
task_id: ATM-GOV-0213
title: CID and read set semantic revalidation adjudicator
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0208
  - ATM-GOV-0209
  - ATM-GOV-0211
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan with semantic revalidation so textually applicable proposals cannot publish from stale reasoning.
scopePaths:
  - packages/core/src/broker/semantic-adjudication/**
  - packages/core/src/broker/semantic-contract.ts
  - packages/core/src/broker/policy.ts
  - schemas/governance/semantic-revalidation.schema.json
  - schemas/governance/write-intent.schema.json
  - schemas/governance/patch-proposal.schema.json
  - tests/core/broker-semantic-revalidation.test.ts
  - tests/core/broker-cid-operation-algebra.test.ts
deliverables:
  - packages/core/src/broker/semantic-adjudication/**
  - packages/core/src/broker/semantic-contract.ts
  - schemas/governance/semantic-revalidation.schema.json
  - tests/core/broker-semantic-revalidation.test.ts
  - tests/core/broker-cid-operation-algebra.test.ts
validators:
  - node --strip-types tests/core/broker-semantic-revalidation.test.ts
  - node --strip-types tests/core/broker-cid-operation-algebra.test.ts
  - npm run validate:broker-proposal
  - npm run validate:schemas
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Declared read-set contract, operation algebra, semantic dependency classification, revalidation result, and broker ticket-transition request.
consumer:
  - ATM-GOV-0214 shared delivery saga
  - ATM-GOV-0199 correctness adjudication
  - ATM-GOV-0198 plan executor
missingData:
  - Real read-set completeness, semantic validator availability, stale-reasoning frequency, and adapter operation-algebra coverage must be reported as partial/missing by domain.
dataDrivenStopRule:
  - Stop if text rebase, patch applicability, or validator absence is treated as semantic success.
  - Stop if read observation itself is queued or if docs/private work is blocked by foreign writes.
  - Stop if noncommutative rename/delete/modify operations are auto-composed without adapter-declared pre/postconditions and a passing revalidation oracle.
out_of_scope:
  - No patch application, queue fairness implementation, live commit/update-ref, build, projection, checkpoint, closeback, or push.
rollback:
  strategy: circuit-breaker
  notes: Disable semantic auto-admit, preserve revalidation evidence, route affected code-publish tickets to queue/steward review, and leave reads/docs/private work available.
atomizationImpact:
  ownerAtomOrMap: atom-core-broker
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.broker-semantic-adjudicator
      pattern: Policy Object
      source: packages/core/src/broker/semantic-adjudication/policy.ts
      disposition: extract
      inlineReason: null
    - atom: atm.broker-semantic-result
      pattern: Result Contract Object
      source: packages/core/src/broker/semantic-contract.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: broker-semantic-adjudication
---

# ATM-GOV-0213 CID and read set semantic revalidation adjudicator

## Intent

補上 compose-first 最容易被忽略的語意層：A/B 都從 base X 推理時，A 發布後即使 B 的寫入區間與 A 不重疊，B 讀過的內容也可能已失效。任何 declared read-set 與最新 published write-set 相交的提案，都必須重新執行語意驗證；只有文字 rebase 或 patch 套得上不能通過。

## Required Work

- read-set 使用 0208 content anchors 與 0209 versioned resource facts，保存用途/provenance/confidence；不得只存檔名或行號。
- adapter 宣告 operation semantics：commutative、associative、precedence、rename、delete、modify、read/write 與 required pre/postconditions；未知預設需 revalidation/queue。
- revalidation 比較 sealed base、current tree、published write-set、proposal assumptions/postconditions 與 targeted validators，輸出 `valid|recompute-required|queue-required|steward-required|inconclusive` facts。
- 上述結果映射為 0211 現有 queue/batch ticket transition，不建立第四種頂層 disposition或新 ErrorCode。
- reads 自身不排隊；R2 只阻止尚未重新驗證的 code side effect，docs/planning/private evidence 繼續。

## Acceptance

- [ ] disjoint write/write 但 read/write 相交的 stale-reasoning fixture 必須重新驗證，不可直接 publish。
- [ ] rename+modify、delete+modify、commutative scalar、same CID disjoint anchor 與 validator unavailable 均有 deterministic adjudication。
- [ ] revalidation result 包含 base/current/published-set digest、assumptions、validator refs 與具體 ticket next action。
- [ ] reads/docs/private work 從不因 revalidation 排隊；code publish 在 inconclusive 時不通過。
- [ ] focused semantic tests、broker proposal/schema validators與 typecheck 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:46.455Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0213-cid-and-read-set-semantic-revalidation-adjudicator.task.md","contentDigest":"sha256:9d75df67e55a31d065757d4794d5b8db392837105e39e8c03184fae05695d23c"} -->
