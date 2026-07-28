---
task_id: TASK-GIT-0015
title: Broker-owned staging index arbitration for parallel agents
status: done
milestone: G7
priority: P0
depends_on:
  - TASK-GIT-0013
  - TASK-GIT-0014
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
related_backlog:
  - ATM-BUG-2026-07-12-161
  - ATM-BUG-2026-07-13-162
related_tasks:
  - TASK-AAO-0188
  - TASK-AAO-0189
  - TASK-GIT-0013
  - TASK-GIT-0014
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/cli/src/commands/integration-hooks.ts"
  - "packages/cli/src/commands/taskflow/historical-close-preflight.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/tasks/close-window-lock.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/broker/lifecycle.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "scripts/validate-broker-lifecycle.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "tests/cli/integration-raw-git-command-guard.test.ts"
  - "tests/cli/team-plan-contract.test.ts"
  - "docs/governance/integration-plugin-matrix.md"
deliverables:
  - "Add a shared staged-index ownership classifier that can identify current-task-owned, foreign-active-owned, foreign-released-or-abandoned, unknown-governance-artifact, and ordinary-unowned staged paths."
  - "Block or replace every normal remediation path that would unstage, restore, reset, checkout, clean, or otherwise mutate foreign active work outside Broker arbitration."
  - "Add Broker index-lane evidence to team plan/validate/status so the shared Git index is treated as a serialized resource even when source scopes are parallel-safe."
  - "Strengthen --defer-foreign-staged into a provable snapshot/restore lane with before/after index hashes, blob IDs, success/failure evidence, and fail-closed restoration checks."
  - "Add explicit stage-only and destructive override leases with task, actor, path, TTL, single-use, reason, and audit-artifact semantics."
  - "Unify git wrapper, pre-commit hook, taskflow pre-close, and close-window messaging so dry-run/write paths use the same ownership and override rules."
  - "Update docs/help output to warn agents not to use raw severe Git commands on foreign active files, and to route through ATM/Broker lease flows instead."
validators:
  - "npm run validate:git-hooks-enforcement"
  - "npm run validate:broker-lifecycle"
  - "npm run validate:cli"
  - "npm run typecheck"
  - "npm run check:encoding:touched"
evidence:
  required: command-backed
rollback:
  strategy: "Revert the index arbitration, override lease, and shared-classifier commits as one recovery unit. Keep TASK-GIT-0013 raw Git denial and TASK-GIT-0014 governed push wrapper intact unless the rollback evidence proves they depend on the reverted classifier surface."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-agent-permission"
  mapUpdates:
    - "Add/update atom coverage for index ownership classification, Broker indexLane, foreign staged deferral evidence, stage-only lease, destructive Git override lease, and wrapper/hook/taskflow parity."
completed_at: "2026-07-13T02:38:29.021Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-13T02:38:29.021Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T02-38-28-955Z-close-f38b232ec4b2"
lastTransitionAt: "2026-07-13T02:38:29.021Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "329890f7f8fd24b8e6d4083d3c378ef63658e7a9"
---

# TASK-GIT-0015

## Goal

Turn the emergency `TASK-AAO-0189` plan into the formal GIT-series implementation card for `ATM-BUG-2026-07-12-161`: the shared Git index must become a governed Broker resource, not a free-for-all scratchpad between parallel AI captains.

This card completes the part that `TASK-GIT-0013` and `TASK-GIT-0014` intentionally did not finish. Those tasks added raw Git denial and a governed push lane; this card adds the missing index ownership, lease, and Broker arbitration layer.

## Problem

Team Agents can correctly decide that two tasks are parallel-safe at the source-file or atom level, but both agents still share one Git index. That creates the real production bug observed during `TASK-AAO-0188` and Fable work:

- one AI can be blocked by another active task's staged or untracked governance files;
- one AI can be tempted to unstage another AI's files to make its own commit pass;
- raw `git restore`, `git reset`, `git checkout`, `git clean`, `git rm`, `git update-index`, or `git read-tree` can mutate another active task's work outside Broker arbitration;
- taskflow and close-window remediation can still print raw `git restore --staged` suggestions, which trains agents toward the dangerous path.

The target behavior is stricter: agents do not get ambient Git index authority. They get ATM-governed Git operations, Broker index-lane decisions, and explicit human-approved leases for exceptional cases.

## Required behavior

### 1. Shared staged-index ownership classifier

Implement one reusable classifier shared by `atm git`, pre-commit, taskflow pre-close, close-window checks, and Team Broker. It must classify staged paths as:

- `current-task-owned`
- `foreign-active-owned`
- `foreign-released-or-abandoned`
- `unknown-governance-artifact`
- `ordinary-unowned`

Ownership sources must include active task claims, task direction locks, Broker write intents, task ledger files, evidence bundle files, task event files, and task-scoped generated governance artifacts.

### 2. Default prohibition on foreign-active unstaging

ATM must not silently run, suggest, or normalize this against another active task's path:

```bash
git restore --staged <foreign-active-owned-path>
```

