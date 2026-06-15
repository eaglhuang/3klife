# Captain Handoff - Team Agents 0016 Continuation

Created: 2026-06-15
Owner: ATM Captain
Target repo: `C:\Users\User\AI-Atomic-Framework`
Planning repo: `C:\Users\User\3KLife`
Status: active continuation, new blank thread ready

## New Thread Opening Prompt

Paste this into the new blank Codex conversation:

```text
You are a new ATM Captain continuation thread.

Planning repo: C:\Users\User\3KLife
Target repo: C:\Users\User\AI-Atomic-Framework

Do not assume any prior chat history. Start only from this handoff document, the current local workspace state, and the files listed below.

First read:
1. C:\Users\User\3KLife\docs\keep.summary.md
2. C:\Users\User\3KLife\docs\ai_atomic_framework\ATM_BUG_OPTIMIZATION_BACKLOG.md
3. C:\Users\User\3KLife\docs\ai_atomic_framework\ATM_CAPTAIN_ACTIVE_SEQUENCE.md
4. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\TEAM_AGENTS_CAPTAIN_LED_SOP.md
5. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\CAPTAIN-HANDOFF-2026-06-15-TEAM-AGENTS-0016-CONTINUATION.md
6. C:\Users\User\AI-Atomic-Framework\README.md

Then run from C:\Users\User\AI-Atomic-Framework:
node atm.mjs next --prompt "Continue Team Agents 0016 captain handoff 2026-06-15" --json

If ATM_RUNNER_SYNC_REQUIRED appears, do not bypass with atm.dev.mjs. Record the state first, then decide whether a Runner Sync Steward build is needed.

Report first:
- the key handoff state you read
- whether TASK-TEAM-0016 is actually implemented in source
- both repo dirty states
- the first command or repair action you will execute
```

## Dispatch Compliance

- Skill used: `atm-dispatch`
- Delegation mode for this handoff: `local`
- Internal sidecar remains default for read-only review, preflight, grep, checklist, and post-report verification.
- External dispatch is opt-in only.
- External write is forbidden unless the user explicitly grants write authority and scope.
- Do not call ATM "AAF"; ATM is the product/framework/CLI/governance workflow. AI-Atomic-Framework is only the repo name.

## Current Situation

The interrupted thread was trying to continue Team Agents work after user-approved emergency close authority. The immediate issue is that `TASK-TEAM-0016` appears to have closure ledger residue in the target repo, but source implementation is not present in `packages/cli/src/**`.

Important: do not assume the prior worker report "TASK-TEAM-0016 completed" is true until source is verified.

Observed target repo status before handoff:

```text
C:\Users\User\AI-Atomic-Framework

A  .atm/history/evidence/TASK-TEAM-0016.json
A  .atm/history/task-events/TASK-TEAM-0016/2026-06-14T16-38-24-425Z-close-2eae87c33dad.json
A  .atm/history/task-events/TASK-TEAM-0016/2026-06-14T16-39-09-467Z-close-05befa5ec7ac.json
A  .atm/history/tasks/TASK-TEAM-0016.json
M  release/atm-onefile/atm.mjs
M  release/atm-onefile/release-manifest.json
M  release/atm-root-drop/** several TEAM-0015/next/team generated files
?? .atm/history/task-events/TASK-TEAM-0016/** additional import/reserve/promote/claim/release/close events
```

Observed planning repo status:

```text
C:\Users\User\3KLife

M docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md
?? docs/ai_atomic_framework/team-agents/CAPTAIN-HANDOFF-2026-06-15-TEAM-AGENTS-0016-CONTINUATION.md
```

Do not restore, checkout, clean, or rewrite these dirty files without explicit user approval. Treat them as active work or residue.

## What Was Verified

The previous Captain checked:

