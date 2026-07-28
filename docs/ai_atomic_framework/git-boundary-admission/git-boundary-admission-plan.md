---
doc_id: doc_git_boundary_admission_plan_0001
owner: atm-core
status: active
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
created_at: 2026-06-23
completed_at: 2026-06-23T07:26:40.163Z
related_tasks:
  - TASK-GIT-0001
  - TASK-GIT-0002
  - TASK-GIT-0003
  - TASK-GIT-0004
  - TASK-GIT-0005
  - TASK-GIT-0006
  - TASK-GIT-0007
  - TASK-GIT-0008
  - TASK-GIT-0009
  - TASK-GIT-0010
  - TASK-GIT-0011
  - TASK-GIT-0012
  - TASK-GIT-0013
  - TASK-GIT-0014
  - TASK-GIT-0015
  - TASK-GIT-0016
updated_at: 2026-07-28T20:00:00+08:00
---

# ATM Git Boundary Admission Plan

## Summary

MVP execution status: all `TASK-GIT-0001` through `TASK-GIT-0012` were completed in the target repository on 2026-06-23. This planning mirror remains the design/archive record for the delivered series and the active record for post-MVP hard-gate extensions.

Post-MVP extension: `TASK-GIT-0013` is the P0 hard-gate follow-up after Team Agents dogfood showed that pre-push admission and local hooks do not prevent an unrestricted AI agent from directly running raw destructive Git commands. The extension treats Git mutation as a governed capability: supported integrations should deny raw Git mutation by default and route agents through ATM Git tools, Broker index lanes, and scoped emergency leases.

Follow-up: `TASK-GIT-0014` closes the remaining push gap discovered while closing `TASK-GIT-0013`: ATM can admit a push and the pre-push hook can guard commit ranges, but the final remote mutation still requires raw host `git push`. The follow-up adds a governed `atm git push` wrapper and makes supported integrations route raw `git push` attempts to that wrapper.

Follow-up: `TASK-GIT-0015` formalizes the emergency `TASK-AAO-0189` plan created from `ATM-BUG-2026-07-12-161`: raw Git denial and governed push are not enough while multiple AI agents share one Git index. The follow-up makes the staging index a Broker-owned lane, blocks foreign-active unstage/restore/reset/clean operations by default, and introduces explicit stage-only and destructive override leases with audit evidence.

Follow-up: `TASK-GIT-0016` closes the execution-surface gap exposed by external-worker dogfood. Integration command guards are necessary but do not confine an agent that can invoke an unrestricted host shell. The extension introduces one brokered restricted-execution gateway for external workers, rejects interpreter-evaluation and raw mutation escape hatches, and projects the same ATM-only route through every entry skill and structured CLI recovery message.

ATM should extend broker admission to the Git boundary by adding a pre-push admission bridge. The bridge fetches the remote branch, computes the merge base, converts both local and remote branch deltas into mutation requests, and asks the broker whether the push is safe, blocked, or composer-routed.

This plan intentionally chooses **every push** rather than **every commit**. Local commits remain cheap and flexible. The expensive semantic check happens at the point where local work is about to become shared work.

## Why Pre-Push

`git commit` is a private local operation. Gating every commit would slow edit/test loops, create noise for WIP commits, and push ATM into Git's internal workflow too early.

`git push` is the natural governance boundary. At that moment the local branch is about to publish state to other agents. ATM can compare:

- `base`: `git merge-base HEAD origin/<branch>`
- `local`: local branch delta from `base` to `HEAD`
- `remote`: remote branch delta from `base` to `origin/<branch>`

The remote side becomes a virtual writer with actor id `virtual:git-remote@<sha>`.

## Post-MVP AI Agent Permission Boundary

The MVP pre-push boundary remains valid for human/local Git workflows, but multi-agent AI work needs an earlier permission boundary. A supported AI integration should not hand agents unrestricted raw Git mutation authority. Instead, agents should use ATM-governed Git tools for staging, unstaging, committing, admission, and emergency leases.

