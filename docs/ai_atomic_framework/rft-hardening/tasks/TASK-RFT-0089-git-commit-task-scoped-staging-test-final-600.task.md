---
task_id: TASK-RFT-0089
title: Split git commit task-scoped staging test below 600 lines
status: done
source_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
task_family: TASK-RFT
governance: ATM
scopePaths:
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-commit-task-scoped-staging/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
validators:
  - npm run typecheck
  - npm run validate:cli
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - node atm.mjs doctor --json
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.git-governance-map
      pattern: Test Facade
      source: tests/cli/git-commit-task-scoped-staging.test.ts
      disposition: extract
      inlineReason: null
    - atom: atm.git-governance-test-support
      pattern: Test Support Modules
      source: tests/cli/git-commit-task-scoped-staging/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T12:42:33.199Z"
completed_by_agent: "codex-task-rft-0089"
closedAt: "2026-07-16T12:42:33.199Z"
closedByActor: "codex-task-rft-0089"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T12-42-33-109Z-close-a84f0fc388bc"
lastTransitionAt: "2026-07-16T12:42:33.199Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "abdc7f91feb36986684c2bada98b664587be0fd1"
---

# TASK-RFT-0089 - Split Git Commit Task-Scoped Staging Test Below 600 Lines

## Goal

Reduce `tests/cli/git-commit-task-scoped-staging.test.ts` below 600 physical lines while preserving the existing fixture coverage for governed git task-scoped staging behavior.

## Atomic Boundary

- Keep the top-level test file as the executable facade for the same scenario chain.
- Extract reusable fixture setup, file path constants, assertion helpers, and scenario helpers into bounded files under `tests/cli/git-commit-task-scoped-staging/`.
- Preserve the current assertions for branch commit queue evidence, staged-file isolation, framework claim exclusion, release mirror exclusion, foreign governance residue handling, and stage-override lease behavior.
- Keep every touched physical source/test file below 600 lines.

## Acceptance

- `tests/cli/git-commit-task-scoped-staging.test.ts` is below 600 lines.
- Every new or touched physical TypeScript file is below 600 lines.
- The test remains executable through the existing validation suite without changing its semantic coverage.
- Atomization coverage maps the facade and support directory to the git governance atom owner.
- Validators pass and are recorded as command-backed ATM evidence:
  - `npm run typecheck`
  - `npm run validate:cli`
  - `node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate`
  - `node atm.mjs doctor --json`

## Notes

- This is a continuation of the TASK-RFT large-file atomization series.
- Do not include unrelated captain parallel ledger WIP, ATMChart drift, or report residues in this card.
