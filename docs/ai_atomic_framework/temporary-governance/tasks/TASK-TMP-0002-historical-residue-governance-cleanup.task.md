---
task_id: TASK-TMP-0002
title: Historical residue governance cleanup
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - "ATM-GOV-0217"
  - "ATM-GOV-0218"
  - "ATM-GOV-0219"
  - "ATM-GOV-0221"
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "TMP is the registered temporary cleanup family; this card disposes historical residue only after product-level repairs exist."
scopePaths:
  - "packages/cli/src/commands/broker/steward-runtime-actions.ts"
  - "packages/cli/src/commands/tasks/**"
  - "packages/cli/src/commands/evidence/**"
  - "scripts/cleanup-historical-governance-residue.ts"
  - "tests/cli/historical-residue-cleanup.test.ts"
  - "docs/reports/historical-governance-residue-cleanup.md"
deliverables:
  - "scripts/cleanup-historical-governance-residue.ts"
  - "tests/cli/historical-residue-cleanup.test.ts"
  - "docs/reports/historical-governance-residue-cleanup.md"
validators:
  - "node --strip-types tests/cli/historical-residue-cleanup.test.ts"
  - "node --strip-types scripts/cleanup-historical-governance-residue.ts --dry-run --json"
  - "npm run validate:task-ledger-governance"
  - "npm run validate:broker-registry"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:[]
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "Formal cleanup receipts for old queue/session/stale lock/raw telemetry/release residue."
consumer:
  - "ATM-GOV-0225"
missingData:
  - "Must wait for upstream product fixes before writing cleanup."
dataDrivenStopRule:
  - "Stop if cleanup would directly delete .atm runtime/history files."
  - "Stop if residue is reachable by active task, fresh queue entry, receipt, or evidence digest."
out_of_scope:
  - "No product bug fixes."
  - "No cleanup before dependencies close."
rollback:
  strategy: formal-reconcile-or-revert
  notes: "Use cleanup receipts to restore quarantined artifacts or revert the cleanup commit; do not reconstruct state from chat memory."
atomizationImpact:
  ownerAtomOrMap: "atm.historical-residue-cleanup"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
completed_at: "2026-07-20T18:57:50.148Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T18:57:50.148Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T18-57-50-063Z-close-747af8004886"
lastTransitionAt: "2026-07-20T18:57:50.148Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9b2bf9b4bea17a8d53157ecfcf8aa1a715dad353"
---

# TASK-TMP-0002 Historical residue governance cleanup

## Intent

在產品級修復完成後，用正式 CLI 處置舊 queue receipt、session events、stale locks、raw telemetry、dirty release residue；禁止直接刪 `.atm` 狀態。

## Required Work

- dry-run census residue，分類 active/reachable/quarantineable/deletable/needs-owner。
- 只用正式 cancel/adopt/reconcile/cleanup command。
- 每個處置寫 receipt：原 path、digest、reason、command、rollback ref。
- raw telemetry 只保 compact digest/report。

## Acceptance

- [ ] dry-run 與 write-run mutation list 一致。
- [ ] 每個 residue 有 disposed/quarantined/kept-with-reason 狀態。
- [ ] 無 active task 或 fresh queue entry 被清理。
- [ ] ATM-GOV-0225 可消費 cleanup summary。

## Verification

```bash
node --strip-types tests/cli/historical-residue-cleanup.test.ts
node --strip-types scripts/cleanup-historical-governance-residue.ts --dry-run --json
npm run validate:task-ledger-governance
npm run validate:broker-registry
npm run typecheck
git diff --check
```

## Public Interfaces / Evidence

- cleanup dry-run/write receipts

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:22.995Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0002-historical-residue-governance-cleanup.task.md","contentDigest":"sha256:a39e84e835d4223dbc2be9eaad78ef90858dcb627f8b0dbfcb76856266ad9f5d"} -->
