---
task_id: TASK-TEAM-0001
title: team plan dry-run resolver spike
status: planned
owner: atm-core
priority: P0
milestone: M2
depends_on: []
related_plan: docs/ai_atomic_framework/team-agents/
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm.ts
  - packages/cli/src/index.ts
  - packages/cli/src/commands/team.ts
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/commands/command-specs/team.spec.ts
  - tests/cli-fixtures/cli-mvp.fixture.json
  - tests/cli-fixtures/help-snapshots/command-list.json
deliverables:
  - packages/cli/src/commands/team.ts
  - packages/cli/src/commands/command-specs/team.spec.ts
validators:
  - npm run typecheck
  - npm run validate:cli:surface
  - npm run validate:cli
  - node atm.mjs team plan --task TASK-AAO-0041 --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
---

# TASK-TEAM-0001: team plan dry-run resolver spike

## Goal

Add the first minimal verifiable ATM Team Agents entrypoint:

```shell
node atm.mjs team plan --task <id> --json
```

This spike is dry-run only. It must not write `.atm/runtime/**`, must not attach hooks, and must not spawn subagents.

## Why

The full Team Agents design is large. This spike validates the smallest useful contract first:

- ATM can read a task card or task ledger entry.
- ATM can load a built-in or repo-provided `atm.teamRecipe.v1` JSON recipe.
- ATM can check that exclusive permissions have exactly one owner.
- ATM can return a suggested team plan that a human or future runtime can inspect.

## Implementation Contract

Update the framework CLI surface only:

- Add a `team` CLI runner.
- Add a `team` command help spec.
- Register `team` in the CLI runner registry.
- Register `team` in public help / CLI fixture snapshots.

`team plan` must output:

- `schemaId: atm.teamPlan.v1`
- `dryRun: true`
- `runtimeWritten: false`
- `agentsSpawned: false`
- recipe source information
- permission catalog
- exclusive permission validation findings
- suggested permission leases

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `packages/cli/src/atm.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/commands/command-specs.ts`
- `tests/cli-fixtures/cli-mvp.fixture.json`
- `tests/cli-fixtures/help-snapshots/command-list.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli:surface`
- `npm run validate:cli`
- `npm run build`
- `node atm.mjs team plan --task TASK-AAO-0041 --json`
- `node atm.mjs team --help --json`

## Acceptance Criteria

- `team plan --task <id> --json` returns a suggested team plan.
- The default recipe passes exclusive permission uniqueness checks.
- If a recipe gives two agents the same exclusive permission, the command returns a validation finding.
- The command does not write `.atm/runtime/**`.
- The command does not spawn subagents.
- `team --help --json` includes usable examples.
- `validate:cli` locks the public `team` help surface.

## Rollback

Revert framework commit `a3c90d0 feat(team): add dry-run team plan command`, then rebuild and resync the ATM runner.

## Atomization Impact

This task adds a new CLI command surface. A future atomization ownership update should map `packages/cli/src/commands/team.ts` into the CLI command router or team-agents governance map.

## Notes

This P0 spike has already landed in framework commit `a3c90d0 feat(team): add dry-run team plan command`.