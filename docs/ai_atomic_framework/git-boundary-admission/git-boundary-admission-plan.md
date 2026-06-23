---
doc_id: doc_git_boundary_admission_plan_0001
owner: atm-core
status: completed
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
---

# ATM Git Boundary Admission Plan

## Summary

Execution status: all `TASK-GIT-0001` through `TASK-GIT-0012` were completed in the target repository on 2026-06-23. This planning mirror remains as the design/archive record for the delivered series.

ATM should extend broker admission to the Git boundary by adding a pre-push admission bridge. The bridge fetches the remote branch, computes the merge base, converts both local and remote branch deltas into mutation requests, and asks the broker whether the push is safe, blocked, or composer-routed.

This plan intentionally chooses **every push** rather than **every commit**. Local commits remain cheap and flexible. The expensive semantic check happens at the point where local work is about to become shared work.

## Why Pre-Push

`git commit` is a private local operation. Gating every commit would slow edit/test loops, create noise for WIP commits, and push ATM into Git's internal workflow too early.

`git push` is the natural governance boundary. At that moment the local branch is about to publish state to other agents. ATM can compare:

- `base`: `git merge-base HEAD origin/<branch>`
- `local`: local branch delta from `base` to `HEAD`
- `remote`: remote branch delta from `base` to `origin/<branch>`

The remote side becomes a virtual writer with actor id `virtual:git-remote@<sha>`.

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

## Non-Goals

- No every-commit mandatory gate in MVP.
- No background daemon/cache in MVP.
- No cross-machine broker RPC in MVP.
- No full automatic rebase engine.
- No automatic commit after steward apply by default.
- No promise to resolve all Git conflicts semantically.

## Final Acceptance

- `atm git admit` or equivalent command can evaluate local-vs-remote deltas before push.
- A pre-push hook can call the command and preserve clear operator output.
- Same-file disjoint structured edits can be routed through existing broker/composer semantics.
- True overlap blocks before push and produces reviewable evidence.
- Post-push-fail fallback can explain and rerun the same admission path.
- Evidence can be archived for paper claims without inventing a new envelope schema.
