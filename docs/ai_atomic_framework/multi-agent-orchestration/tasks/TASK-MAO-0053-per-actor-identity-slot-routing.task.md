---
task_id: TASK-MAO-0053
doc_id: doc_mao_0053
title: "Per-actor identity slot routing for parallel-agent commits"
status: planned
owner: atm-core
priority: P0
milestone: M8
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0049"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/identity.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/actor.ts"
  - "packages/cli/src/commands/command-specs/identity.spec.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "tests/cli/identity-per-actor-routing.test.ts"
  - "docs/governance/git-governance-contract.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/identity.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/identity-per-actor-routing.test.ts"
  - "docs/governance/git-governance-contract.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/identity-per-actor-routing.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert per-actor identity routing; restore default.json single-slot fallback."
atomizationImpact:
  ownerAtomOrMap: "atm.per-actor-identity-routing-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Cross-machine identity federation (only repo-local per-actor routing)."
  - "Replacing the actor registry; per-actor identity files live alongside it."
nonGoals:
  - "Do not change task ledger / claim / session per-actor semantics — those are already actor-isolated."
---

# TASK-MAO-0053 - Per-actor identity slot routing for parallel-agent commits

## Background

ATM has already separated **task ledger**, **claim**, **session**, and
**task-event** state per actor (see TASK-MAO-0005/0009/0049). However, the git
identity profile is still a single shared slot at
`.atm/runtime/identity/default.json`. When two agents run concurrently:

1. Agent A calls `identity set --actor A`; default.json now says A.
2. Agent B calls `identity set --actor B`; default.json now says B.
3. Agent A calls `git commit --actor A`; wrapper reads default.json → sees B →
   either rejects with `ATM_GIT_COMMIT_IDENTITY_MISSING` or attributes A's
   commit to B's identity.

Field evidence: TASK-MAO-0014..0022 closeback (claude-code-opus-4-7) lost an
estimated 30% of wall-clock time to identity race with cursor-gpt-5.2 working
on TASK-MAO-0046 in parallel.

## Goal

Make ATM identity resolution per-actor so that parallel agents do not race
on `default.json`. The git commit wrapper must resolve identity from the
`--actor` flag, not from a shared global slot.

## Implementation Contract

- **Per-actor identity files**: store identity profiles at
  `.atm/runtime/identity/actors/<actorId>.json`. `identity set --actor X`
  writes to `actors/X.json`, never to `default.json`.
- **Resolution order in `git commit` / `git prepare`**:
  1. Explicit flags `--name` + `--email` (already supported).
  2. Environment variables `ATM_GIT_NAME` + `ATM_GIT_EMAIL`.
  3. `.atm/runtime/identity/actors/<--actor>.json`.
  4. Fallback: `.atm/runtime/identity/default.json` (compatibility, last resort).
- **Internal git wrapper invocation**: when ATM shells out to git, pass
  `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` / `GIT_COMMITTER_NAME` /
  `GIT_COMMITTER_EMAIL` as env vars instead of relying on repo-local
  `git config user.*`. This eliminates the global config race entirely.
- **`identity show --actor X`** displays the per-actor profile.
- **Compatibility**: existing `identity set` without `--actor` still writes
  default.json so single-agent workflows are unaffected.

## Acceptance Criteria

- Two concurrent processes calling `identity set --actor A` and
  `identity set --actor B` produce two separate files; neither overwrites the
  other.
- `git commit --actor A` with no env vars, no `--name`, no `--email` resolves
  to A's profile even if another agent just ran `identity set --actor B`.
- `git config user.name` can be modified between `identity set` and
  `git commit` calls without changing the commit's recorded author when
  `--actor` is provided.
- A regression test simulates the race (two child processes each running
  `identity set` + `git commit`) and asserts each commit's author matches its
  own actor.
- Field-test note: re-running TASK-MAO-0014..0022 closeback under this lane
  should not produce any `ATM_GIT_COMMIT_IDENTITY_MISSING` errors.

## Out of scope

- Cross-machine identity federation.
- Refactoring the actor registry (`actor register / adopt / verify-git`); those
  remain authoritative for actor metadata.
