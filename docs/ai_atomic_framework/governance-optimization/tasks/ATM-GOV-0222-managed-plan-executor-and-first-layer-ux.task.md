---
task_id: ATM-GOV-0222
title: Managed plan executor and first-layer UX
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0216"
  - "ATM-GOV-0217"
  - "ATM-GOV-0218"
  - "ATM-GOV-0219"
  - "ATM-GOV-0220"
  - "ATM-GOV-0221"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "packages/cli/src/commands/batch/plan-executor.ts"
  - "packages/core/src/batch/plan-run-journal.ts"
  - "packages/cli/src/commands/guide.ts"
  - "packages/cli/src/commands/next/result-compaction.ts"
  - "templates/skills/atm-governance-router.skill.md"
  - "tests/cli/managed-plan-executor.test.ts"
  - "tests/cli/first-layer-ux-routing.test.ts"
  - "tests/cli/adopter-compose-first-default.test.ts"
deliverables:
  - "packages/cli/src/commands/batch/plan-executor.ts"
  - "packages/core/src/batch/plan-run-journal.ts"
  - "packages/cli/src/commands/guide.ts"
  - "packages/cli/src/commands/next/result-compaction.ts"
  - "templates/skills/atm-governance-router.skill.md"
  - "tests/cli/managed-plan-executor.test.ts"
  - "tests/cli/first-layer-ux-routing.test.ts"
  - "tests/cli/adopter-compose-first-default.test.ts"
validators:
  - "node --strip-types tests/cli/managed-plan-executor.test.ts"
  - "node --strip-types tests/cli/first-layer-ux-routing.test.ts"
  - "node --strip-types tests/cli/adopter-compose-first-default.test.ts"
  - "npm run validate:guidance"
  - "npm run validate:skill-templates"
  - "npm run validate:integration-adapter"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0222 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.managed-plan-executor"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T18:04:36.797Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T18:04:36.797Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T18-04-36-797Z-close-f11c4ca3c708"
lastTransitionAt: "2026-07-20T18:04:36.797Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "eb43c47ae08f810e277652bd76fc3ea98c21ea1e"
---

# ATM-GOV-0222 Managed plan executor and first-layer UX

## Intent

提供可續跑 `batch execute-plan --execute`，統一 claim、worker、ticket、compose、validator、checkpoint、closeback；功能閘門過後同版切 framework/adopter compose-first 預設。

## Required Work

- executor 使用既有 task import/taskflow/broker tickets，不建立第二任務模型。
- 支援繁中 audit/backlog/closeout 路由、精簡 orientation、Windows-safe command renderer。
- 新 adopter 直接 compose-first + circuit breaker enabled；既有 adopter 透過 migration command 拿 receipt。
- 提供一鍵 rollback queue-only。
- 技能模板與所有 adapter parity 同步。

## Acceptance

- [ ] crash/resume 不重複 claim/ticket/commit/close。
- [ ] first-layer UX 對 audit/backlog/closeout/執行計畫 回正確 command。
- [ ] 功能閘門過後預設 compose-first，失敗自動 queue-only。
- [ ] new install / upgrade / rollback adopter 均有 receipt。

## Verification

```bash
node --strip-types tests/cli/managed-plan-executor.test.ts
node --strip-types tests/cli/first-layer-ux-routing.test.ts
node --strip-types tests/cli/adopter-compose-first-default.test.ts
npm run validate:guidance
npm run validate:skill-templates
npm run validate:integration-adapter
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- batch execute-plan --execute
- compose-first adopter migration receipt

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:16.291Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0222-managed-plan-executor-and-first-layer-ux.task.md","contentDigest":"sha256:5ceff81df83a08be42fd631803e928277b50fb0059f9c1c4bc69b40f9d124edf"} -->