- `node atm.mjs next --prompt "continue" --json` returned `ATM_NEXT_PROMPT_GUIDANCE_REQUIRED`.
- `node atm.mjs guide --goal "continue" --json` returned `ATM_GUIDE_READY`.
- `node atm.mjs orient --json` returned a ready framework orientation.
- `node atm.mjs next --json` showed no open imported task queue and a stale guidance session about emergency approve.

The previous Captain searched source for `teamSummary`, `ClosureTeamSummary`, `buildClosureTeamSummary`, and related strings. No source implementation was found in:

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/evidence.ts`
- `packages/cli/src/commands/framework-development/closure-packet-schema.ts`
- `scripts/validate-team-agents.ts`
- `scripts/validate-task-ledger-governance.ts`

Current conclusion: `TASK-TEAM-0016` is not implemented in source, despite `.atm/history` close residue and worker report text.

## User Intent To Preserve

The user approved a short-term emergency close path because closeback evidence / transition event sequencing created a closure loop. That approval was intended to let task close converge, not to fabricate completion when source deliverables are missing.

The user also explicitly wants:

- Keep Team Agents as the product priority.
- Use internal cheap sidecars plus external workers where useful.
- Default cheap worker model should be GPT-5.4-mini; use GPT-5.4 only for harder lifecycle/core tasks.
- Record ATM bugs and friction in `C:\Users\User\3KLife\docs\ai_atomic_framework\ATM_BUG_OPTIMIZATION_BACKLOG.md`.
- Do not let MAO/RFT eclipse Team Agents, though RFT may be interleaved as risk reduction.

## Critical Task State

### TASK-TEAM-0015

Worker report said complete:

- Adds advisory `teamRecommendation` to `next` / playbook output.
- Touches `team.ts`, `next.ts`, `team.spec.ts`, `path-to-atom-map.json`, validators.
- Reported validators pass.
- Reported `node atm.mjs next --json` still showed `ATM_RUNNER_SYNC_REQUIRED`.
- Work was not cleanly integrated by the previous Captain before interruption.

Check actual source before relying on this.

### TASK-TEAM-0016

Planning card:

`C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\tasks\TASK-TEAM-0016-closure-packet-team-summary-integration.task.md`

Target ledger file exists and says status `review`, but claim was released with reason:

```text
close-out blocked by missing real 0016 source deliverables; retain review state and handoff
```

This is the strongest signal: source work is missing and the ledger residue should not be treated as final closure.

TASK-TEAM-0016 intended deliverables:

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/evidence.ts`
- `scripts/validate-task-ledger-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

The worker report claimed these functions/types should exist:

- `atm.closureTeamSummary.v1`
- `ClosureTeamSummary`
- `buildClosureTeamSummary()`
- `attachTeamSummaryToClosurePacket()`
- `readClosureTeamSummaryFromPacket()`
- `readTaskClosureAuxiliaryTeamSummary()`
- `scripts/validate-team-agents.ts --case closure-summary`

They were not found in source during the interrupted thread.

### TASK-TEAM-0014

008 reported that `TASK-TEAM-0014` patrol command/source was missing. The Captain/user direction was that `TASK-TEAM-0016` should not hard-depend on 0014. Team summary may optionally include patrol findings later, but must not require 0014 to close.

Do not block 0016 solely because 0014 is missing.

## Recommended Next Action

First do a read-only verification pass in the new thread:

```powershell
cd C:\Users\User\AI-Atomic-Framework
git status --short
rg -n "ClosureTeamSummary|closureTeamSummary|teamSummary|buildClosureTeamSummary|attachTeamSummaryToClosurePacket|readTaskClosureAuxiliaryTeamSummary|closure-summary" packages/cli/src scripts atomic_workbench
Get-Content .atm/history/tasks/TASK-TEAM-0016.json
```

Then make one of these decisions:

1. If source implementation is still missing, implement `TASK-TEAM-0016` in source, but do not trust the existing close residue as proof.
2. If source implementation appears after another worker sync, run validators and reconcile the closure residue.
3. If dirty release outputs are only stale runner sync from previous cards, do not mix them into the 0016 source delivery. Treat release outputs as Runner Sync Steward work.

## Implementation Shape For TASK-TEAM-0016

Keep the design light:

- Team summary is auxiliary context, not command-backed proof.
- It must not satisfy missing validators.
- It must not mark failed validators as passed.
- Closure gates remain based on `commandRuns`, `validationPasses`, and existing close evidence.
- Batch checkpoint and single-task close should both return/preserve the auxiliary summary when present.

Suggested source changes:

- In `closure-packet-schema.ts`, add optional `teamSummary?: ClosureTeamSummary | null` to `ClosurePacket`.
- Add validation for shape only if present; absence must be valid.
- In `team.ts`, add builders/readers:
  - `buildClosureTeamSummary(input)`
  - `attachTeamSummaryToClosurePacket(packet, summary)`
  - `readClosureTeamSummaryFromPacket(packet)`
- In `tasks.ts`, when creating a closure packet for `tasks close` and `tasks reconcile`, attach the auxiliary team summary if available.
- In `batch.ts`, include `closureTeamSummary` from close/deliver evidence in checkpoint and deliver-and-close evidence.
- In `evidence.ts`, expose read-only helper `readTaskClosureAuxiliaryTeamSummary(cwd, taskId)`.
- In `scripts/validate-team-agents.ts`, add `--case closure-summary`.
- In `scripts/validate-task-ledger-governance.ts`, add a regression that optional `teamSummary` does not weaken closure packet validation.
- Update `atomic_workbench/atomization-coverage/path-to-atom-map.json`.

Suggested validators:

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
node --strip-types scripts/validate-team-agents.ts --case closure-summary
git diff --check
```

