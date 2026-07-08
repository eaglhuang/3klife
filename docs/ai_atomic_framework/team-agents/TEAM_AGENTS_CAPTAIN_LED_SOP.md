# Team Agents Captain-Led SOP

Created: 2026-06-14
Owner: ATM Captain
Status: active
Scope: immediate-use Team Agents workflow before full runtime orchestration

## Purpose

This SOP makes Team Agents usable now, before automated `team start` spawning and full team runtime are complete.

The operating model is Captain-led semi-automation:

- Captain owns task ordering, import/claim setup, scope control, review, runner sync, planning mirror updates, and bug backlog.
- Read-only sidecars perform preflight, scope review, validator merge analysis, and post-report checks.
- Workers implement one bounded task card at a time inside strict allowed files.

Team Agents accelerate governed work. They do not replace ATM `next`, task lifecycle, evidence, closure packets, Git governance, or runner sync stewardship.

## Governance Position

This SOP is an operating guide for Captain-led execution. It is not a replacement truth source for task scope, architecture, or release approval.

Use the following precedence when a decision conflicts:

1. ATM route result, task ledger, and closure authority
2. task card `scopePaths` / `deliverables` / `validators` / `rollback`
3. ADR, repo keep, and explicit human sign-off conditions
4. this SOP and local Team Agents planning docs

Captain may auto-decide only low-risk, reversible, already-documented execution choices that do not expand authority or change governance boundaries.

Captain must stop and route to human sign-off or ADR when work touches:

- security policy or permission model changes;
- audit integrity, evidence retention, or fail-closed boundaries;
- production or official dataset access;
- vendor, architecture, storage, or identity-system selection;
- irreversible rollout, closeout exception, or policy downgrade.

## When To Use

Use this SOP for:

- one explicit ATM task card;
- template, docs, validator, small CLI contract, or focused refactor work;
- read-only preflight before external implementation;
- tasks with clear `scopePaths`, `deliverables`, and validators.

Do not use this SOP as a substitute for:

- full batch queue processing;
- automatic subagent spawning from ATM runtime;
- concurrent writes to the same shared source file;
- generated runner ownership by normal workers;
- broad refactors without a task card and current ATM route.

## Required Task Contract

Before dispatching a worker, Captain should confirm the active card or brief clearly states:

- `scopePaths`
- `deliverables`
- `validators`
- `outOfScope`
- `nonGoals`
- rollback or revert expectation
- reviewer / validator assignment
- human sign-off or ADR gate when required

If these fields are missing or contradictory, Captain should repair the planning artifact before implementation dispatch.

## Roles

| Role | Default model | Writes? | Duties |
|---|---:|---|---|
| Captain | current captain model | yes, narrowly | Route, import, claim setup, assign workers, review, close integration, runner sync, planning mirror, bug backlog |
| Read-only sidecar | GPT-5.4-mini | no | Preflight task route, allowed files, shared validators, atom map, hidden blockers |
| Worker | GPT-5.4-mini | yes, strict scope | Implement the task card, run validators, report blockers |
| Hard task worker | GPT-5.4 | yes, strict scope | Use only for lifecycle, core runner, shared refactor, failing validator diagnosis |
| Runner Sync Steward | Captain or explicit steward | yes, release only | Run `npm run build`, validate frozen `node atm.mjs`, commit `release/**` separately |

## Standard Flow

1. Captain route check
   - Read framework `README.md`.
   - Run `node atm.mjs next --prompt "<task or goal>" --json`.
   - Read `evidence.nextAction.playbook`.
   - Confirm the selected task id, target repo, allowed files, and closure authority.

2. Planning mirror check
   - Read the 3KLife task card.
   - Trust target repo ATM ledger for official closure.
   - If Markdown mirror says `planned` but ledger says `done`, sync the mirror before dispatching more work.

3. Read-only sidecar preflight
   - Use GPT-5.4-mini.
   - No claim, no write, no commit, no close.
   - Ask for allowed files, shared-file risk, validator extension point, existing entries, and likely ATM friction.

4. Captain setup
   - Import only the selected Markdown task card.
   - Dry-run first:
     ```powershell
     node atm.mjs tasks import --from "<absolute task card path>" --dry-run --json
     ```
   - If metadata is malformed, fix the planning task card before write import.
   - Write import:
     ```powershell
     node atm.mjs tasks import --from "<absolute task card path>" --write --json
     ```
   - Set actor identity before commit:
     ```powershell
     node atm.mjs identity set --actor "<actor>" --git-name "<name>" --git-email "<email>" --json
     ```
   - Claim:
     ```powershell
     node atm.mjs next --claim --actor <actor> --prompt "<task prompt>" --json
     ```
   - Commit setup through ATM wrapper and push before resuming the worker.

