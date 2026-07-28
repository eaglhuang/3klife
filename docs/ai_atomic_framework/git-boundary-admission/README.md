---
doc_id: doc_git_boundary_admission_0001
owner: atm-core
status: active
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
created_at: 2026-06-23
---

# GIT Boundary Admission

This family opens the `TASK-GIT-*` line for ATM's Git-boundary extension.

The goal is to make ATM broker admission useful at the Git boundary, especially before `git push`, without forcing every local commit through the full broker. The MVP compares the local branch delta against the remote branch delta from a shared merge base, represents the remote side as a virtual writer, and routes the pair through the same mutation broker, format adapters, deterministic composer, steward apply, and evidence pipeline used by normal multi-agent writes.

## Core Position

- Gate at **pre-push**, not every commit.
- Treat the remote branch as a virtual actor: `virtual:git-remote@<sha>`.
- Convert Git diffs into broker mutation requests and patch proposals.
- Allow clean disjoint changes, block true conflicts, and route mergeable same-file changes through deterministic composer.
- Default to no auto-commit after steward apply.
- For AI task work, issue one work-admission ticket atomically with claim.
- Treat native writes as recoverable but unattributed until ATM records
  content-addressed coverage.
- Use one coverage decision at Police, Broker, Reviewer, commit, close,
  protected push, and remote required-check boundaries.

## Files

- [git-boundary-admission-plan.md](./git-boundary-admission-plan.md) is the implementation plan.
- [tasks/README.md](./tasks/README.md) is the task index.
- [tasks/](./tasks/) contains the `TASK-GIT-*` cards.

## Boundary

This is not a replacement for Git or an OS sandbox. Git still owns object
storage, branches, commit history, fetch, push, and remote transport. ATM owns
semantic admission, work-admission tickets, mutation attribution, recoverable
violation handling, conflict explanation, proposal routing, deterministic
merge planning, and evidence. An unrestricted shell may still create local
state, but that state is not an accepted ATM delivery until the shared ticket
coverage gate passes.
