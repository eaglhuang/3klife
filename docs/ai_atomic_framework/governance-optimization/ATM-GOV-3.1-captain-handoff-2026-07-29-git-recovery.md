# Plan 3.1 Captain Handoff - 2026-07-29 Git Recovery

## Purpose

This handoff records the post-Plan-3.1 Git hardening continuation. Read it
before claiming any GIT or RFT work. Target truth is the ATM live ledger; a
planning card that still says `planned` is not permission to reopen an active
or closed target task.

## Repository Heads And Push Boundary

| Repository | HEAD at handoff | Push state |
|---|---|---|
| AI-Atomic-Framework | `0a817b33f` | Local work is ahead of `origin/main`; do not push until the active GIT recovery lane is reconciled and pre-push is green. |
| 3KLife | `305493c1` | Local planning is ahead of `origin/master`; do not push as part of this handoff. |

No blanket cleanup is authorized. Preserve unrelated `.atm/history/**`, staged
GIT-0024 records, and untracked receipts until their owning lifecycle is
reconciled through ATM.

## Plan 3.1 Baseline

- `ATM-GOV-0266` is closed and pushed. Its runner-version / receipt work is
  historical evidence, not an active repair target.
- The SKL validator and skill-corpus wave produced the current tool-first
  contracts. Re-read the live ledger before reopening any SKL card; several
  planning mirrors are intentionally stale after closeback sequencing.
- The active risk is now the GIT boundary-admission continuation, not a reason
  to reopen completed Plan 3.1 governance cards.

## GIT Status And Required Order

| Task | Live state | Meaning | Next allowed movement |
|---|---|---|---|
| TASK-GIT-0024 | blocked / released | G16 historical ownership convergence; staged lifecycle records remain preserved. | Resume only after G7.1/G7.2 transaction path is verified. |
| TASK-GIT-0025 | running / active | G9.1 import-origin work-admission ticket parity. Source and focused tests exist as WIP; do not call it delivered. | Reconcile after the frozen runner is healthy; then validate and govern a real delivery. |
| TASK-GIT-0026 | ready / released | Evidence-context bundle atomicity correction. | Claim after GIT-0025 and the transaction facade are stable. |
| TASK-GIT-0027 | running / active | G7.1 exact staged-entry lease authority. Delivery commit `0de8db0a4` exists. | Complete runner publication/evidence, then close with historical delivery. |
| TASK-RFT-0101 | planning only | Mandatory deep-module rehabilitation of the preservation WIP. | Import and execute after GIT-0027 closes. |
| TASK-GIT-0028 | planned | G7.2 production transaction wiring. | Blocked by GIT-0027 and RFT-0101; never use preservation commits as its evidence. |

Canonical execution order:

1. Recover the current runner-sync steward window.
2. Close `TASK-GIT-0027` using delivery `0de8db0a4` after fresh evidence.
3. Import and complete `TASK-RFT-0101`.
4. Re-import/claim `TASK-GIT-0028`; wire only the RFT-0101 stable interface.
5. Complete `TASK-GIT-0025`, then `TASK-GIT-0026`, then resume `TASK-GIT-0024`.

## High-Risk Preservation Boundary

Commit `39b13905f` preserved a **5,734-line diff** in
`packages/cli/src/commands/git-governance/implementation.ts`.

- It is explicitly non-delivery preservation, not functional completion.
- It added a dependency on `task-scoped-commit-transaction.ts` while that file
  was initially untracked. This made a sealed runner fail to import.
- Commit `0a817b33f` preserves that missing 73-line module only so the next
  sealed runner can load. It is also `ATM-WIP: true`, not GIT-0028 delivery.
- Do not add more behavior to the 5,734-line facade. `TASK-RFT-0101` must
  reduce it to a <=600-line typed adapter and extract bounded transaction/test
  modules before GIT-0028 resumes.

## Runner-Sync Incident

The current queue head is `runner-sync-bb069f32`, sealed to `4724c81a3` and
owned by `TASK-GIT-0027`. Its build succeeded but must **not** be published:
that seal predates `0a817b33f`, therefore its frozen onefile cannot import the
new transaction module. Its TTL expires at `2026-07-29T02:51:53Z`.

After expiry:

1. Run `node atm.mjs broker runner-sync cleanup --json`.
2. Confirm the old group is gone; do not hand-edit the queue.
3. Enqueue a new GIT-0027 runner-sync group sealed to current HEAD.
4. Build with `ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`.
5. Verify frozen `node atm.mjs` can load and focused GIT-0027 tests pass.
6. Publish only the receipt-declared output inventory, then release the group.

The framework still lacks a normal CLI publication verb between build and
runner-sync release. The previous exact pathspec publication of generation
`2fb28d3` is commit `4724c81a3`; it was an emergency repair, not a normal
delivery. Record and route this as a backlog/product follow-up rather than
normalizing native Git publication.

## RFT-0101 Planning Decision

`TASK-RFT-0101` was created through `atm plan card create` and the RFT series
was registered in `series-registry.json`. It is a hard dependency of
`TASK-GIT-0028`.

Its first-principles/deep-module contract is deliberately narrow:

- CLI parsing, lease authority, filtered-bundle planning, index park/restore,
  commit execution, and failure receipts have separate reasons to change.
- `TaskScopedCommitTransaction` owns the hidden atomic lifecycle through ports.
- `implementation.ts` becomes a thin typed adapter under 600 lines.
- The over-budget staging test becomes a facade with bounded support modules.

## Backlog Items To Retain

- `ATM-BUG-2026-07-29-247`: unowned WIP claim-recovery loop.
- `ATM-BUG-2026-07-29-248`: line-budget gate blocks work that would reduce an
  oversized file.
- Add a follow-up for missing normal runner publication command and for a
  failed sealed build that can hold a runner-sync queue until TTL. Do not write
  the backlog while a source seal is being finalized.

## Captain Rules For Continuation

- Prefer `node atm.mjs`; use `node atm.dev.mjs` only to diagnose or validate
  source while the frozen runner is known broken.
- Never use raw `node -e`, raw Git, or direct PowerShell writes as normal work.
  The two emergency pathspec commits above are named anomalies with receipts.
- Re-read `evidence.nextAction.playbook` after every claim.
- Do not push either repository as part of recovery without a new explicit
  owner push instruction and clean pre-push results.
