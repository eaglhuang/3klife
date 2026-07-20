---
task_id: ATM-GOV-0221
title: Canonical telemetry and evidence seal
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0215"
  - "ATM-GOV-0216"
  - "ATM-GOV-0217"
  - "ATM-GOV-0218"
  - "ATM-GOV-0219"
  - "ATM-GOV-0220"
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Extends the registered GOV plan with the closest active governance-optimization series; it does not create a second task model."
scopePaths:
  - "packages/core/src/telemetry/index.ts"
  - "packages/core/src/evidence/index.ts"
  - "packages/cli/src/commands/telemetry.ts"
  - "packages/cli/src/commands/evidence/**"
  - "schemas/governance/telemetry-observation.schema.json"
  - "schemas/governance/shared-write-gate-coverage.schema.json"
  - "tests/cli/canonical-telemetry-observation.test.ts"
  - "tests/cli/evidence-seal-task-summary.test.ts"
deliverables:
  - "packages/core/src/telemetry/index.ts"
  - "packages/core/src/evidence/index.ts"
  - "packages/cli/src/commands/telemetry.ts"
  - "packages/cli/src/commands/evidence/**"
  - "schemas/governance/telemetry-observation.schema.json"
  - "schemas/governance/shared-write-gate-coverage.schema.json"
  - "tests/cli/canonical-telemetry-observation.test.ts"
  - "tests/cli/evidence-seal-task-summary.test.ts"
validators:
  - "node --strip-types tests/cli/canonical-telemetry-observation.test.ts"
  - "node --strip-types tests/cli/evidence-seal-task-summary.test.ts"
  - "npm run validate:schemas"
  - "npm run validate:gate-telemetry-v1"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0221 command-backed deliverables and sealed task summary."
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
  ownerAtomOrMap: "atm.canonical-telemetry-observation"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T17:47:59.257Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T17:47:59.257Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T17-47-59-257Z-close-9401711faffe"
lastTransitionAt: "2026-07-20T17:47:59.257Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "aa0a88e92d8e8a2704e136e0b704f83a202989be"
---

# ATM-GOV-0221 Canonical telemetry and evidence seal

## Intent

把所有 census producer 遷移到 `atm.telemetryObservation.v1`，新增 shared-write gate coverage matrix，close 前強制 sealed task summary。

## Required Work

- 新增 `atm.sharedWriteGateCoverage.v1`，記錄 tier、owner、ticket adapter、producer、status、recovery command。
- 補齊八個缺失欄位；不可得時寫 unavailable receipt。
- summary 必含 window、watermark、sample count、input digest、sealed digest。
- tracked repo 只保 compact digest，raw high-frequency telemetry 留 runtime/artifacts。

## Acceptance

- [ ] shared-write producer observed coverage 100%。
- [ ] 每張任務 summary 有有效 window/watermark/sealed digest。
- [ ] unavailable 欄位有 receipt，不被當成 0。
- [ ] schema、TypeScript contract、fixtures 同步。

## Verification

```bash
node --strip-types tests/cli/canonical-telemetry-observation.test.ts
node --strip-types tests/cli/evidence-seal-task-summary.test.ts
npm run validate:schemas
npm run validate:gate-telemetry-v1
npm run typecheck
npm run validate:cli
git diff --check
```

## Public Interfaces / Evidence

- atm.telemetryObservation.v1
- atm.sharedWriteGateCoverage.v1

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:14.881Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0221-canonical-telemetry-and-evidence-seal.task.md","contentDigest":"sha256:b5c86c3b2899e4c9c76e71369b8ffb0664c424dd608416cdad492a2a5037709f"} -->
