---
task_id: TASK-RFT-0084
title: Split guidance validator below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-guidance.ts
  - scripts/lib/validate-guidance/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - scripts/validate-guidance.ts
  - scripts/lib/validate-guidance/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - npm run validate:guidance
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.guidance-validator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.guidance-validator-map
      pattern: Facade
      source: scripts/validate-guidance.ts
      disposition: extract
      inlineReason: null
    - atom: atm.guidance-host-local-shadow-evidence-map
      pattern: Result Contract Object
      source: scripts/lib/validate-guidance/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T11:15:27.654Z"
completed_by_agent: "codex-task-rft-0084"
closedAt: "2026-07-16T11:15:27.654Z"
closedByActor: "codex-task-rft-0084"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T11-15-27-654Z-close-b5438ffbbf89"
lastTransitionAt: "2026-07-16T11:15:27.654Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "bf3cf5dd791933a1e296bd9e8f1481814be3a6d1"
---

# TASK-RFT-0084 - Split Guidance Validator Below 600 Lines

## Goal

Reduce `scripts/validate-guidance.ts` below 600 physical lines by extracting the host-local shadow and proposal evidence wiring assertions into bounded validator support modules while preserving the same `npm run validate:guidance` behavior.

## Acceptance

- `scripts/validate-guidance.ts` is below 600 physical lines.
- Every new file under `scripts/lib/validate-guidance/**` is below 600 physical lines.
- `npm run validate:guidance` continues to pass.
- `npm run typecheck` continues to pass.
- Atomization coverage maps the validator facade and support directory to `atm.guidance-validator-map`.

## Atom Map Refactor Plan

- Atom: `atm.guidance-validator-map`
- Pattern: Facade plus Result Contract Object support
- Owner module: `scripts/validate-guidance.ts`
- Extraction target: host-local shadow mode, guided proposal, review, apply-ready, rollout-ready, and rollback proof assertions.
- Out of scope: guidance route engine semantics, behavior registry semantics, runtime adapter readiness logic, fixture content changes, generated docs/report updates.
