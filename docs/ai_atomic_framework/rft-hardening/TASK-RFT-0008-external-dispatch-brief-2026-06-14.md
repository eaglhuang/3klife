# TASK-RFT-0008 External Dispatch Brief

Dispatch date: 2026-06-14
From: ATM Captain
Target repo: `C:/Users/User/AI-Atomic-Framework`
Planning repo: `C:/Users/User/3KLife`
Mode: external builder, strict allowed files

## Mission

Implement `TASK-RFT-0008`: add a lightweight commit-message Strategy Map for `taskflow.ts` and a size tripwire validator. This is the first RFT insertion after Team template base stabilization, not a broad taskflow refactor.

Current sequencing gate:

- Preflight may begin immediately.
- Write/claim should wait until `TASK-TEAM-0004` closes, unless Captain explicitly opens the RFT interleave window.

## Required First Commands

```powershell
cd C:\Users\User\AI-Atomic-Framework
Get-Content -Raw README.md
node atm.mjs next --prompt "TASK-RFT-0008 taskflow size tripwire and commit message Strategy Map" --json
node atm.mjs next --claim --actor <agent-id> --prompt "TASK-RFT-0008 taskflow size tripwire and commit message Strategy Map" --json
```

If claim fails or routes to any task other than `TASK-RFT-0008`, stop and report HOLD.

If `TASK-TEAM-0004` is not closed yet and Captain has not explicitly opened the RFT interleave window, stop after preflight and report HOLD instead of claiming or editing.

## Allowed Files

- `docs/specs/taskflow-profile-v1.md`
- `packages/cli/src/commands/taskflow.ts`
- `packages/cli/src/commands/taskflow/commit-messages.ts`
- `packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts`
- `packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
- `scripts/validate-taskflow-size-tripwire.ts`
- ATM CLI-managed closure/evidence files for `TASK-RFT-0008` only, after deliverables and validators pass.

## Forbidden Scope

- Do not edit `C:/Users/User/3KLife/**`.
- Do not split `taskflow.ts` beyond the commit-message Strategy Map seam.
- Do not change `taskflow open` or `taskflow close` runtime behavior.
- Do not change the `writeReadinessHint` contract.
- Do not edit `.atm/runtime/**`.
- Do not manually edit `.atm/history/**`; use ATM CLI for claim, evidence, and close.
- Do not change default commit message strings.

## Acceptance Points

- `taskflow close --write` produces the exact same commit messages as before.
- `commit-messages.ts` exposes Strategy Map functions for target and planning commit messages.
- Override tests prove profile-provided functions can be used without string interpolation injection.
- Size tripwire exits 0 below 2,200 lines and prints `ATM_TASKFLOW_SIZE_TRIPWIRE_FIRED` above the threshold.
- `docs/specs/taskflow-profile-v1.md` documents optional future commit-message profile fields without consuming them in runtime.

## Validators

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-taskflow-size-tripwire.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-messages.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
npm run validate:git-head-evidence
git diff --check
```

Close only after real deliverables exist and validators pass:

```powershell
node atm.mjs tasks close --task TASK-RFT-0008 --actor <agent-id> --status done --json
```

## Report Back

- Claim result and selected task id.
- Files changed.
- Proof that default commit messages are unchanged.
- Validator commands and pass/fail.
- Evidence/close result.
- Commit SHA.
- Scope drift: expected answer is none.
