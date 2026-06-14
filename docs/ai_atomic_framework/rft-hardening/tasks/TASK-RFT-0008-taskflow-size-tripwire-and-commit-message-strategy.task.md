---
doc_id: doc_rft_0008
task_id: TASK-RFT-0008
title: "taskflow.ts size tripwire and commit-message Strategy Map"
status: done
owner: atm-core
priority: P2
milestone: RFT-M1
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
completed_at: "2026-06-14T13:30:33Z"
completed_by_agent: "captain-teamagents"
delivery_commit: "56413eea628c5078675aa877e052f474143d5729"
closure_commit: "16feaf01552ab171f555f96451a8c0e6ede3c638"
runner_sync_commit: "637cfcb87d57c1290e7cafaf1993fbe9f98d54e3"
closure_packet: ".atm/history/evidence/TASK-RFT-0008.closure-packet.json"
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/commit-messages.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-taskflow-size-tripwire.ts"
  - "docs/specs/taskflow-profile-v1.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/commit-messages.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-taskflow-size-tripwire.ts"
  - "docs/specs/taskflow-profile-v1.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-taskflow-size-tripwire.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if commit message templates change or if the size tripwire fires false-positive on a clean baseline."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-commit-message-strategy"
  mapUpdates:
    - "docs/specs/taskflow-profile-v1.md"
outOfScope:
  - "Splitting taskflow.ts itself (deferred until tripwire fires)"
  - "Changing taskflow open or taskflow close runtime behavior"
  - "Changing writeReadinessHint contract (TASK-CID-0073 owns it)"
nonGoals:
  - "Do not add a full host-customization layer for commit messages — only the Strategy Map seam."
  - "Do not change the default commit message strings; this card locks the current behavior."
---

# TASK-RFT-0008 - taskflow.ts size tripwire and commit-message Strategy Map

## Goal

Lock in the current `taskflow.ts` (1,642 lines) behavior with two small additions: (a) extract commit-message templates into a Strategy Map so future host customization has a single seam, and (b) add a size tripwire validator that fails the build when `taskflow.ts` crosses 2,200 lines, naming this card as the next-step.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill (`Strategy Map` lightweight). Per casebook RFT-0008 forward case:

1. **`taskflow/commit-messages.ts`** — **Strategy Map** keyed by repo role: `{ target: (taskId) => string, planning: (taskId) => string }`. Default templates are exactly the current hardcoded strings:
   - target: `` `chore(taskflow): close ${taskId} target governance bundle` ``
   - planning: `` `docs(taskflow): close ${taskId} planning bundle` ``
   - Allow a future profile override via `delegation.policy.commitMessage.targetTemplate` and `planningTemplate` (declare the schema **but do not consume** it in this card — that consumption is a follow-up).
2. **`taskflow.ts`** — replaces the two inline string template lines with a call to the strategy module. No other change.
3. **`scripts/validate-taskflow-size-tripwire.ts`** — fails when `taskflow.ts` line count exceeds **2,200**, naming TASK-RFT-0008 as the gate that needs to be revisited (i.e. a real refactor card opened).
4. **`docs/specs/taskflow-profile-v1.md`** — adds a brief paragraph documenting the (optional, not yet consumed) `commitMessage.targetTemplate` / `planningTemplate` profile fields.

## Required Behavior

- `taskflow close --write` produces the exact same commit messages as before this card.
- `validate-taskflow-size-tripwire.ts` exits 0 at current line count.
- The Strategy Map signature is documented in `docs/specs/taskflow-profile-v1.md` so future cards can wire it up.

## Testing Requirements

- `commit-messages.spec.ts`:
  - one default target template case (`taskId = TASK-RFT-0008`);
  - one default planning template case;
  - one override case (Strategy Map receives a profile-provided template) showing the override applies;
  - one override-missing case (profile has no commitMessage field) showing the default still fires;
  - one variable-substitution case asserting `${taskId}` literal interpolation is NOT supported (templates are functions, not strings, to prevent format-string injection).
- `taskflow-dryrun.spec.ts` extension (additive to the file TASK-CID-0073 wrote):
  - one case asserting that the auto-commit fixture's commit messages match the Strategy Map default exactly.

Add `scripts/validate-taskflow-size-tripwire.ts` with the following behavior:
- count `taskflow.ts` lines;
- if count exceeds 2,200, print `ATM_TASKFLOW_SIZE_TRIPWIRE_FIRED` with a pointer to this card and exit 1;
- otherwise print `[taskflow-size-tripwire] ok (<count>/<2200>)` and exit 0.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-taskflow-size-tripwire.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`. This card explicitly exercises the closing path it documents.

## Completion Notes

- Target repo delivery commit: `56413eea628c5078675aa877e052f474143d5729`
- Target repo closure commit: `16feaf01552ab171f555f96451a8c0e6ede3c638`
- Runner sync steward commit: `637cfcb87d57c1290e7cafaf1993fbe9f98d54e3`
- Closure packet: `.atm/history/evidence/TASK-RFT-0008.closure-packet.json`
- Team Agents dogfood: `team plan`, `team validate`, and `team start` were used; team run id `team-71c0d5c2fd25`.
- Bug backlog entries added: `BUG-ATM-0032` through `BUG-ATM-0035`.
