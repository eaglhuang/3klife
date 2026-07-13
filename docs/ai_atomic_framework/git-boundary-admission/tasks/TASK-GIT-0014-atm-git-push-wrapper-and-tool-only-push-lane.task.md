---
task_id: TASK-GIT-0014
title: ATM Git push wrapper and tool-only push lane
status: done
milestone: G6
priority: P0
depends_on:
  - TASK-GIT-0013
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
related_backlog:
  - ATM-BUG-2026-07-12-161
related_tasks:
  - TASK-AAO-0189
  - TASK-GIT-0013
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook/pre-push.ts"
  - "packages/cli/src/commands/integration-hooks.ts"
  - "packages/cli/src/commands/integration.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "tests/cli/**"
  - "docs/governance/integration-plugin-matrix.md"
deliverables:
  - "Add a governed `node atm.mjs git push` action that performs admission, branch-queue / Broker checks, protected-branch hook parity, and then invokes host git push only from inside ATM."
  - "Make supported integration command guards route raw `git push` attempts to `node atm.mjs git push` instead of allowing direct host push."
  - "Record push attempt status and recovery guidance, including remote rejection, hook failure, admission drift, and retry-safe recover-push-fail handoff."
  - "Document honest hard-gate coverage: supported integrations and ATM CLI can hard-gate; unrestricted unsupported shells remain outside the pre-execution envelope."
validators:
  - "npm run validate:git-hooks-enforcement"
  - "npm run validate:cli"
  - "npm run typecheck"
  - "npm run check:encoding:touched"
evidence:
  required: command-backed
rollback:
  strategy: "Revert the wrapper and integration command-policy changes. Keep existing pre-push hook/admission behavior intact. If rollback is needed after partial deploy, supported integrations must fall back to explicit `node atm.mjs git admit` before host `git push` and docs must mark push as advisory-only."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-agent-permission"
  mapUpdates:
    - "Add/update atom coverage for governed push wrapper, raw push denial, push attempt status, and recover-push-fail parity."
completed_at: "2026-07-13T01:58:03.021Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-13T01:58:03.021Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T01-58-03-021Z-close-079074b7172f"
lastTransitionAt: "2026-07-13T01:58:03.021Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "116f35fb85bce924c4c39f5fa551bb12c282e7c7"
---

# TASK-GIT-0014

## Goal

Close the remaining Git authority gap found during Team Agents dogfood: after ATM admission succeeds, agents still need to call raw host `git push` because ATM has no governed push wrapper. This card makes push a first-class ATM tool lane.

The desired operator path is:

```bash
node atm.mjs git push --actor <actor-id> --branch <branch> --remote <remote> --json
```

Supported AI integrations should reject raw `git push` for governed repositories and print the ATM wrapper command instead.

## Problem

`node atm.mjs git admit` can prove that a push is safe, and the installed pre-push hook can block unsafe commit ranges. However, the final mutation still happens through raw host Git:

```bash
git push origin main
```

That means ATM cannot fully enforce:

- actor/task attribution for push attempts;
- push attempt status and retry guidance;
- consistent admission-before-push ordering;
- direct raw `git push` denial in supported integrations;
- a clean tool-only Git story for AI agents.

This is the same class of safety issue as `git restore`, `git reset`, and `git clean`: if agents are supposed to do Git mutations only through ATM, push must also be an ATM action, not a manual raw Git escape hatch.

## Required behavior

### 1. Add `atm git push`

Implement a new governed Git action:

```bash
node atm.mjs git push --actor <actor-id> --branch <branch> --remote <remote> --json
```

Required behavior:

- runs or reuses the same admission logic as `node atm.mjs git admit`;
- fetches and verifies the target remote ref unless `--no-fetch` is explicitly supplied and documented;
- respects protected branch policy and existing pre-push hook semantics;
- serializes with any branch commit/push queue if present;
- invokes host `git push` only after ATM admission allows the push;
- records structured push attempt status under `.atm/runtime/git-push-attempts/` or the established runtime equivalent;
- prints retry-safe recovery commands on remote rejection, hook rejection, admission drift, or network failure.

### 2. Raw push denial in supported integrations

Update supported integration command guards so direct raw `git push` is denied by default in governed repos.

The guard should:

- classify `git push` as `governed-git-required`;
- print `node atm.mjs git push --actor <actor> --branch <branch> --remote <remote> --json`;
- refuse chat-text override phrases as authorization;
- allow only explicit ATM push wrapper paths or a documented emergency lease.

### 3. Push/write parity

The wrapper, pre-push hook, and integration command guard must agree on outcomes:

- if `atm git push --dry-run` or equivalent says the push is blocked, real push must not proceed;
- if raw integration `git push` is blocked, the suggested ATM command must be executable;
- if pre-push hook rejects, `atm git push` must surface the same structured failure envelope and `recover-push-fail` path.

### 4. Honest boundary

Documentation must state:

- supported integrations with pre-tool command guards can pre-execution deny raw `git push`;
- ATM CLI can enforce the governed wrapper path;
- unrestricted shells without command guard can still run host Git, so the protection there is hook/post-fact evidence, not pre-execution denial.

## Acceptance

- Regression proves `node atm.mjs git push --actor <actor> --branch main --remote origin --dry-run --json` or the chosen preview mode runs admission and does not mutate remote state.
- Regression proves `node atm.mjs git push --actor <actor> --branch <temp-branch> --remote <temp-remote> --json` successfully pushes in a fixture repo after admission allows it.
- Regression proves remote drift between admission and push is detected and fails closed with a retry/re-admit command.
- Regression proves direct raw `git push` is blocked by the integration command guard and reports risk `governed-git-required`.
- Regression proves a raw command containing the override phrase in a shell comment or string does not unlock push.
- Regression proves pre-push hook rejection is surfaced through `atm git push` with structured recovery guidance.
- Docs and integration matrix identify hard-gated vs advisory-only surfaces.
- The task links back to `ATM-BUG-2026-07-12-161`, `TASK-AAO-0189`, and `TASK-GIT-0013`.

## Validation

- `npm run validate:git-hooks-enforcement`
- `npm run validate:cli`
- `npm run typecheck`
- `npm run check:encoding:touched`

## Rollback

Revert the `atm git push` action and raw-push command-policy changes while preserving existing `atm git admit`, pre-push hook, and `recover-push-fail` behavior. If rolled back, update docs to say push remains a two-step path: ATM admission followed by host Git push, with no supported integration hard gate for raw push.
