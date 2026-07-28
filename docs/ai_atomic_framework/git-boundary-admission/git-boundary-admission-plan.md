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
  - TASK-GIT-0017
  - TASK-GIT-0018
  - TASK-GIT-0019
  - TASK-GIT-0020
  - TASK-GIT-0021
updated_at: 2026-07-28T20:00:00+08:00
---

# ATM Git Boundary Admission Plan

## Summary

MVP execution status: all `TASK-GIT-0001` through `TASK-GIT-0012` were completed in the target repository on 2026-06-23. This planning mirror remains the design/archive record for the delivered series and the active record for post-MVP hard-gate extensions.

Post-MVP extension: `TASK-GIT-0013` is the P0 hard-gate follow-up after Team Agents dogfood showed that pre-push admission and local hooks do not prevent an unrestricted AI agent from directly running raw destructive Git commands. The extension treats Git mutation as a governed capability: supported integrations should deny raw Git mutation by default and route agents through ATM Git tools, Broker index lanes, and scoped emergency leases.

Follow-up: `TASK-GIT-0014` closes the remaining push gap discovered while closing `TASK-GIT-0013`: ATM can admit a push and the pre-push hook can guard commit ranges, but the final remote mutation still requires raw host `git push`. The follow-up adds a governed `atm git push` wrapper and makes supported integrations route raw `git push` attempts to that wrapper.

Follow-up: `TASK-GIT-0015` formalizes the emergency `TASK-AAO-0189` plan created from `ATM-BUG-2026-07-12-161`: raw Git denial and governed push are not enough while multiple AI agents share one Git index. The follow-up makes the staging index a Broker-owned lane, blocks foreign-active unstage/restore/reset/clean operations by default, and introduces explicit stage-only and destructive override leases with audit evidence.

Follow-up: `TASK-GIT-0016` closes the execution-surface gap exposed by external-worker dogfood. Integration command guards are necessary but do not confine an agent that can invoke an unrestricted host shell. The extension introduces one brokered restricted-execution gateway for external workers, rejects interpreter-evaluation and raw mutation escape hatches, and projects the same ATM-only route through every entry skill and structured CLI recovery message.

Follow-up: `TASK-GIT-0017` corrects a runner-publication gap found while closing `TASK-GIT-0016`: a sealed build can update tracked `packages/cli/dist/**`, the onefile manifest, and its steward receipt while the framework-temp publication route commits only a subset. The extension makes one build-output inventory the authority for enqueue, claim, receipt, publication commit, and doctor freshness.

Second-principles extension: `TASK-GIT-0018` through `TASK-GIT-0021` finish the capability boundary that `TASK-GIT-0016` deliberately did not claim to be. A policy gateway is not a hard boundary when a worker can launch an ambient host process without consulting it. These stages make brokered process launch the only external-write authority, make adapter enforcement evidence explicit, detect protected-state bypasses at every later governed boundary, and prove the envelope on real editor adapters. They do not claim to sandbox arbitrary human shells.

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
| G9 | TASK-GIT-0017 | Runner publication inventory and framework-temp claim/commit-surface parity |
| G10 | TASK-GIT-0018 | Brokered external-worker launcher and capability-bound process execution |
| G11 | TASK-GIT-0019 | Adapter enforcement capability attestation and fail-closed write dispatch |
| G12 | TASK-GIT-0020 | Protected governance-state integrity chain and bypass detection |
| G13 | TASK-GIT-0021 | Cross-adapter controlled-execution dogfood and rollout evidence |

## Controlled Execution Continuation

### First-Principles Boundary

The protected resource is not a command spelling, a Git hook, or an ATM task
file. It is the capability to cause a repository mutation. Prompt text, an
editor skill, a command deny list, and an actor label are all advisory if a
worker can independently launch an ambient host process.

Therefore the trustworthy chain is:

`task/lane authority -> capability-bound launch request -> trusted launcher -> declared outputs -> immutable execution receipt -> lifecycle and publication gates`.

The gateway remains the policy owner. The launcher owns process creation. The
adapter capability registry owns whether an editor can honestly claim the
pre-tool enforcement needed for external write work. The integrity chain owns
post-bypass detection. No caller is allowed to rebuild these decisions from
prompt wording or its own command list.

### Deep-Module Decomposition

- **G10 / `ExternalWorkerLauncher`**: one narrow `launch(request, capability)` interface hides process creation, capability verification, output observation, receipt persistence, cancellation, and the distinction between read-only and declared generated writes. Its adapters are the Team worker executor and broker command-manifest executor.
- **G11 / `AdapterEnforcementCapability`**: one evidence-bearing capability interface hides editor hook installation, version/probe results, policy digest binding, and expiry. Its adapters are dispatch admission and integration verification.
- **G12 / `ProtectedStateIntegrityChain`**: one verifier derives the governed-state digest chain and compares it at claim, commit, close, and push boundaries. It detects a direct write but does not pretend to undo it or sandbox a human host.
- **G13 / `ControlledExecutionConformance`**: one fixture/attestation matrix proves the same capability semantics across supported and unsupported adapters; it is evidence-only and never becomes another policy owner.

Deletion test: removing any one of these modules would force at least two
callers to duplicate a non-local decision: process authority, adapter
enforceability, protected-state provenance, or conformance classification.

### Dependency and Rollout Order

1. Complete `TASK-GIT-0017` first to remove the live runner-publication
   residue and make the frozen runner trustworthy for follow-on enforcement.
2. `TASK-GIT-0018` depends on the completed policy owner in `TASK-GIT-0016`.
3. `TASK-GIT-0019` and `TASK-GIT-0020` depend on `TASK-GIT-0018` and may run
   in parallel because one owns adapter capability and the other owns
   integrity verification.
4. `TASK-GIT-0021` depends on both `0019` and `0020`; it is the release gate
   for advertising an adapter as external-write capable.

Unsupported adapters remain read-only/broker-only. They must not receive an
external-write dispatch merely because their skill text contains ATM guidance.

## Non-Goals

- No every-commit mandatory gate in MVP.
- No background daemon/cache in MVP.
- No cross-machine broker RPC in MVP.
- No full automatic rebase engine.
- No automatic commit after steward apply by default.
- No promise to resolve all Git conflicts semantically.
- No claim that local hooks alone can prevent raw destructive Git commands by unrestricted AI shells.
- No claim that skill text alone constrains an external worker. The hard gate must be a brokered execution surface or an equivalent host policy.
- No raw Git workaround for generated runner residue. Every declared publication output needs an ATM-governed disposition.
- No claim that ATM can sandbox arbitrary user-owned terminal sessions. Host-level sandboxing is an adapter/runtime capability, and absence of proof means external-write capability is unsupported.

## Final Acceptance

- `atm git admit` or equivalent command can evaluate local-vs-remote deltas before push.
- A pre-push hook can call the command and preserve clear operator output.
- Same-file disjoint structured edits can be routed through existing broker/composer semantics.
- True overlap blocks before push and produces reviewable evidence.
- Post-push-fail fallback can explain and rerun the same admission path.
- Evidence can be archived for paper claims without inventing a new envelope schema.
- External-worker mutation is admitted only through the restricted execution gateway; direct raw Git, interpreter evaluation, and shell write paths fail closed or remain explicitly unsupported without a host policy.
- A runner is not publication-current merely because its source mtime is current; the sealed build-output inventory and its receipt must be committed or explicitly retained by a governed recovery state.
