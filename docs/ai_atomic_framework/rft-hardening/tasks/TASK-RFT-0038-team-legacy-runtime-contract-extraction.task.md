---
task_id: TASK-RFT-0038
title: Extract team legacy runtime contract helpers
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0037]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM瘝餌?瘚??eam-Agents????急.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-legacy-runtime-contract-extraction.test.ts
validators:
  - node --strip-types tests/cli/team-legacy-command-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-runtime-contract-extraction.test.ts
  - node --strip-types tests/cli/team-plan-contract.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the runtime contract extraction commit and restore the helpers inside team-legacy.ts.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-runtime-contract-builder
      pattern: Result Contract Object
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-closure-attestation-contract
      pattern: Result Contract Object
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-artifact-handoff-contract
      pattern: Result Contract Object
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T14:14:24.327Z"
completed_by_agent: "codex-task-rft-0038"
closedAt: "2026-07-15T14:14:24.327Z"
closedByActor: "codex-task-rft-0038"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T14-14-24-327Z-close-702e2690a6cd"
lastTransitionAt: "2026-07-15T14:14:24.327Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "cdd8dec962b82251532b7fcbed859ec641b7e7a8"
---

# TASK-RFT-0038 - Extract team legacy runtime contract helpers

## Problem

`packages/cli/src/commands/team-legacy.ts` still has more than 5,000 lines after the first team legacy split. A large middle section builds Team runtime contracts, closure attestations, artifact handoff contracts, retry budgets, and rework route state. These helpers are mostly pure contract builders and can be moved behind a bounded legacy module without changing the command facade.

## Acceptance

- Extract the Team runtime contract / attestation / artifact handoff helper cluster from `team-legacy.ts` into bounded modules under `packages/cli/src/commands/team/legacy/`.
- Keep each new or touched support module at or below 600 lines.
- Reduce `team-legacy.ts` below its current 5,164-line baseline.
- Preserve exported helper names currently imported by tests or downstream command surfaces.
- Add a regression that fails if the extracted runtime contract modules exceed 600 lines or `team-legacy.ts` does not shrink.
- Register the new extracted module paths in the CLI atom-map shard.

## Atom Refactor Plan

Atom: `atm.team-runtime-contract-builder`
Pattern: Result Contract Object
Owner module: `packages/cli/src/commands/team/legacy/runtime-contracts.ts`
Callers: `packages/cli/src/commands/team-legacy.ts`
Public surface: re-export existing helper functions from `team-legacy.ts` to preserve imports
Focused test: `tests/cli/team-legacy-runtime-contract-extraction.test.ts`
CLI regression: `node --strip-types tests/cli/team-plan-contract.test.ts`
Out of scope: command route extraction, provider execution, patrol lifecycle, and full `team-legacy.ts` completion below 600 lines
Commit split: source/test/map update first, generated release sync only if frozen runner reports sync required
