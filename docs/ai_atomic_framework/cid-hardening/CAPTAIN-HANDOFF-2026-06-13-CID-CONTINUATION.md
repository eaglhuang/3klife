---
doc_id: captain_handoff_2026_06_13_cid_continuation
title: "Captain handoff - CID continuation and convergence plan"
status: active
created_at: "2026-06-13T22:15:00+08:00"
planning_repo: "C:/Users/User/3KLife"
target_repo: "C:/Users/User/AI-Atomic-Framework"
handoff_from: "captain"
handoff_to: "next ATM Captain continuation thread"
---

# Captain handoff - CID continuation and convergence plan

This handoff freezes the current conversation at a safe convergence point.

Do not treat this as a final closeout. Treat it as the durable continuation
packet for the next Captain thread.

## One-line strategy

First finish the taskflow operator lane and emergency backend boundary, then
return to the original `tasks.ts` atom extraction lane. Otherwise ATM will keep
paying a high coordination cost every time a worker has to open, close, stage,
or repair a task.

## Current convergence point

Stop here:

- TASK-CID-0072 has useful source implementation already present in the target
  repo working tree.
- Focused and broad validators passed before this handoff.
- `node atm.mjs` reports `ATM_RUNNER_SYNC_REQUIRED`, so the frozen runner is
  behind the source changes.
- Do not continue with taskflow close until `npm run build` is intentionally
  run and the resulting release changes are classified.
- Do not restore, clean, checkout, or delete another agent's active files.

The cleanest next action for the next Captain is:

```powershell
cd C:\Users\User\AI-Atomic-Framework
npm run build
node atm.mjs taskflow close --profile "C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\taskflow.profile.json" --task TASK-CID-0072 --actor captain --dry-run --json
```

Only proceed to `--write` if the dry-run bundle stages exactly the TASK-CID-0072
source files, its `.atm` closeout artifacts, and the matching 3KLife planning
card.

## Non-negotiable operating rules

- `taskflow open` and `taskflow close` are the normal operator lane.
- `tasks close`, `tasks reconcile`, `tasks import --write`,
  `tasks repair-closure`, lifecycle reset, global lock cleanup, out-of-scope
  historical-delivery waiver, stale-runner bypass, and hook bypass are emergency
  backend surfaces.
- Emergency backend surfaces require an ATM emergency lease. A free-form human
  sentence is evidence, not authorization, unless it is converted into a lease.
- `source done`, `planning done`, `mailbox done`, and `worker says done` are not
  governed done. Governed done requires target ledger state, closure packet,
  close event, evidence, and planning mirror agreement when planning authority
  is involved.
- If a file is outside the current task scope, do not restore it. Either leave
  it untouched, request a scope amendment, or isolate it through the official
  taskflow/emergency lane.
- Do not hand-commit delivery or closeout work if taskflow close can perform the
  governed bundle. If a prerequisite fails, fix that prerequisite and return to
  taskflow close.

## Repository state at handoff

### Target repo

Path: `C:/Users/User/AI-Atomic-Framework`

Known dirty classes:

