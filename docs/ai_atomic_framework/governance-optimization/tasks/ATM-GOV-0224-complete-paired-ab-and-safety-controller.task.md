---
task_id: ATM-GOV-0224
title: Complete paired AB and safety controller
status: planned
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0221"
  - "ATM-GOV-0222"
  - "ATM-GOV-0223"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "scripts/run-paired-ab-v4.ts"
  - "scripts/plan-performance-report-v4.ts"
  - "packages/core/src/broker/parallel-admission-policy.ts"
  - "artifacts/generated/atm-ab-v4/**"
  - "tests/cli/paired-ab-v4-safety-controller.test.ts"
  - "docs/reports/atm-2-1-paired-ab-v4.md"
deliverables:
  - "scripts/run-paired-ab-v4.ts"
  - "scripts/plan-performance-report-v4.ts"
  - "packages/core/src/broker/parallel-admission-policy.ts"
  - "artifacts/generated/atm-ab-v4/**"
  - "tests/cli/paired-ab-v4-safety-controller.test.ts"
  - "docs/reports/atm-2-1-paired-ab-v4.md"
validators:
  - "node --strip-types tests/cli/paired-ab-v4-safety-controller.test.ts"
  - "node --strip-types scripts/run-paired-ab-v4.ts --mode validate"
  - "npm run validate:operational-bench"
  - "npm run validate:rollout-metrics"
  - "npm run validate:telemetry"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0224 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.paired-ab-safety-controller"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
---

# ATM-GOV-0224 Complete paired AB and safety controller

## Intent

完成 4 arms x 7 scales x 5 contention classes x 3 repeats 的 420-cell paired A/B，並把安全 controller 接到 policy trip/reset。

## Required Work

- 四臂：serial、queue-only、ATM compose-first、traditional Git feature-branch+merge disposable fixture。
- AB/BA、相同 sealed base、硬體與設定；invalid cell 不算通過。
- 計算 makespan、throughput、cost ratio、correctness defects、coverage。
- 任何門檻失敗自動 trip queue-only；reset 必須引用新的 passing evidence digest。

## Acceptance

- [ ] 420 個有效 cells 全部存在。
- [ ] median makespan 改善 >=25%，active throughput 改善 >=25%，production cost ratio <=1.10。
- [ ] escaped conflict、silent overwrite、duplicate side effect、unresolved starvation 全為 0。
- [ ] coverage 100%，task summary 有 window/watermark/sealed digest。

## Verification

```bash
node --strip-types tests/cli/paired-ab-v4-safety-controller.test.ts
node --strip-types scripts/run-paired-ab-v4.ts --mode validate
npm run validate:operational-bench
npm run validate:rollout-metrics
npm run validate:telemetry
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- 420-cell paired AB summary
- automatic safety controller trip/reset

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:19.030Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0224-complete-paired-ab-and-safety-controller.task.md","contentDigest":"sha256:e6f9cbc7d02a7e19187a9677246ccd436659ede95cc3e266b789c27c4acfb016"} -->
