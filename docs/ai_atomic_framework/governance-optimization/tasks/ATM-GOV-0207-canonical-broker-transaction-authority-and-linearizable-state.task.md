---
task_id: ATM-GOV-0207
title: Canonical broker transaction authority and linearizable state
status: done
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0196
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan with the canonical transaction authority required before multi-captain broker state can be trusted.
scopePaths:
  - packages/core/src/broker/registry.ts
  - packages/core/src/broker/lifecycle.ts
  - packages/core/src/broker/transaction-authority.ts
  - packages/core/src/broker/registry-store.ts
  - packages/cli/src/commands/broker/registry-actions.ts
  - packages/cli/src/commands/broker/persistence.ts
  - schemas/governance/broker-transaction.schema.json
  - tests/cli/broker-transaction-authority.test.ts
  - tests/cli/broker-registry-concurrency.test.ts
deliverables:
  - packages/core/src/broker/transaction-authority.ts
  - packages/core/src/broker/registry-store.ts
  - packages/cli/src/commands/broker/registry-actions.ts
  - packages/cli/src/commands/broker/persistence.ts
  - schemas/governance/broker-transaction.schema.json
  - tests/cli/broker-transaction-authority.test.ts
  - tests/cli/broker-registry-concurrency.test.ts
validators:
  - node --strip-types tests/cli/broker-transaction-authority.test.ts
  - node --strip-types tests/cli/broker-registry-concurrency.test.ts
  - node --strip-types scripts/validate-broker-registry.ts
  - npm run validate:schemas
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Versioned broker transaction authority, generation CAS, corruption-safe store, and same-task lane fence shared by every broker entrypoint.
consumer:
  - ATM-GOV-0208 content-anchor base authority
  - ATM-GOV-0209 versioned read/write sets
  - ATM-GOV-0210 isolated proposal lanes
  - ATM-GOV-0211 durable ticket state machine
missingData:
  - Current multi-process lost-update frequency and Windows rename/lock contention distribution must be measured in isolated repositories; absence of an observed incident is not proof of linearizability.
dataDrivenStopRule:
  - Stop if the design creates a second broker registry or independent lifecycle authority instead of versioning the existing canonical store.
  - Stop if any parse, checksum, or partial-write failure can still be interpreted as an empty healthy registry.
  - Stop if same-task fencing differs between next claim, broker register, Team, and batch entrypoints.
out_of_scope:
  - No overlap classification, compose policy, queue fairness, patch application, commit, or push behavior.
  - No manual rewrite of .atm runtime or history state.
rollback:
  strategy: revert-commit
  notes: Disable the new authoritative writer, replay acknowledged transaction receipts into the previous snapshot format at a sealed watermark, preserve the journal for diagnosis, and never run two authoritative writers concurrently.
atomizationImpact:
  ownerAtomOrMap: atom-core-broker
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.broker-transaction-authority
      pattern: Policy Object
      source: packages/core/src/broker/transaction-authority.ts
      disposition: extract
      inlineReason: null
    - atom: atm.broker-linearizable-store
      pattern: Adapter/Port
      source: packages/core/src/broker/registry-store.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: broker-state
completed_at: "2026-07-20T07:52:30.383Z"
completed_by_agent: "codex-captain-0207"
closedAt: "2026-07-20T07:52:30.383Z"
closedByActor: "codex-captain-0207"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T07-52-30-306Z-close-0323e3f6572b"
lastTransitionAt: "2026-07-20T07:52:30.383Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "07a24ae13c0ef61494616bb37dac365bf1d915eb"
---

# ATM-GOV-0207 Canonical broker transaction authority and linearizable state

## Intent

建立所有 broker/claim/Team/batch 入口共用的單一 transaction authority，修正現況 read-modify-write 無 CAS、跨程序可能 lost update、parse error 回空 registry，以及同卡 fence 在不同入口不一致的問題。這張卡只建立「誰有權改 broker state、以哪個 generation 改、如何證明已確認操作不會遺失」；不把 admission、compose 或 scheduler policy 混進 storage layer。

## Required Work

- registry snapshot 帶 monotonic generation、content digest 與 last committed transaction id；每個 mutation 使用 compare-and-swap 或等價的 linearizable critical section。
- acknowledged register/heartbeat/release/adopt 必須能由 durable transaction receipt 重放；重試使用 idempotency key，不重複建立 intent 或 release。
- corruption、truncated JSON、checksum mismatch、lock timeout 與 stale generation 一律 fail closed，並輸出 structured recovery facts；不得 parse-as-empty。
- R1 same-task second lane fence 在所有入口共用同一 policy；只有合法 TTL adopt、handoff token 或 takeover transition 可換 lane。
- 儲存策略與 retry/backoff 由 schema/config/observed policy 提供，不在控制流程硬寫路徑、actor、task id 或 magic timing。

## Verification Cohorts

- 1/16/64/128 processes 同時 register、heartbeat、release，固定 seed 並注入 read/write/fsync/rename/lock killpoints。
- 驗證每個 acknowledged mutation 都能在 journal/terminal record 重建，零 lost update、零 duplicate terminal transition、零 corruption-as-empty。
- Windows rename contention、stale writer、crash restart、same-task second lane 與合法 takeover 都有 isolated fixture。

## Acceptance

- [ ] next claim、broker register、Team 與 batch 共用 canonical authority 與 same-task fence；沒有旁路 writer。
- [ ] 128-process fixture 中 acknowledged transaction 可完整重建，lost/duplicate acknowledged mutation 為零。
- [ ] parse/checksum/partial-write failures 均 fail closed 並提供 recovery facts；沒有任何錯誤回空 healthy registry。
- [ ] CAS conflict 可安全重試，且 retry 不重複 intent、ticket、release 或 adopt transition。
- [ ] focused tests、broker registry validator、typecheck 與 validate:cli 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:31.811Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0207-canonical-broker-transaction-authority-and-linearizable-state.task.md","contentDigest":"sha256:a515b3e05772e1369a4d3dd0f3aa919278d356fd20474246ab2692f831a75790"} -->
