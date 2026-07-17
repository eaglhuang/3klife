---
task_id: TASK-RFT-0093
title: Split internal release command under 600 lines
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-RFT-0092
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0093-internal-release-map.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/internal-release.ts
  - packages/cli/src/commands/internal-release/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - packages/cli/src/commands/internal-release.ts
  - packages/cli/src/commands/internal-release/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
validators:
  - node atm.mjs candidates rank --include "pipelines/**/*.py" --goal "Split packages/cli/src/commands/internal-release.ts into a facade plus internal-release/* support modules; every physical TypeScript file must stay under 600 lines; preserve behavior and ATM governance evidence." --json
  - node atm.mjs upgrade --propose --behavior behavior.split --atom atom-cli-internal-release --to 0.1.1 --legacy-target "packages/cli/src/commands/internal-release.ts#runInternalReleaseSync" --guidance-session guidance-20260716134604-b8aceaf31b --dry-run --json
  - node --strip-types scripts/validate-internal-release-sync.ts --mode validate
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-cli-internal-release
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atom-cli-internal-release-command
      pattern: Command Facade
      source: packages/cli/src/commands/internal-release.ts
      disposition: extract
      inlineReason: null
    - atom: atom-cli-internal-release-publication
      pattern: Publication Readiness Module
      source: packages/cli/src/commands/internal-release.ts
      disposition: extract
      inlineReason: null
    - atom: atom-cli-internal-release-target-sync
      pattern: Target Sync Module
      source: packages/cli/src/commands/internal-release.ts
      disposition: extract
      inlineReason: null
    - atom: atom-cli-internal-release-options
      pattern: Options Parser Module
      source: packages/cli/src/commands/internal-release.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T14:09:15.463Z"
completed_by_agent: "codex-task-rft-0093"
closedAt: "2026-07-16T14:09:15.463Z"
closedByActor: "codex-task-rft-0093"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T14-09-15-463Z-close-b6885549b2a2"
lastTransitionAt: "2026-07-16T14:09:15.463Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ae5d7f4bc05ce76b3880a997f53db66c7a443d98"
---

# TASK-RFT-0093 - Split Internal Release Command

## Objective

Reduce `packages/cli/src/commands/internal-release.ts` below 600 lines by preserving it as the public CLI facade for internal release sync and publication helper exports, while extracting sync orchestration, target sync, publication readiness, option parsing, and reusable utilities into bounded support modules.

## Acceptance

- `packages/cli/src/commands/internal-release.ts` is below 600 physical lines.
- Every newly created physical TypeScript file is below 600 physical lines.
- `runInternalRelease`, `runInternalReleaseSync`, `inspectReleasePublicationReadiness`, and `createReleasePublicationReceipt` remain import-compatible for CLI callers and tests.
- Internal release sync behavior remains deterministic, including runner publication readiness, target backup, metadata writes, verification runs, and scratch cleanup.
- The path-to-atom owner shard maps both the facade and extracted support modules to `atom-cli-internal-release`.
- Validation evidence is command-backed, including the guided `behavior.split` dry-run proposal.

## Notes

- Do not redesign runner-sync admission or release publication ownership semantics in this card.
- Avoid the active TASK-CODEX-011190 batch/hook scope and stale next/playbook-projection lock scope.
- If a high-value governance defect appears during closeout, amend scope before fixing it.
