---
task_id: TASK-RFT-0085
title: Split operational bench runner below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/lib/admission-bench/operational-runner.ts
  - scripts/lib/admission-bench/operational-artifacts.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - scripts/lib/admission-bench/operational-runner.ts
  - scripts/lib/admission-bench/operational-artifacts.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - npm run validate:operational-bench
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.operational-bench-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.operational-bench-runner-map
      pattern: Facade
      source: scripts/lib/admission-bench/operational-runner.ts
      disposition: extract
      inlineReason: null
    - atom: atm.operational-bench-artifact-map
      pattern: Result Contract Object
      source: scripts/lib/admission-bench/operational-artifacts.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T11:29:31.495Z"
completed_by_agent: "codex-task-rft-0085"
closedAt: "2026-07-16T11:29:31.495Z"
closedByActor: "codex-task-rft-0085"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T11-29-31-495Z-close-8367970996a5"
lastTransitionAt: "2026-07-16T11:29:31.495Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a02682347f3f269d94432296adb1abda558f8bbc"
---

# TASK-RFT-0085 - Split Operational Bench Runner Below 600 Lines

## Goal

Reduce `scripts/lib/admission-bench/operational-runner.ts` below 600 physical lines by extracting OperationalBench summary, paper-table rendering, README rendering, and artifact hash writing into a bounded support module while preserving the same benchmark artifact contract.

## Acceptance

- `scripts/lib/admission-bench/operational-runner.ts` is below 600 physical lines.
- `scripts/lib/admission-bench/operational-artifacts.ts` is below 600 physical lines.
- `npm run validate:operational-bench` continues to pass.
- `npm run typecheck` continues to pass.
- Atomization coverage maps the runner facade and artifact support module to `atm.operational-bench-map`.

## Atom Map Refactor Plan

- Atom: `atm.operational-bench-map`
- Pattern: Facade plus Result Contract Object support
- Owner module: `scripts/lib/admission-bench/operational-runner.ts`
- Extraction target: summary stats, null metric reasons, paper-table rendering, README rendering, JSON writing, recursive artifact listing, and hash manifest writing.
- Out of scope: scenario definitions, benchmark semantics, generated official artifact contents, schema changes, package script changes.
