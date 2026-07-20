---
task_id: ATM-GOV-0216
title: Unified parallel admission policy
status: planned
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0215"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "packages/core/src/broker/parallel-admission-policy.ts"
  - "packages/cli/src/commands/broker/policy-actions.ts"
  - "schemas/governance/parallel-admission-policy.schema.json"
  - "tests/cli/broker-parallel-admission-policy.test.ts"
  - "docs/governance/parallel-governance-charter.md"
deliverables:
  - "packages/core/src/broker/parallel-admission-policy.ts"
  - "packages/cli/src/commands/broker/policy-actions.ts"
  - "schemas/governance/parallel-admission-policy.schema.json"
  - "tests/cli/broker-parallel-admission-policy.test.ts"
  - "docs/governance/parallel-governance-charter.md"
validators:
  - "node --strip-types tests/cli/broker-parallel-admission-policy.test.ts"
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
  - "ATM-GOV-0216 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.parallel-admission-policy"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
---

# ATM-GOV-0216 Unified parallel admission policy

## Intent

建立唯一的平行准入政策面，提供 `broker parallel-admission status/set/trip/reset`，讓 R3/R4 shared-write gate 回 canonical ticket/status/recovery；R1/R2 仍是不可協商硬例外。

## Required Work

- 新增 `atm.parallelAdmissionPolicy.v1`，含 mode、circuit breaker、fallbackMode、rollout scope、config digest、trip/reset evidence。
- 新增 status/set/trip/reset CLI，所有寫入都有 receipt 與 rollback command。
- 把 runner-sync、build、release mirror、projection、generated writes、checkpoint、closeback、git commit 接到同一 policy adapter。
- 任何安全、正確性、可觀測性或效能 gate failure 自動 trip 到 queue-only。

## Acceptance

- [ ] policy schema/CLI/status fixture 通過，預設 circuit breaker enabled、fallbackMode queue-only。
- [ ] 所有 0215 coverage matrix gate 都有 owner、adapter、statusCommand、nextAction、recovery command。
- [ ] R1 同卡第二 lane 與 R2 dependency gate 測試證明不能被 policy set 放寬。
- [ ] trip 後 shared-write gate 退回 queue-only，reset 必須引用新 passing evidence digest。

## Verification

```bash
node --strip-types tests/cli/broker-parallel-admission-policy.test.ts
npm run validate:schemas
npm run validate:broker-registry
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- atm.parallelAdmissionPolicy.v1
- node atm.mjs broker parallel-admission status|set|trip|reset --json

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:47:49.497Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0216-unified-parallel-admission-policy.task.md","contentDigest":"sha256:cea8be1071ecca5ed31d264455c33ab9a08633e8951d521f4c00faed54546d61"} -->
