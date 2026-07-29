---
task_id: TASK-AAO-0206
title: Controlled multi-task read-only projection for tasks audit
status: planned
owner: unassigned
priority: P2
depends_on:
  - "TASK-AAO-0068"
  - "TASK-MAO-0044"
causalGraph:
  causalDependencies:
    - "TASK-AAO-0068"
    - "TASK-MAO-0044"
  startConditions:
    - "TASK-AAO-0068 delivered packages/cli/src/commands/output-projection.ts with projectFields/projectSummary."
    - "TASK-MAO-0044 delivered buildTaskViewDashboard() as a read-only per-task summary."
  softRelations: []
  changedPublicSeams:
    - "node atm.mjs tasks audit --summary|--fields|--tasks|--series|--all"
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences:
    - "tests/cli/tasks-audit-read-projection.test.ts"
  phaseOwner: null
related_plan: atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/read-projection.ts"
  - "packages/cli/src/commands/tasks/command-dispatch.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli/tasks-audit-read-projection.test.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks/read-projection.ts"
  - "packages/cli/src/commands/tasks/command-dispatch.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli/tasks-audit-read-projection.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "node --strip-types --test tests/cli/tasks-audit-read-projection.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
errorCodes: []
rollback:
  strategy: revert-commit
  notes: "Additive flags and one new pure module; reverting removes the projection mode and leaves tasks audit --json untouched."
evidence:
  required: command-backed
outOfScope:
  - "Changing the GIT-0016 raw-interpreter deny policy or relaxing node -e"
  - "Any behaviour change to existing tasks audit --json or --staged"
  - "New ErrorCodes, registries, tickets, leases, or policy owners"
  - "Write, repair, or mutation paths of any kind"
  - "TASK-GIT-0024 through TASK-GIT-0028, Plan3.1, TMP, and all foreign WIP"
nonGoals:
  - "Do not duplicate lifecycle or status determination; reuse buildTaskViewDashboard() and output-projection.ts only"
  - "Do not accept arbitrary user-supplied expressions as a selector or field"
  - "Do not change exit codes for existing invocations"
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  extractionCandidates: []
  notes: "New read-projection.ts is a leaf adapter under the tasks command map; command-dispatch.ts gains one branch. No extraction required."
createdByCommand: atm plan card create
---

# TASK-AAO-0206 Controlled multi-task read-only projection for tasks audit

## Intent

Restricted workers cannot run raw interpreters (`node -e`), and ATM has no
bulk read-only projection: `tasks status` accepts exactly one `--task`, and
`tasks audit --json` returns health findings across 699 tasks rather than a
per-task row set. The only way to build a multi-task status table today is an
ad-hoc interpreter script, which the GIT-0016 restricted-execution policy
denies by design.

This card closes that ergonomic gap without weakening the policy. It adds a
controlled, allowlisted, side-effect-free projection mode to `tasks audit` that
reuses the summaries already delivered by `TASK-AAO-0068` and `TASK-MAO-0044`.

This is an adapter over existing read surfaces. It is explicitly **not** a new
deep module: it introduces no registry, ticket, lease, or policy owner, and it
does not re-derive any lifecycle or status decision.

## Contract

```
node atm.mjs tasks audit --tasks TASK-GIT-0024,TASK-GIT-0025 --summary --json
node atm.mjs tasks audit --series GIT --summary \
  --fields taskId,status,claimState,owner,lastTransitionAt,residueBucket,nextActionCode --json
```

Output schema is fixed at `atm.taskReadProjection.v1`; `rows` are sorted by
`taskId` with a stable comparator.

### Field registry

Every field is a projection of the existing `buildTaskViewDashboard()` result.
No field introduces new lifecycle logic.

| field | source |
| --- | --- |
| `taskId` | `dashboard.taskId` |
| `status` | `dashboard.liveStatus` |
| `claimState` | `dashboard.claimState` |
| `owner` | `dashboard.lastEvent.actorId` |
| `lastTransitionAt` | `dashboard.lastEvent.createdAt` |
| `residueBucket` | `dashboard.residueBucket` |
| `nextActionCode` | derived from `dashboard.nextSafeCommand` |
| `planningStatus` | `dashboard.planningStatus` |
| `partialClose` | `dashboard.partialClose` |

### Selection

Exactly one of `--tasks <id,...>`, `--series <PREFIX>`, or explicit `--all`.
Any other selector form is rejected fail-closed: no JS expressions, no
`node -e`, no JSONPath, no file paths, no shell text. Unknown `--fields`
entries are rejected fail-closed against the registry above rather than
silently dropped.

## Design notes

`parseAuditOptions` in `task-option-parsers/misc-claim-options.ts` already
throws `ATM_CLI_USAGE` on any unrecognised flag, and `tasks audit` currently
rejects both `--summary` and `--fields`. There is therefore no collision with
the CLI-wide `--summary`/`--fields` envelope projection applied in
`shared/command-spec-output.ts`; this card defines row-level semantics for
those flag names on this one action.

Dispatch branches inside `dispatchTasksAction` (`command-dispatch.ts`) by
direct import of the new pure module, so the injected
`TaskCommandDispatchTable` is unchanged and
`packages/cli/src/commands/tasks/legacy/implementation.ts` is not touched.

`buildTaskViewDashboard()` runs a residue diagnosis per task, so `--all` over
~699 tasks must be measured during implementation. `--tasks` and `--series`
are the normal paths.

## Acceptance

- [ ] Compact projection for an explicit multi-task selection (`--tasks A,B`).
- [ ] `--series` filtering returns only that prefix, sorted stably by `taskId`.
- [ ] `--fields` allowlist accepts every registered field.
- [ ] Unknown `--fields` entry is rejected fail-closed with a usage error.
- [ ] Rejects selector forms other than `--tasks` / `--series` / `--all`.
- [ ] Ledger, `.atm/runtime/**`, and `git status` are byte-identical before and
      after the command; no claim, evidence write, validator run, lock change,
      broker start, or task-status change occurs.
- [ ] Regression: existing `node atm.mjs tasks audit --json` output is
      unchanged (699 inspected tasks, findings-shaped envelope).
- [ ] `node --strip-types --test tests/cli/tasks-audit-read-projection.test.ts`
- [ ] `npm run typecheck`
- [ ] `npm run validate:cli`

## Out of scope

- Changing the GIT-0016 raw-interpreter deny policy or relaxing `node -e`.
- Any behaviour change to existing `tasks audit --json` or `--staged`.
- New ErrorCodes, registries, tickets, leases, or policy owners.
- Write, repair, or mutation paths of any kind.
- TASK-GIT-0024 through TASK-GIT-0028, Plan3.1, TMP, and all foreign WIP.

## Non-goals

- Do not duplicate lifecycle or status determination; reuse
  `buildTaskViewDashboard()` and `output-projection.ts` only.
- Do not accept arbitrary user-supplied expressions as a selector or field.
- Do not change exit codes for existing invocations.

## Rollback

strategy: revert-commit

notes: Additive flags and one new pure module; reverting removes the
projection mode and leaves `tasks audit --json` untouched.

## Evidence

required: command-backed

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-29T01:36:00.867Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-agent-first-operability/tasks/TASK-AAO-0206-controlled-multi-task-read-only-projection-for-tasks-audit.task.md","contentDigest":"sha256:4a00d67c5b0d9edb0b3a58d1e000f7f613880a25206f8e7bea3b89d894b73759"} -->