- TASK-CID-0072 source changes:
  - `packages/cli/src/commands/taskflow.ts`
  - `packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
- Runner/release artifacts already dirty from build/sync-related work:
  - `release/atm-onefile/**`
  - `release/atm-root-drop/**`
- Runtime/governance residue from emergency approvals, import repair, lock
  cleanup, and claim events:
  - `.atm/runtime/emergency/**`
  - `.atm/history/task-events/TASK-CID-0072/**`
  - `.atm/history/tasks/TASK-CID-0072.json`
  - lock-cleanup/import reports
- Older unrelated residue exists for TASK-CID-0025, TASK-CID-0047,
  TASK-CID-0048, TASK-CID-0064, TASK-CID-0075, and TASK-CID-0076.
- Do not clean these by hand. Classify them through taskflow close, emergency
  lane, or a dedicated cleanup task.

### Planning repo

Path: `C:/Users/User/3KLife`

Known dirty classes:

- CID plan update:
  - `docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md`
- Open or uncommitted task cards:
  - TASK-CID-0072
  - TASK-CID-0075
  - TASK-CID-0076
- TASK-CID-0074 card has local changes.
- This handoff file is itself a planning artifact and should be committed with
  the next governed planning closeout/sync bundle, not mixed into an unrelated
  target delivery commit.

## TASK-CID-0072 handoff detail

TASK-CID-0072 is the immediate queue head.

Goal:

- Make `taskflow close` mechanically include declared deliverable source files
  in the governed commit bundle.
- Prevent the TASK-CID-0071 failure mode where Captain had to notice that the
  close bundle only staged `.atm` governance and the 3KLife card but omitted the
  actual target source deliverables.
- Make dry-run expose missing deliverables or needed scope amendment before
  write/commit.

Implemented source changes currently present:

- `packages/cli/src/commands/taskflow.ts`
  - Adds a result-contract style `scopeAmendment` proposal to the governed
    commit bundle.
  - Computes target delivery files from declared scope instead of relying on
    LLM judgement.
  - Leaves unrelated outside-scope dirty files out of the bundle.
  - Adds explicit remediation guidance instead of encouraging restore/checkout.
  - Treats extensionless files such as `Dockerfile` as files, not ambiguous
    directories.
- `packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
  - Covers scope amendment fail-closed behavior.
  - Covers extensionless declared file staging.
  - Checks that dry-run guidance says not to restore another agent's work.

Validation already run before this handoff:

```powershell
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
npm run typecheck
npm run validate:cli
git diff --check -- packages/cli/src/commands/taskflow.ts packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
```

All passed.

Dogfood dry-run already showed the intended bundle shape:

- target source deliverables:
  - `packages/cli/src/commands/taskflow.ts`
  - `packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
- target governance artifacts:
  - TASK-CID-0072 task JSON
  - TASK-CID-0072 evidence JSON
  - TASK-CID-0072 closure packet
  - TASK-CID-0072 task-events
- planning repo:
  - TASK-CID-0072 planning card
- unrelated release/runtime files were excluded from target stageFiles.

Blocker before close:

- `ATM_RUNNER_SYNC_REQUIRED` means the frozen runner does not yet include the
  source changes. Run `npm run build`, then rerun taskflow close dry-run through
  `node atm.mjs`.

Recommended close sequence:

```powershell
npm run build
node atm.mjs taskflow close --profile "C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\taskflow.profile.json" --task TASK-CID-0072 --actor captain --dry-run --json
node atm.mjs evidence run --task TASK-CID-0072 --actor captain -- npm run validate:cli
node atm.mjs evidence run --task TASK-CID-0072 --actor captain -- node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
node atm.mjs evidence run --task TASK-CID-0072 --actor captain -- node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
node atm.mjs taskflow close --profile "C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\taskflow.profile.json" --task TASK-CID-0072 --actor captain --write --json
```

If `evidence run` syntax differs in the frozen runner, inspect
`node atm.mjs evidence --help`; do not fall back to plain terminal-only
validation as final evidence.

## CID runtime status snapshot

Observed from target runtime at handoff:

| Task | Runtime state | Handoff meaning |
| --- | --- | --- |
| TASK-CID-0003 | missing | Planning card exists but no target runtime record. Needs audit before any dependency claim trusts it. |
| TASK-CID-0025 | blocked | Broker-owned write actor runtime boundary has residue/events. Treat as a later cleanup lane, not queue-head for 0072. |
| TASK-CID-0040 | done | Claimed repaired/closed. Still include in 0040-0047 final audit. |
| TASK-CID-0041 | done | Reconciled with historical delivery and waiver. Trusted enough for downstream unblock. |
| TASK-CID-0042 | done | Closed and committed by worker report. |
| TASK-CID-0043 | done | Reconciled/closed after stale-import source-done gap. |
| TASK-CID-0044 | done | Reconciled/closed after ungoverned delivery gap. |
| TASK-CID-0045 | done | Reconciled/closed after ungoverned delivery gap. |
| TASK-CID-0046 | done | Dependency closeout gate hardening complete. |
| TASK-CID-0047 | review | Still not governed done. Requires TASK-CID-0076 style review-state closeout-only reclaim or equivalent. |
| TASK-CID-0048 | done | Task close lifecycle/evidence hard gate complete. |
| TASK-CID-0049 | done | Historical delivery scoped provenance hardening complete. |
| TASK-CID-0050 | done | Read-only atomic map inventory complete. |
| TASK-CID-0051 | done | Characterization/regression pack complete. |
| TASK-CID-0052 | done | Closeout provenance atom extraction complete. |
| TASK-CID-0053 | done | Dependency gate atom extraction complete. |
| TASK-CID-0054 | missing | Planning card exists, target runtime import absent. |
| TASK-CID-0055 | missing | Planning card exists, target runtime import absent. |
| TASK-CID-0056 | missing | Planning card exists, target runtime import absent. |
| TASK-CID-0057 | missing | Planning card exists, target runtime import absent. |
| TASK-CID-0058 | missing | Planning card exists, target runtime import absent. |
| TASK-CID-0059 | missing | Planning card exists, target runtime import absent. |
| TASK-CID-0060 | done | Source-done vs governed-done hard gate complete. |
| TASK-CID-0061 | done | Public tasks command surface invariant gate complete. |
| TASK-CID-0062 | missing | Still important, but should wait until operator/close lane is stable. |
| TASK-CID-0063 | done | taskflow open/close default lane and bundle foundation complete. |
| TASK-CID-0064 | done | Repair-closure missing packet recovery complete. |
| TASK-CID-0065 | done | Emergency maintenance lease system complete enough to use. |
| TASK-CID-0066 | done | New user workflow guide complete. |
| TASK-CID-0067 | done | Planning-repo authority close verification complete. |
| TASK-CID-0068 | done | taskflow close auto-commit/index isolation hardening complete. |
| TASK-CID-0069 | done | taskflow close normal-lane E2E dogfood complete. |
| TASK-CID-0070 | done | Emergency lease audit/use record hardening complete. |
| TASK-CID-0071 | done | Atom-map refactor skill v1.0 complete. |
| TASK-CID-0072 | running | Current active queue head. Finish this first. |
| TASK-CID-0073 | done | Operator guidance/backend wording normalization complete, but worker admitted some bypassed commit paths. |
| TASK-CID-0074 | done | Profile-root fallback for source.planPath missing reportedly complete; planning card still locally modified. |
| TASK-CID-0075 | planned | Evidence operator lane simplification next candidate after 0072/0076. |
| TASK-CID-0076 | planned | Review-state closeout-only done lifecycle repair needed before clean 0047 closure. |

## Short-term plan

### S1 - Close TASK-CID-0072

Purpose:

- Convert "Captain notices missing source deliverables" into deterministic CLI
  bundle calculation.
- Reduce the chance that agents restore someone else's active files just to get
  past close gate.

Steps:

1. Build frozen runner.
2. Rerun taskflow close dry-run.
3. Confirm bundle contains exactly 0072 source deliverables plus governance and
   planning artifacts.
4. Record command-backed evidence.
5. Run `taskflow close --write`.
6. Verify no unrelated release/runtime files were staged or committed as part of
   0072 unless taskflow explicitly includes them and the task scope allows it.

### S2 - Close or stabilize TASK-CID-0076

Purpose:

- Fix the review-state closeout-only dead-end.
- Enable TASK-CID-0047 to close without reset/import hacks.

Important:

- Use 0065 emergency only if required to repair placeholder import/scope.
- Do not use 0076 as an excuse to broaden lifecycle reset.
- It should point review-state closeout toward governed reclaim, not backend
  bypass.

### S3 - Return to TASK-CID-0047

Purpose:

- Finish the old closeout forensics/root-cause task.
- Confirm 0040-0046 are trusted governed done and not only source/planning done.

Required before closing:

- Re-run status/residue check for 0040-0047.
- Confirm 0047 authority is planning repo or target repo according to card and
  runtime.
- Use repaired review-state path from 0076 if available.

### S4 - Decide whether TASK-CID-0075 comes before 0062

Recommendation:

- Do 0075 before 0062 if evidence UX still causes workers to bypass taskflow
  close.
- Do 0062 only after taskflow close/evidence/operator lane is stable enough that
  workers stop using backend commands as normal workflow.

## Medium-term plan

### M1 - Finish operator lane hardening

Relevant tasks:

- TASK-CID-0072: deterministic delivery bundle.
- TASK-CID-0075: evidence operator lane simplification.
- TASK-CID-0076: review-state closeout-only reclaim.

Goal:

- A normal worker should be able to open, claim, validate, evidence, close, and
  commit without remembering backend repair commands.

Acceptance theme:

- If taskflow close fails on identity/evidence/scope/readiness, it should return
  a clear prerequisite and then allow the operator to return to taskflow close.
- It must not psychologically push workers toward direct `git commit`,
  `node atm.mjs git commit`, `tasks close`, or `tasks reconcile`.

### M2 - Reconcile the 0040-0047 historical chain

Known facts:

- 0041/0043/0044/0045 needed historical-delivery repair.
- 0047 remains review, likely waiting on a closeout-only reclaim path.
- Earlier confusion came from treating planning done or source done as governed
  done.

Goal:

- Produce one final audit note proving 0040-0047 are either governed done or
  explicitly deferred with reason.

Do not:

- Force-close 0047 before the lifecycle path exists.
- Rewrite historical delivery commits.
- Use broad waiver unless the taskflow/emergency result says it is the smallest
  valid repair.

### M3 - Return to the original atom extraction sequence

After operator lane stabilizes, resume:

```text
TASK-CID-0054
TASK-CID-0055
TASK-CID-0056
TASK-CID-0057
TASK-CID-0058
TASK-CID-0059
TASK-CID-0062
```

Recommended order:

1. TASK-CID-0054 lifecycle state machine atom extraction.
2. TASK-CID-0055 historical delivery atom extraction.
3. TASK-CID-0056 scope lock and dirty diagnostic atom extraction.
4. TASK-CID-0057 residue diagnostic atom extraction.
5. TASK-CID-0058 thin CLI wrapper.
6. TASK-CID-0059 final validation.
7. TASK-CID-0062 larger governance module extraction behind the 0061 public
   surface.

Reason:

- 0062 is tempting, but too broad while close/operator behavior is still being
  actively patched.

## Long-term CID plan

### L1 - Make taskflow the only normal lifecycle lane

End-state:

- Humans can say a feature request in natural language.
- AI drafts or resolves a task card.
- `taskflow open --write` creates the planning card and imports runtime state.
- `next --claim` claims scoped work.
- implementation runs inside the scope.
- `evidence run` records validators.
- `taskflow close --write` stages and commits target + planning bundles.

Backend commands remain available only as emergency tools with lease audit.

### L2 - Make scope amendments mechanical and non-destructive

End-state:

- When work legitimately needs an undeclared test, fixture, snapshot, or helper,
  taskflow dry-run proposes a scope amendment.
- Workers do not restore outside-scope dirty files.
- Captains do not need to guess whether close gate is wrong or scope is
  incomplete.

TASK-CID-0072 is the first concrete piece of this.

### L3 - Make evidence capture a first-class operator experience

End-state:

- `evidence run` is the default documented lane.
- `evidence add` is clearly an admin/raw surface.
- Taskflow close can explain missing evidence and the exact command to record
  it.

TASK-CID-0075 should own this.

### L4 - Shrink `tasks.ts` by invariant, not by line count

Use the atom/map refactor skill created by TASK-CID-0071.

Patterns to preserve atom semantics:

- Policy Object for allow/block/waive/recover decisions.
- Strategy Map for residue bucket, close mode, emergency permission, and
  closeback route selection.
- Result Contract Object for bundles, evidence, residue diagnosis, and closure
  packets.
- Facade only for operator lanes such as taskflow open/close.
- Adapter/Port only for planning repo and host-specific boundaries.

Do not create a big anonymous pipeline that merely moves complexity from
`tasks.ts` into another long file.

### L5 - Reduce hidden governance cost

ATM must feel like low invisible cost. The main hidden costs discovered in this
CID wave were:

- queue-head blocked by old reconcile residue;
- stale locks blocking unrelated future work;
- direct backend commands being too easy to use;
- close bundle requiring Captain judgement to decide stage files;
- evidence collection scattered across manual commands;
- planning repo and target repo drifting after separate commits;
- agents restoring files they did not own to satisfy close gates.

Every remaining CID task should be judged by whether it reduces one of these
costs without weakening governance.

## Lessons from the 004/007/008 collision

Problem:

- 004 had active source edits.
- 007, while trying to close 0072, restored files to HEAD to get past perceived
  out-of-scope or validate failures.
- 008 later detected that the problem was not test teardown but human/agent
  restore actions plus launcher/build drift.

Root causes:

- Task scopes are often incomplete at open time.
- Close gate correctly blocks undeclared files, but does not yet provide a
  smooth scope-amendment path.
- Agents treat outside-scope dirty files as obstacles instead of someone else's
  active work.
- Taskflow close was not self-healing enough, so workers fell back to lower
  surfaces and manual commits.

Policy:

- Never restore another agent's files.
- Incomplete scope is not a license to clean the worktree.
- The correct response is scope amendment, taskflow dry-run bundle review, or
  emergency lease.

Product fixes mapped to tasks:

- TASK-CID-0072: scope amendment and declared delivery bundle.
- TASK-CID-0075: evidence lane simplification.
- TASK-CID-0076: review-state closeout-only reclaim.
- TASK-CID-0056: deeper scope lock/dirty diagnostic atom extraction.
- TASK-CID-0065/0070: emergency backend lease and use audit.

## What not to do next

- Do not jump straight to TASK-CID-0062 while 0072 is still running.
- Do not close TASK-CID-0047 by reset/import workaround if 0076 can provide the
  normal lifecycle repair.
- Do not commit release artifacts together with 0072 source unless the close
  bundle explicitly and correctly includes them.
- Do not treat 0073 as proof that workers will naturally follow operator lanes;
  its own worker report admitted backend/plain commit bypass.
- Do not assume old dirty `.atm` events are harmless. Classify them before
  staging.
- Do not manually edit `.atm/history/**`.

## Recommended dispatch use

Good sidecar work:

- read-only status audits;
- focused validator matrix design;
- diff/scope classification reports;
- planning card review;
- post-close verification.

Bad sidecar work:

- active source edits in the same files as Captain;
- cleaning dirty files;
- restore/checkout/reset;
- backend lifecycle mutation without explicit emergency lease.

If dispatching:

- 007 can take focused implementation only after Captain owns the scope and
  file list is explicit.
- 008 is useful for preflight/report/test matrix work.
- 004 is useful for docs/operator workflow work, but must be reminded not to
  bypass taskflow close.

## Next Captain checklist

1. Read this file.
2. Read `README.md`.
3. Run:

```powershell
node atm.mjs next --prompt "Continue CID hardening from CAPTAIN-HANDOFF-2026-06-13-CID-CONTINUATION" --json
```

4. Confirm current git statuses in both repos.
5. Finish TASK-CID-0072 or explicitly release it before touching another source
   task.
6. After 0072, decide between TASK-CID-0076 and TASK-CID-0075 based on whether
   0047 closure or evidence UX is the more immediate blocker.
7. Only then return to 0054-0059 and 0062.