If source changes make frozen runner stale, use the Runner Sync Steward pattern:

```powershell
npm run build
node atm.mjs next --prompt "Verify Team Agents 0016 after runner sync" --json
```

Do not use `node atm.dev.mjs` to hide stale frozen runner state.

## Bugs / Friction To Record Or Preserve

The new Captain should check and update:

`C:\Users\User\3KLife\docs\ai_atomic_framework\ATM_BUG_OPTIMIZATION_BACKLOG.md`

Relevant issues from this handoff:

- `BUG-ATM-0053` / `BUG-ATM-0042`: normal playbook and close dirty-worktree gate mismatch.
- `BUG-ATM-0049` / `BUG-ATM-0047`: stale broker intents can block Team plan.
- `BUG-ATM-0045`: stale sibling planning root, reportedly fixed by external worker but needs Captain integration/verification.
- 0016-specific: closeout can create ledger/transition residue even when source deliverables are missing. This should become a bug/backlog item if not already present.
- `next --prompt "continue"` is too vague and routes to generic guide; new Captain should use task-scoped prompts.

## Do Not Do

- Do not restore, checkout, or clean AI-Atomic-Framework dirty files unless the user explicitly approves.
- Do not commit `release/**` together with source deliverables unless this is an explicit runner sync commit.
- Do not let a worker edit `C:\Users\User\3KLife/**` while implementing target repo source.
- Do not rely on chat claims that a task is done. Verify source, validators, ledger, and closure packet.
- Do not make `TASK-TEAM-0016` depend on `TASK-TEAM-0014` patrol implementation.
- Do not use `atm.dev.mjs` as an ordinary workaround for `ATM_RUNNER_SYNC_REQUIRED`.

## Suggested First Captain Report

The new Captain should report something like:

```text
I read the handoff and keep summary. Key judgment: TASK-TEAM-0016 currently has close/ledger residue, but source implementation is not yet proven. I will first run read-only grep + git status + task ledger checks, then decide whether to implement 0016 or reconcile existing worker changes.

First command:
cd C:\Users\User\AI-Atomic-Framework
git status --short
```

