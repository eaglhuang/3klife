---
task_id: TASK-RFT-0087
title: Split test runner report support below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/manager/test-runner.ts
  - packages/core/src/manager/test-runner/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - packages/core/src/manager/test-runner.ts
  - packages/core/src/manager/test-runner/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
validators:
  - npm run typecheck
  - npm run validate:cli
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-core-test-runner
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atom-core-test-runner
      pattern: Facade
      source: packages/core/src/manager/test-runner.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-test-runner-report-support
      pattern: Result Contract Object
      source: packages/core/src/manager/test-runner/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T12:05:40.227Z"
completed_by_agent: "codex-task-rft-0087"
closedAt: "2026-07-16T12:05:40.227Z"
closedByActor: "codex-task-rft-0087"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T12-05-40-227Z-close-be34013b2dca"
lastTransitionAt: "2026-07-16T12:05:40.227Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2ab9556c55c3307b0d4417d4e67e135e66f971b7"
---

# TASK-RFT-0087 - Split Test Runner Report Support Below 600 Lines

## Goal

Reduce `packages/core/src/manager/test-runner.ts` below 600 physical lines by extracting atomic test report assembly, schema validation, and report utility helpers into bounded support modules while preserving basic and extended test runner behavior.

## Acceptance

- `packages/core/src/manager/test-runner.ts` is below 600 physical lines.
- Every new file under `packages/core/src/manager/test-runner/**` is below 600 physical lines.
- `npm run typecheck` continues to pass.
- `npm run validate:cli` continues to pass.
- Atomization coverage maps the test runner facade and support directory to `atom-core-test-runner`.

## Atom Map Refactor Plan

- Atom: `atom-core-test-runner`
- Pattern: Facade plus Result Contract Object support
- Owner module: `packages/core/src/manager/test-runner.ts`
- Extraction target: `createAtomicTestReport`, `validateAtomicTestReportDocument`, validation failure construction, result normalization, and portable path utilities.
- Out of scope: plugin planning semantics, default gate execution semantics, command execution behavior, generated release artifacts.
