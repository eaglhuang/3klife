---
task_id: ATM-GOV-0233
title: Transactional ticket completion and legacy BCR migration
status: planned
owner: atm-broker
priority: P0
milestone: ATM-3.0-D
severity: P0
depends_on:
  - ATM-GOV-0228
  - ATM-GOV-0229
  - ATM-GOV-0230
  - ATM-GOV-0231
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the shared-delivery terminal saga and governed migration of legacy broker state."
scopePaths:
  - "packages/core/src/broker/lifecycle/**"
  - "packages/cli/src/commands/broker-conflict-resolution.ts"
  - "packages/cli/src/commands/next/claim-parallel-preflight.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "packages/cli/src/commands/broker/migrate/**"
  - "packages/cli/src/commands/broker/reconcile/**"
  - "tests/cli/transactional-ticket-completion.test.ts"
  - "tests/cli/legacy-bcr-migration.test.ts"
  - "tests/cli/legacy-bcr-migration-rollback.test.ts"
  - "tests/cli/single-successor-wakeup.test.ts"
  - "tests/cli/broker-authorization-consumer-migration.test.ts"
deliverables:
  - "packages/core/src/broker/lifecycle/**"
  - "packages/cli/src/commands/broker-conflict-resolution.ts"
  - "packages/cli/src/commands/next/claim-parallel-preflight.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "packages/cli/src/commands/broker/migrate/**"
  - "tests/cli/transactional-ticket-completion.test.ts"
  - "tests/cli/legacy-bcr-migration.test.ts"
  - "tests/cli/legacy-bcr-migration-rollback.test.ts"
  - "tests/cli/single-successor-wakeup.test.ts"
  - "tests/cli/broker-authorization-consumer-migration.test.ts"
validators:
  - "node --strip-types tests/cli/transactional-ticket-completion.test.ts"
  - "node --strip-types tests/cli/legacy-bcr-migration.test.ts"
  - "node --strip-types tests/cli/legacy-bcr-migration-rollback.test.ts"
  - "node --strip-types tests/cli/single-successor-wakeup.test.ts"
  - "node --strip-types tests/cli/broker-authorization-consumer-migration.test.ts"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_STATE_DIVERGENCE"
  - "ATM_TICKET_ADOPT_REQUIRED"
  - "ATM_TICKET_CANCEL_REQUIRED"
  - "ATM_SIDE_EFFECT_RECONCILE_REQUIRED"
  - "ATM_BROKER_AUTHORIZATION_DIMENSION_MISMATCH"
createdByCommand: atm plan card create
evidence:
  required: multiprocess-command-backed
producer:
  - "Terminal lifecycle receipts, migration receipts and authorization-zero census."
consumer:
  - "ATM-GOV-0234"
missingData:
  - "Legacy sidecars may lack canonical ticket references; migration must quarantine ambiguous records instead of guessing."
  - "A migration cannot be rollout-ready until pre-migration snapshot and rollback round-trip digests are observed."
dataDrivenStopRule:
  - "Stop if migration deletes evidence, manufactures a canonical mapping, or authorizes from a legacy field."
  - "Stop and trip queue-only on duplicate publisher, duplicate wakeup or terminal authorization count above zero."
  - "Stop if migration apply has no immutable rollback receipt or if rollback requires manual runtime edits."
out_of_scope:
  - "No manual runtime deletion."
  - "No performance claim; ATM-GOV-0234 owns measurement."
rollback:
  strategy: circuit-breaker-and-revert
  notes: "Trip queue-only and use broker migrate --rollback <receiptDigest> before code revert. Retain immutable pre/post receipts and canonical tickets; apply/rollback must be idempotently reversible as projection state."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.shared-delivery-lifecycle"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.broker.legacy-bcr-reader"
      pattern: "Legacy BCR compatibility reader and migrator"
      source: "packages/cli/src/commands/broker-conflict-resolution.ts"
      disposition: extract
    - atom: "atm.git-governance.authorization-consumer"
      pattern: "Ticket-scoped authorization adapter"
      source: "packages/cli/src/commands/git-governance/implementation.ts"
      disposition: extract
---

# ATM-GOV-0233 Transactional ticket completion and legacy BCR migration

## Intent

把 canonical ticket、scope closure、runner-sync 與 recovery manifest 接成一個 terminal saga，並透過正式 CLI 處置舊 BCR。完成後，BCR 只保存歷史判斷，不再保存活的 write entitlement。

## Required Work

- terminal transition 與 projection revoke 使用同一 generation/CAS；crash 後 reconcile exactly once。
- complete/cancel/expire/adopt/publish/release/wakeup 重複呼叫結果穩定。
- migrate CLI 支援 status、dry-run、apply、immutable pre-migration snapshot receipt 與 `--rollback <receiptDigest>`；ambiguous legacy record quarantine 並 trip queue-only。
- migration apply/rollback 使用同一 receipt generation，皆可重試且 exactly-once；rollback 後 canonical state digest 必須等於 pre-migration digest，append-only audit metadata 除外。
- 盤點並遷移所有 legacy authorization 消費端，包括 claim parallel preflight、claim admission 與 Git commit gate；不得再把 BCR 的 `blockedTaskIds` 或其他 task-id set 當成跨資源授權。
- 每個消費端逐筆驗證 canonical ticket grant 的 resource dimension、normalized keys、operation、consumer gate 與 generation/digest；維度不符時 emit 正式 ErrorCode 與 re-arbitration manifest。
- 以歷史三張 BCR 作資料 fixture，演算法不得識別其 id/task/path。
- closure packet 只封裝 task-owned commit slice，並以同一 generation 的 git-head evidence 驗證 changed-files、tree、parents 與 command runs；不得從移動中的整體工作樹推導 task delta。

## Acceptance

- [ ] observed publish order 與 release projection 來自同一 generation，不能分歧。
- [ ] 兩個 terminal tasks 對應的 active authorization count 為 0。
- [ ] file/path grant 無法抑制 atom id/CID admission block，atom grant 無法授權無關 Git path/surface；所有 legacy CLI 消費端皆通過 migration fixtures。
- [ ] production authorization path 不再存在只回傳或只消費 foreign task-id set 的 helper。
- [ ] migration 重跑不重複 side effect，歷史 evidence 可追溯。
- [ ] apply 後 fault injection 可由正式 rollback CLI 復原；重複 apply/rollback 結果穩定，round-trip state digest 一致，不需手改 `.atm`。
- [ ] publisher crash 後只有一個 successor wakeup，無 starvation。
- [ ] 並行 commit 穿插時，pre-close 即拒絕 mixed closure packet；合法 packet 可通過 commit-range pre-push，不需 emergency repair。
- [ ] source 與 frozen `node atm.mjs` 對相同 terminal/migration/closure probe 的 canonical behavior projection digest 一致，runner digest 已封存。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:43.039Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0233-transactional-ticket-completion-and-legacy-bcr-migration.task.md","contentDigest":"sha256:d53021e8d2c9cc8c93f577215a2b741359733af29f3606fd778b8b92710970c9"} -->
