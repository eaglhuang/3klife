---
doc_id: doc_rft_0001
task_id: TASK-RFT-0001
title: "next.ts atomic-map extraction"
status: done
owner: atm-core
priority: P0
milestone: RFT-M1
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/channel-strategy.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/next/task-scoped-claim-command.ts"
  - "packages/cli/src/commands/next/runner-mode.ts"
  - "packages/cli/src/commands/next/__tests__/channel-strategy.spec.ts"
  - "packages/cli/src/commands/next/__tests__/claim-admission.spec.ts"
  - "packages/cli/src/commands/next/__tests__/task-scoped-claim-command.spec.ts"
  - "packages/cli/src/commands/next/__tests__/runner-mode.spec.ts"
  - "scripts/validate-next-atomic-map.ts"
  - "docs/reports/next-command-atomic-map.md"
  - "tests/cli-fixtures/help-snapshots/next.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/channel-strategy.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/next/task-scoped-claim-command.ts"
  - "packages/cli/src/commands/next/runner-mode.ts"
  - "packages/cli/src/commands/next/__tests__/channel-strategy.spec.ts"
  - "packages/cli/src/commands/next/__tests__/claim-admission.spec.ts"
  - "packages/cli/src/commands/next/__tests__/task-scoped-claim-command.spec.ts"
  - "packages/cli/src/commands/next/__tests__/runner-mode.spec.ts"
  - "scripts/validate-next-atomic-map.ts"
  - "docs/reports/next-command-atomic-map.md"
  - "tests/cli-fixtures/help-snapshots/next.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-next-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/channel-strategy.spec.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/claim-admission.spec.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/task-scoped-claim-command.spec.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/runner-mode.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the split regresses claim admission, channel routing, or batch checkpoint sequencing."
atomizationImpact:
  ownerAtomOrMap: "atm.next-command-atomic-map"
  mapUpdates:
    - "docs/reports/next-command-atomic-map.md"
outOfScope:
  - "Changing the next CLI public command name or option set"
  - "Changing atm.taskIntent.v1 schema"
  - "Changing the claim lease lifecycle in tasks.ts"
  - "Touching packages/cli/src/commands/tasks.ts (owned by TASK-RFT-0010)"
nonGoals:
  - "Do not rename the next subcommand."
  - "Do not change the next --help summary text beyond what TASK-CID-0073 already settled."
  - "Do not consolidate next-active-batch.ts or upgrade/next-action-hint.ts in this card."
completed_at: "2026-07-09T16:11:08.689Z"
completed_by_agent: "cursor-composer-rft0001"
closedAt: "2026-07-09T16:11:08.689Z"
closedByActor: "cursor-composer-rft0001"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-09T16-11-08-689Z-close-d6b0548714ba"
lastTransitionAt: "2026-07-09T16:11:08.689Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b513405f2ea00640ef7dd140c1714c6bdc561963"
---

# TASK-RFT-0001 - next.ts atomic-map extraction

## Goal

Reduce `packages/cli/src/commands/next.ts` (3,936 lines as of 2026-06-20, still the largest open RFT source surface) into a thin Facade by extracting four governance atoms (channel selection, claim admission, task-scoped claim command, runner mode) into their own modules with focused tests.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill in **implementation mode** (not just review). Per the skill's `references/casebook.md` RFT-0001 forward case, the natural shape is:

1. **`next/channel-strategy.ts`** — **Strategy Map**.
   - Input: `{ runtime, importedTaskQueue, taskIntent, frameworkSignals }`.
   - Output: `{ channel: 'fast' | 'normal' | 'batch' | 'quickfix' | 'task-route-ready', reason: string, recommendedChannel: string, riskLevel: 'low'|'medium'|'high' }`.
   - Owns the logic currently inside `decideNextAction`.

2. **`next/claim-admission.ts`** — **Policy Object**.
   - Input: `{ selectedTask, queue, claimIntent, frameworkMode }`.
   - Output: `atm.nextClaimAdmission.v1` with `allowed: boolean`, `verdict: 'allowed' | 'blocked-cid-conflict' | 'blocked-dependency' | 'closeout-only-ok'`, `conflictWithTaskId?`, `overlappingAtomIds?`, `closeoutOnlyHint?`.
   - Encapsulates the CID parallel conflict gate (currently inside `claimNextImportedTask` and `inspectImportedTaskQueue`).