When a foreign active staged path blocks the current task, the structured diagnostic must include:

- code `ATM_INDEX_FOREIGN_ACTIVE_STAGED`;
- owner task id;
- owner actor id when available;
- blocked staged paths;
- safe next actions: wait for owner, request Broker index lane, or use an explicit emergency lease if the human approved it.

### 3. Stage-only override lease

Temporary deferral of another active task's staged paths is allowed only through an explicit ATM option or Broker-issued lease. Chat text alone is not authorization.

Required phrase:

```text
ATM-STAGE-OVERRIDE-I-UNDERSTAND-THIS-MAY-DISRUPT-ANOTHER-ACTIVE-AGENT
```

The lease must be task-scoped, actor-scoped, path-scoped, TTL-bound, single-use, and reason-required. It must write an audit artifact with current actor/task, foreign owner actor/task, files affected, before/after index hashes, staged blob IDs, restage or rollback result, and the human-provided reason.

This lease unlocks only temporary index-state deferral. It must not permit source overwrite, task takeover, claim mutation, task close, or broad destructive Git mutation.

### 4. Destructive Git override lease

Guard severe Git mutation families by default:

- `git restore`
- `git restore --staged`
- `git reset`
- `git reset --hard`
- `git checkout -- <paths>`
- `git checkout -f`
- `git switch -f`
- `git clean`
- `git rm`
- `git update-index`
- `git read-tree`

Worktree/index destructive mutation requires the higher-risk phrase:

```text
ATM-DESTRUCTIVE-GIT-OVERRIDE-I-UNDERSTAND-THIS-CAN-DESTROY-ANOTHER-ACTIVE-AGENT-WORK
```

The lease must fail closed on missing phrase, wrong phrase, missing reason, stale lease, actor mismatch, task mismatch, path mismatch, or attempted mutation beyond the authorized path set.

### 5. Broker index lane

Team Broker must expose `indexLane` in team plan/validate/status evidence:

- `free`
- `owned-by-task`
- `queued`
- `requires-staging-steward`
- `blocked-foreign-active-staged`

When the index lane is owned by a task, another task may still edit/read parallel-safe source files, but commit/stage mutation must wait, queue, or use an explicit lease.

### 6. Safe defer/restore semantics

`--defer-foreign-staged` must become a provable commit-window operation:

- snapshot foreign staged path list and blob IDs;
- unstage only inside the scoped commit window;
- restore exact previous staged state after commit success or failure;
- fail closed if restoration cannot be proven;
- write evidence with before/after index hashes and restoration status.

### 7. Pre-commit residue isolation parity

Pre-commit must not block a current commit solely because another active task has an untracked governance bundle when all of these are true:

- owner task has an active claim or active direction lock;
- owner actor differs from the current actor;
- the foreign artifact is not staged into the current commit;
- Broker has not reported a shared-surface conflict requiring serialization.

The advisory diagnostic code should be `ATM_HOOK_FOREIGN_ACTIVE_RESIDUE_ADVISORY`. Orphan, abandoned, unknown-owner, or staged foreign residue remains blocking.

## Acceptance

- A regression creates two active task claims with disjoint source scopes and proves task B can commit while task A has an untracked active bundle manifest.
- A regression proves task B cannot silently unstage task A's staged file and receives `ATM_INDEX_FOREIGN_ACTIVE_STAGED`.
- A regression proves raw `git restore --staged <foreign-active-owned-path>` fails without the stage-only lease.
- A regression proves raw `git restore <foreign-active-owned-path>`, `git reset --hard`, `git checkout -- <foreign-active-owned-path>`, and `git clean` fail without the destructive lease when they would touch foreign active work.
- A regression proves `--defer-foreign-staged` restores task A's staged state after task B's commit attempt on both success and failure paths.
- A regression proves the stage-only phrase works only through an explicit ATM option or Broker lease, writes an audit artifact, and cannot be supplied by chat-only text.
- A regression proves the destructive phrase works only for the explicitly scoped command/path/actor/task/TTL and writes a higher-risk audit artifact.
- A regression proves missing, wrong, stale, cross-task, cross-actor, and cross-path override attempts fail closed.
- A regression proves abandoned or unknown-owner foreign generated residue still blocks.
- `team plan`, `team validate`, and `team status` expose `indexLane` in runtime evidence.
- `taskflow pre-close`, `node atm.mjs git commit`, close-window, and `hook pre-commit` share the same index ownership classification.
- Docs/help output warns agents not to use raw `git restore`, `git restore --staged`, `git reset`, `git checkout -- <paths>`, or `git clean` on foreign active files.

## Validation

- `npm run validate:git-hooks-enforcement`
- `npm run validate:broker-lifecycle`
- `npm run validate:cli`
- `npm run typecheck`
- `npm run check:encoding:touched`

## Rollback

Revert the index arbitration, override lease, and shared-classifier implementation commits. The system should retain `TASK-GIT-0013` raw Git denial and `TASK-GIT-0014` governed push behavior unless rollback evidence proves a shared helper dependency requires a narrower follow-up patch.

