---
task_id: TASK-RFT-0040
title: Extract team legacy permission lease policy
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0039]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM?璅∪??汽eam-Agents瘝餌??芸?.md
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
  - tests/cli/team-legacy-permission-lease-extraction.test.ts
validators:
  - node --strip-types tests/cli/team-legacy-command-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-patrol-contract-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-permission-lease-extraction.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the permission lease policy extraction commit and restore the helpers inside team-legacy.ts.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-permission-lease-policy
      pattern: Policy Object
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T14:53:04.170Z"
completed_by_agent: "codex-task-rft-0040"
closedAt: "2026-07-15T14:53:04.170Z"
closedByActor: "codex-task-rft-0040"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T14-53-04-082Z-close-bd19d5a35b3f"
lastTransitionAt: "2026-07-15T14:53:04.170Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b835b77633e6b6211b77708166f840fae987e529"
---

# TASK-RFT-0040 - Extract team legacy permission lease policy

## Problem

`packages/cli/src/commands/team-legacy.ts` remains the only non-generated source file above 2,000 lines after TASK-RFT-0039. A large middle section still owns Team permission model validation, permission finding text, lease path safety checks, write-scope derivation, and suggested permission lease construction inside the legacy command facade.

## Acceptance

- Extract the Team permission / lease validation policy cluster from `team-legacy.ts` into bounded module(s) under `packages/cli/src/commands/team/legacy/`.
- Move one large atom map in this card, not just a small helper cluster.
- Keep every new or touched physical support module at or below 600 lines.
- Reduce `team-legacy.ts` below its current 4,213-line baseline.
- Preserve exported helper names currently imported by tests or downstream command surfaces.
- Add a regression that fails if the extracted permission lease module exceeds 600 lines or `team-legacy.ts` does not shrink.
- Register the new extracted module paths in the CLI atom-map shard.

## Atom Refactor Plan

Atom: `atm.team-permission-lease-policy`
Pattern: Policy Object
Owner module: `packages/cli/src/commands/team/legacy/permission-lease-policy.ts`
Callers: `packages/cli/src/commands/team-legacy.ts`
Public surface: re-export existing helper functions from `team-legacy.ts` when needed to preserve imports
Focused test: `tests/cli/team-legacy-permission-lease-extraction.test.ts`
CLI regression: `node --strip-types tests/cli/team-agents-dogfood.test.ts`
Out of scope: provider execution, patrol lifecycle, run storage, and full `team-legacy.ts` completion below 600 lines
Commit split: source/test/map update first, generated release sync only if frozen runner reports sync required
