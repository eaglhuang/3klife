---
doc_id: doc_other_aao_0061
task_id: TASK-AAO-0061
title: "Big script atomization wave 1: tasks command shared helpers"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0059"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-ledger-readers.ts"
  - "packages/cli/src/commands/tasks/task-planning-doc.ts"
  - "packages/cli/src/commands/tasks/task-git-helpers.ts"
  - "packages/cli/src/commands/tasks/task-output-formatters.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-ledger-readers.ts"
  - "packages/cli/src/commands/tasks/task-planning-doc.ts"
  - "packages/cli/src/commands/tasks/task-git-helpers.ts"
  - "packages/cli/src/commands/tasks/task-output-formatters.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the extraction commits. Pure behavior-preserving refactor — git revert returns to pre-split state with zero behavioral change."
atomizationImpact:
  ownerAtomOrMap: "atm.task-command-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "4 new helper modules under packages/cli/src/commands/tasks/ must each receive ownership entries."
outOfScope:
  - "next.ts atomization (deferred to wave 2)"
  - "batch.ts atomization"
  - "Any change to task lifecycle semantics"
  - "Any change to close / reconcile / deliver-and-close behavior"
  - "New public CLI flags or subcommands"
  - "Replacing tasks.ts with a dispatcher/router shell"
nonGoals:
  - "Do not change task lifecycle semantics"
  - "Do not change close / checkpoint / reconcile behavior"
  - "Do not modify validate:cli expected outputs"
  - "Do not export new public APIs from tasks.ts (extract-only)"
  - "Do not convert tasks.ts into a router (it stays the public command entrypoint)"
tags:
  - "big-script-atomization"
  - "atomize-wave-1"
---
# TASK-AAO-0061 - Big script atomization wave 1: tasks command shared helpers

## Goal

Extract pure helper functions from `tasks.ts` (5161 lines) into 4 new co-located modules,
reducing the main file by at least 300 lines while preserving 100% of existing task lifecycle behavior.
`tasks.ts` remains the public command entrypoint after the extraction.

## Why

`tasks.ts` at 5161 lines is the largest single source of token toxicity in the CLI surface.
Every read consumes substantial context window. Wave 1 targets a behavior-preserving extraction
of clearly self-contained readers, parsers, formatters, and git helpers, leaving the dispatcher,
sub-command handlers, and public API of `tasks.ts` untouched.

## Atomization Plan

```
Primary atom:        atm.task-command-map
Related atoms:       atm.task-closure-map, atm.task-ledger-map
Capability touched:  packages/cli/src/commands/tasks*.ts
Command surface:     node atm.mjs tasks ... (all subcommand behavior unchanged)
Large-script risk:   HIGH - tasks.ts is the core entrypoint; any import error breaks the entire task pipeline
Map update needed:   YES - 4 new modules must be added to path-to-atom-map.json
Recommended slice:   Extract task-ledger-readers.ts first (lowest risk - pure-read helpers), validate, then proceed
Do-not-cross:        No function signature changes; no close/reconcile/deliver-and-close behavior change; no router conversion
Split:               wave 1 - shared helpers (this card); wave 2 - next.ts; wave 3 - tasks.ts subcommand module split (separate cards)
```

## Proposed Extraction Map

### `task-ledger-readers.ts` (extract first - lowest risk)

| Function | Approx. line in tasks.ts |
|---|---|
| `parseClaimRecord(value)` | ~3506 |
| `createClaimRecord(input)` | ~3539 |
| `isClaimExpired(claim, nowIso)` | ~3582 |
| `listRuntimeLockTaskIds(cwd)` | ~2066 |
| `collectTaskFileValues(value, files)` | ~3493 |

### `task-planning-doc.ts` (module-level constants + parser helpers)

| Symbol | Approx. line in tasks.ts |
|---|---|
| `acceptanceHeaders`, `deliverablesHeaders`, `dependenciesHeaders`, `notesHeaders`, `tagsHeaders` | ~189-193 |
| `taskIdPattern`, `taskIdAnywherePattern` | ~194-195 |
| `extractTaskDeclaredFiles(taskDocument)` | ~3259 |
| `evaluateTaskDeliverableGate(input)` | ~3273 |

### `task-git-helpers.ts` (git invocation helpers)

| Function | Approx. line in tasks.ts |
|---|---|
| `readGitScalar(cwd, args)` | ~3450 |
| `readGitNameOnly(cwd, args)` | ~3458 |
| `listChangedFilesForDeliverableGate(cwd, ...)` | ~3410 |
| `listCommittedFilesSinceClaim(cwd, claimSha)` | ~3437 |
| `buildCloseScopedDiffIsolation(input)` | ~2942 |

### `task-output-formatters.ts` (output rendering helpers)

| Function | Approx. line in tasks.ts |
|---|---|
| `taskDeliveryPrincipleText()` | ~3342 |
| `writeLockCleanupReport(input)` | ~3558 |
| `inspectHistoricalDelivery(input)` | ~3346 |

## Implementation Contract

1. Create directory `packages/cli/src/commands/tasks/` (new).
2. Extract one module at a time. After each extraction: run `npm run typecheck` and `npm run validate:cli`. Do not proceed to the next module if either fails.
3. `tasks.ts` imports the extracted helpers from the new modules. `tasks.ts` keeps its dispatcher, sub-command implementations, and remains the public command entrypoint.
4. No new public API is exported from `tasks.ts` as part of this card.
5. Update `atomic_workbench/atomization-coverage/path-to-atom-map.json` so each of the 4 new modules has an ownership entry under the relevant atom.
6. Update `scripts/validate-task-ledger-governance.ts` only as needed to recognize the new helper module paths (no behavior change to validation logic itself).

## Acceptance Criteria

- `tasks.ts` line count drops by at least 300 lines (target: <= 4861 lines).
- `tasks.ts` remains the public command entrypoint; this task must not replace the dispatcher/router architecture.
- No function signature changes in any extracted helper.
- `npm run typecheck` reports zero new errors.
- `npm run validate:cli` passes with zero regression vs pre-extraction baseline.
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate` passes.
- `git diff --check` passes.
- close / reconcile / deliver-and-close / checkpoint behavior is byte-equivalent to pre-extraction (validated via existing fixtures).

## Validators

```
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Stop Conditions

- If any extraction step causes `npm run validate:cli` regression, stop immediately and open a `captain-decision` shard.
- If circular imports appear between `tasks.ts` and an extracted module, stop and record in `captain-decision`; do not force the extraction.
- If the 300-line reduction cannot be met (e.g., import lines and re-emitted types offset the savings), treat as partial win, record in `team-summary`, and draft a wave 1b card; do not push past the line target by extracting unsafe code.