3. **`next/task-scoped-claim-command.ts`** — **Result Contract Object**.
   - Owns the `taskScopedClaimCommand` field added by TASK-CID-0073 and the `claimCommandShape: 'task-scoped' | 'prompt-scoped'` discriminator.
   - Pure function: `buildTaskScopedClaimCommand({ selectedTask, taskIntent, actor }): atm.nextTaskScopedClaimCommand.v1`.

4. **`next/runner-mode.ts`** — small Facade owning `withRunnerMode`, `describeRunnerMode`, `classifyRunnerMode`, and `normalizeRelativePath` (the latter is only used by the runner-mode wrapper).

5. **`next.ts`** — thin Facade: parse argv, dispatch to atoms, format CLI result.

Existing siblings (`next/intent-normalizers.ts`, `next/match-and-sort.ts`, `next/route-predicates.ts`, `next/view-projections.ts`, `next-active-batch.ts`) are NOT in scope; they stay as-is. The new four atoms join them as siblings.

## Required Behavior

- `next --json` and `next --claim --actor <id> --task <id> --json` must produce byte-identical evidence shape (same field names, same order where ordered) as before the split.
- `taskScopedClaimCommand` field and `claimCommandShape` discriminator from TASK-CID-0073 must survive verbatim.
- CID conflict gate (`ATM_NEXT_CLAIM_BLOCKED` with `conflictWithTaskId`, `overlappingAtomIds`, `closeoutOnlyHint`) must keep its exact code and field names.
- The atomic-map report `docs/reports/next-command-atomic-map.md` must enumerate each atom, its public surface, and a before/after line count table.
- `next.ts` after the split must be under 1,200 lines.

## Testing Requirements (heavier than RFT default)

Each new atom requires a focused spec with **at least three cases**:

- `channel-strategy.spec.ts`:
  - one case per channel (`fast`, `normal`, `batch`, `quickfix`, `task-route-ready`) showing the input shape that selects it;
  - one negative case asserting an unknown runtime falls back to a deterministic default with a stable code;
  - one case asserting that the strategy never mutates its input.
- `claim-admission.spec.ts`:
  - one case for `allowed: true` on a clean import;
  - one case for `blocked-cid-conflict` with overlapping atoms (must echo the `ATM_NEXT_CLAIM_BLOCKED` shape that TASK-CID-0073 verified);
  - one case for `closeout-only-ok` when the task is source-done but not governed-done;
  - one case asserting that the admission policy does not write any file (pure function).
- `task-scoped-claim-command.spec.ts`:
  - one case where `explicitTaskSelector` is set → `claimCommandShape: 'task-scoped'`;
  - one case where prompt resolved to a single task without explicit `--task` → still emits a `taskScopedClaimCommand` alternative with the `--task TASK-XXX` form;
  - one case with no selected task → returns null/empty result, not a crash.
- `runner-mode.spec.ts`:
  - one case per mode (`frozen`, `source-first`, `unknown`);
  - one case for `withRunnerMode` wrapping a result without mutating the original.

Add `scripts/validate-next-atomic-map.ts` that asserts:

- all four new atom files exist;
- each one has a corresponding spec under `next/__tests__/`;
- `next.ts` line count is below 1,200;
- the public surface of `runNext` is unchanged (by snapshot of exported symbol names).

CLI snapshot: `tests/cli-fixtures/help-snapshots/next.json` is in scope **only** if the split changes any help-emitted symbol; if the help output stays identical, the spec change should be a no-op and the snapshot must not change.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-next-atomic-map.ts
node --strip-types packages/cli/src/commands/next/__tests__/channel-strategy.spec.ts
node --strip-types packages/cli/src/commands/next/__tests__/claim-admission.spec.ts
node --strip-types packages/cli/src/commands/next/__tests__/task-scoped-claim-command.spec.ts
node --strip-types packages/cli/src/commands/next/__tests__/runner-mode.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `node atm.mjs taskflow open --dry-run` then `--write` to open. Use `node atm.mjs taskflow close --dry-run` then `--write` to close. **Do not** use raw `git commit`, `tasks close`, `tasks reconcile`, or `tasks import --write --force` as a normal closing path. If the deliverable diff gate fires, the planning card scope was miscalculated — open a follow-up amendment card rather than force-importing.