Default-denied raw mutation families include:

- `git add`, `git restore --staged`, `git reset <paths>`, `git rm`, `git update-index`
- `git restore`, `git checkout -- <paths>`, `git checkout -f`, `git switch -f`
- `git reset --hard`, `git clean`, `git read-tree`
- direct `git commit`, `git commit --no-verify`, and direct `git push` when ATM governance is required

This boundary is not warning-only. In supported integrations it must block before execution. Unsupported unrestricted shells must be documented honestly as outside the hard-gate envelope unless they install an ATM command guard or equivalent host policy.

Emergency access is split into two explicit lease levels:

- stage-only deferral: `ATM-STAGE-OVERRIDE-I-UNDERSTAND-THIS-MAY-DISRUPT-ANOTHER-ACTIVE-AGENT`
- destructive worktree/index mutation: `ATM-DESTRUCTIVE-GIT-OVERRIDE-I-UNDERSTAND-THIS-CAN-DESTROY-ANOTHER-ACTIVE-AGENT-WORK`

Both leases must be actor-scoped, task-scoped, path-scoped, TTL-bound, single-use, and auditable.

## MVP Mechanics

1. Fetch remote metadata and compute the merge base.
2. Build local and remote mutation requests from Git diffs.
3. Resolve structured files through existing format adapters when available.
4. Fall back to text-range conflict keys when structured adapters are unavailable.
5. Send both sides into broker admission.
6. If safe, allow push.
7. If blocked, explain conflict and suggest rebase/merge/steward path.
8. If composer-routed, create a deterministic merge plan and optionally steward-apply it to the working tree without auto-commit.

## Stages

| Stage | Tasks | Purpose |
|---|---|---|
| G0 | TASK-GIT-0001 | Contract and architecture lock |
| G1 | TASK-GIT-0002 ~ TASK-GIT-0004 | Git diff ingestion, adapter bridge, CLI admission |
| G2 | TASK-GIT-0005 ~ TASK-GIT-0007 | Hook install, evidence, steward dry-run/apply |
| G3 | TASK-GIT-0008 ~ TASK-GIT-0010 | Fixture coverage, push-fail fallback, policy/audit |
| G4 | TASK-GIT-0011 ~ TASK-GIT-0012 | Docs, dogfood, paper-ready evidence |
| G5 | TASK-GIT-0013 | AI agent raw-Git deny policy, ATM Git tool gate, and emergency lease hard gate |
| G6 | TASK-GIT-0014 | Governed ATM Git push wrapper and tool-only push lane |
| G7 | TASK-GIT-0015 | Broker-owned staging index arbitration, foreign-active staged protection, and override lease evidence |
| G8 | TASK-GIT-0016 | Restricted external-worker execution gateway, interpreter escape denial, and ATM-only guidance projection |

## Non-Goals

- No every-commit mandatory gate in MVP.
- No background daemon/cache in MVP.
- No cross-machine broker RPC in MVP.
- No full automatic rebase engine.
- No automatic commit after steward apply by default.
- No promise to resolve all Git conflicts semantically.
- No claim that local hooks alone can prevent raw destructive Git commands by unrestricted AI shells.
- No claim that skill text alone constrains an external worker. The hard gate must be a brokered execution surface or an equivalent host policy.

## Final Acceptance

- `atm git admit` or equivalent command can evaluate local-vs-remote deltas before push.
- A pre-push hook can call the command and preserve clear operator output.
- Same-file disjoint structured edits can be routed through existing broker/composer semantics.
- True overlap blocks before push and produces reviewable evidence.
- Post-push-fail fallback can explain and rerun the same admission path.
- Evidence can be archived for paper claims without inventing a new envelope schema.
- External-worker mutation is admitted only through the restricted execution gateway; direct raw Git, interpreter evaluation, and shell write paths fail closed or remain explicitly unsupported without a host policy.
