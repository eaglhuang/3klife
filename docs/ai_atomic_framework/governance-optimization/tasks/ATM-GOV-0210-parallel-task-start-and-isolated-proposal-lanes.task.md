---
task_id: ATM-GOV-0210
title: Parallel task start and isolated proposal lanes
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0207
  - ATM-GOV-0209
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan so different task cards can begin work even when their declared scopes overlap.
scopePaths:
  - packages/cli/src/commands/next/claim-admission.ts
  - packages/cli/src/commands/next/claim-parallel-preflight.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/next/claim-helpers.ts
  - packages/cli/src/commands/next/broker-queue-admission.ts
  - packages/cli/src/commands/next/proposal-lane.ts
  - packages/cli/src/commands/broker/proposal-actions.ts
  - packages/core/src/broker/proposal.ts
  - schemas/governance/proposal-lane.schema.json
  - tests/cli/parallel-proposal-lane-admission.test.ts
deliverables:
  - packages/cli/src/commands/next/proposal-lane.ts
  - packages/cli/src/commands/broker/proposal-actions.ts
  - schemas/governance/proposal-lane.schema.json
  - tests/cli/parallel-proposal-lane-admission.test.ts
validators:
  - node --strip-types tests/cli/parallel-proposal-lane-admission.test.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/claim-admission-broker-parity.spec.ts
  - npm run validate:broker-proposal
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Canonical isolated proposal-lane lifecycle and claim admission that separates task start/private work from shared publish authority.
consumer:
  - ATM-GOV-0211 compose-first ticket state machine
  - ATM-GOV-0198 true plan executor loop
missingData:
  - Real proposal-lane abandonment, stale-base, and conversion-to-ticket rates are unavailable until live dogfood and must remain source-unavailable.
dataDrivenStopRule:
  - Stop if different task cards are still rejected solely because scope paths, atoms, or CIDs overlap before a structured write proposal exists.
  - Stop if isolated proposal work can mutate the live index, shared source, release mirror, build output, projection, or another lane's private state.
  - Stop if the change weakens R1 same-task fencing or R2 dependency semantics for code side effects.
out_of_scope:
  - No ticket fairness, compose selection, patch apply, commit, build, projection, checkpoint, close, or push.
rollback:
  strategy: revert-commit
  notes: Disable proposal-lane admission, preserve sealed proposals for audit, keep reads/docs/private evidence available, and return shared code writes to the existing broker path without deleting foreign work.
atomizationImpact:
  ownerAtomOrMap: atm.next-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.isolated-proposal-lane
      pattern: Facade
      source: packages/cli/src/commands/next/proposal-lane.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: proposal-lane
---

# ATM-GOV-0210 Parallel task start and isolated proposal lanes

## Intent

讓不同任務卡先各自 claim/讀取/規劃並在隔離 proposal lane 產生 patch intent，即使 task-card scope、檔案或 CID 有交集也不在 task start 階段被 blanket reject。只有 shared code side effect 需要 broker ticket；R1 同卡第二 lane 與 R2 真 semantic dependency 仍依憲章處理。

## Required Work

- claim preflight 把 `task-start/private-work` 與 `shared-publish` 拆成不同權限；foreign overlap 只要求 isolated proposal，不回 terminal shared-write refusal。
- proposal lane 有 task/actor/lane/base digest、allowed private paths、candidate shared surfaces、heartbeat/TTL、seal/cancel/adopt 與 durable proposal ref。
- proposal lane 禁止 live index、shared source、build/release/projection、commit、close/push；只能寫自身 runtime proposal/evidence/session。
- dependency 未 ready 時只阻擋依賴輸出的 code mutation；read/docs/planning/proposal 仍可進行。
- next/Team/broker register 使用同一 transaction authority 與 structured overlap input，不保留 legacy CID prose-only hard block。

## Acceptance

- [ ] 不同卡 disjoint、same-file disjoint、same-file ambiguous、CID overlap 都能建立各自 isolated proposal lane。
- [ ] R1 同卡第二 lane 仍穩定 `ATM_LOCK_CONFLICT`；合法 adopt/takeover 可接手原 lane。
- [ ] R2 dependency 只擋 code side effect，docs/read/proposal 不排隊。
- [ ] proposal lane 無法改 live source/index/build/release/projection 或執行 commit/close/push。
- [ ] claim admission parity、broker proposal、typecheck 與 validate:cli 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:39.104Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0210-parallel-task-start-and-isolated-proposal-lanes.task.md","contentDigest":"sha256:ed83c7c33b815ca8226568573e89996fef47d46328178957fc382415c0bd0f77"} -->