5. Worker implementation
   - Worker syncs latest main first.
   - Worker reruns `node atm.mjs next --prompt "<task prompt>" --json`.
   - Worker edits only allowed files.
   - Worker does not edit `C:/Users/User/3KLife/**`.
   - Worker does not hand-edit `.atm/runtime/**` or `.atm/history/**`.
   - Worker does not modify `release/**`.
   - If `ATM_RUNNER_SYNC_REQUIRED` appears, worker must HOLD and report.

6. Evidence and close
   - Run focused validators first.
   - Add command-backed evidence with `node atm.mjs evidence run`.
   - If `tasks close` reports missing evidence, add exactly the missing command evidence.
   - If close reports dirty in-scope files, commit scoped delivery first, then close.
   - Commit closure artifacts separately when the wrapper requires task context.

7. Runner Sync Steward
   - If frozen runner sync is required, Captain/steward runs:
     ```powershell
     npm run build
     node atm.mjs next --prompt "<verification prompt>" --json
     ```
   - Commit `release/**` separately.
   - Do not mix runner sync with source delivery unless ATM explicitly requires it.

8. Planning mirror and bug backlog
   - Update 3KLife task card status after target closure.
   - Record implementation commit, closure commit, runner sync commit if any.
   - Add any ATM friction to `ATM_BUG_OPTIMIZATION_BACKLOG.md`.

## Violation Blocking Rules

Captain must block progress instead of "soft allowing" when any of the following appears:

- requested edits exceed allowed files or route authority;
- validator failed, evidence is missing, or command claims cannot be reproduced;
- reviewer independence is required but cannot be demonstrated;
- worker tries to treat advisory review as validator pass;
- a bridge, adapter, or worker attempts to self-grant write, close, or evidence authority;
- broker / steward / CID route says hold, blocked, or needs conflict handling;
- task card and ledger disagree on whether work is still open or already closed.

The default blocked outcomes are:

- rework inside the same task when scope and authority are still valid;
- escalate to Captain review when the issue is coordination or evidence shape;
- escalate to human / ADR when the issue changes governance, security, audit, data, or release boundary.

## Dispatch Prompt Template

Use this for external workers:

```text
You are <actor> worker, model budget GPT-5.4-mini.
Work in C:\Users\User\AI-Atomic-Framework on <TASK-ID>.
You are not alone in the repo; do not revert others' changes.

Captain has imported/claimed setup commit <sha>. First run:
1. git status --short --branch
2. git pull --ff-only
3. node atm.mjs next --prompt "<task prompt>" --json

Allowed files:
- <file>
- <file>
- ATM CLI generated .atm/history files for <TASK-ID> only

Forbidden:
- C:/Users/User/3KLife/**
- hand edits to .atm/runtime/**
- hand edits to .atm/history/**
- release/**

If ATM_RUNNER_SYNC_REQUIRED appears, HOLD and report. Do not run npm run build.

Run validators:
- <validator>
- git diff --check

Close only after deliverables exist and evidence is command-backed:
node atm.mjs tasks close --task <TASK-ID> --actor <actor> --status done --json

Commit through ATM wrapper if required.
Report changed files, commands, close/commit/push status, and ATM friction.
```

## Read-Only Sidecar Prompt Template

```text
You are a read-only sidecar, model budget GPT-5.4-mini.
Do not claim, write, commit, close, or spawn agents.

For <TASK-ID>, report:
- route status from node atm.mjs next --prompt "<task prompt>" --json
- allowed files and forbidden files
- shared-file or validator merge risks
- existing template / atom map / test patterns
- exact implementation brief for the worker
- ATM friction or confusing output
```

## Current Known Friction

These are expected until fixed:

- Markdown task import may need Captain exact-path setup.
- `identity set` can show a prior actor session in output.
- Read-only preflight routes may still print implementation claim language.
- Template paths can be ignored and require `git add -f`.
- New Markdown files may contain UTF-8 BOM; check before commit.
- Evidence / close / commit often needs a two-commit pattern:
  - scoped delivery commit;
  - close/evidence commit.
- Frozen runner sync belongs to Captain/steward, not normal workers.
- Closure packets can still mention advisory runner diff until that bug is fixed.

## Immediate Task Selection Rule

After `TASK-TEAM-0004`, `TASK-TEAM-0005`, and `TASK-TEAM-0006`:

1. Use this SOP immediately for small Team Agents and RFT cards.
2. Prefer `TASK-RFT-0008` next for risk reduction.
3. Then return to `TASK-TEAM-0017` to formalize template schema / validator contract.
4. Do not start full Team runtime cards until `TASK-RFT-0003` reduces lifecycle risk.
