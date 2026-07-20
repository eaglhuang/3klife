---
task_id: ATM-GOV-0223
title: Real multi-process and multi-agent dogfood
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0218"
  - "ATM-GOV-0219"
  - "ATM-GOV-0220"
  - "ATM-GOV-0221"
  - "ATM-GOV-0222"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "scripts/run-real-parallel-dogfood.ts"
  - "scripts/plan-performance-report-v3.ts"
  - "artifacts/generated/atm-parallel-dogfood/**"
  - "tests/cli/real-parallel-dogfood-harness.test.ts"
  - "docs/reports/atm-2-1-real-parallel-dogfood.md"
deliverables:
  - "scripts/run-real-parallel-dogfood.ts"
  - "scripts/plan-performance-report-v3.ts"
  - "artifacts/generated/atm-parallel-dogfood/**"
  - "tests/cli/real-parallel-dogfood-harness.test.ts"
  - "docs/reports/atm-2-1-real-parallel-dogfood.md"
validators:
  - "node --strip-types tests/cli/real-parallel-dogfood-harness.test.ts"
  - "node --strip-types scripts/run-real-parallel-dogfood.ts --mode validate"
  - "npm run validate:broker-compose"
  - "npm run validate:team-brokered-write"
  - "npm run validate:telemetry"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0223 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.real-parallel-dogfood-harness"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T18:19:39.626Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T18:19:39.626Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T18-19-39-626Z-close-7414744ceafa"
lastTransitionAt: "2026-07-20T18:19:39.626Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7362202dca45f9d2dc506770dc0d2c67392427c0"
---

# ATM-GOV-0223 Real multi-process and multi-agent dogfood

## Intent

用真 CLI、獨立 actor、isolated proposal 與 shared publish 證明真平行：disjoint、同檔不同 anchor、模糊重疊、CID 可交換/不可交換、generated shared surface。

## Required Work

- 至少四個真實同時工作 actor，各自 identity/claim/proposal/evidence。
- 記錄 simultaneous workers、actual overlap window、parallel admission count、ticket transitions、publish grouping、validator outcomes。
- 所有 side effect 經 command manifest/transactional delivery。
- 輸出 compact report 與 machine-readable summary。

## Acceptance

- [ ] max simultaneous work >= 4。
- [ ] actual overlap > 0，parallel admission > 0。
- [ ] silent overwrite、escaped conflict、duplicate side effect、unresolved starvation 全為 0。
- [ ] 每個 actor 有獨立 lane/session/evidence seal。

## Verification

```bash
node --strip-types tests/cli/real-parallel-dogfood-harness.test.ts
node --strip-types scripts/run-real-parallel-dogfood.ts --mode validate
npm run validate:broker-compose
npm run validate:team-brokered-write
npm run validate:telemetry
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- real dogfood summary; deterministic fixtures are insufficient

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:17.671Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0223-real-multi-process-and-multi-agent-dogfood.task.md","contentDigest":"sha256:97d653c3ab560313a52597666f5447119da89252ace600879eb09fa114f1322c"} -->
