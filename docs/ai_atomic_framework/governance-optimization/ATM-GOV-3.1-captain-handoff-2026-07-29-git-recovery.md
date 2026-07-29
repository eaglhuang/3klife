# Plan 3.1 Captain Handoff - 2026-07-29 Git Recovery

## Purpose

This handoff records the post-Plan-3.1 Git hardening continuation. Read it
before claiming any GIT or RFT work. Target truth is the ATM live ledger; a
planning card that still says `planned` is not permission to reopen an active
or closed target task.

## Repository Heads And Push Boundary

| Repository | HEAD at handoff | Push state |
|---|---|---|
| AI-Atomic-Framework | `5891f6884` | Local work is ahead of `origin/main`; do not push until the active GIT recovery lane is reconciled and pre-push is green. |
| 3KLife | `63574adf` | Local planning is ahead of `origin/master`; do not push as part of this handoff. |

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

## Plan 3.1 Progress And Remaining Work

### Landed Foundations

- The SKL contracts through the catalog, TDD, selected-validator, and skill
  corpus waves are landed. In particular, the validator execution contract,
  shard/contribution model, TDD evidence lifecycle, selected validator flow,
  and corpus compilation/canary work are usable framework foundations.
- `ATM-GOV-0265` and `ATM-GOV-0266` are closed and pushed. The latter provides
  the durable runner-session/receipt direction, including sealed-input and
  child-attribution contracts. Treat their closed evidence as baseline, not
  as proof that Plan 3.1 as a whole is closed.

### Live Open Or Parked Plan 3.1 Work

| Work item | Live truth | What remains |
|---|---|---|
| `TASK-SKL-0029` | blocked / released | Reconcile its autonomous validator/review lifecycle delivery and its blocked bundle before using it as the enforcement gate for later dogfood. |
| `ATM-GOV-0240` | blocked / released | Historical/current runner red-green discrimination delivery needs a governed replay/close path. |
| `ATM-GOV-0248` | blocked / released | Non-Git proposal workspace and steward-write migration needs the same replay/close treatment. |
| `ATM-GOV-0267` | planning only, not imported | Runner-version selection qualification and feedback-loop implementation remains unstarted. |
| `ATM-GOV-0268` | planning only, not imported | Runner-selection producer contract/snapshot provider remains unstarted. |
| `ATM-GOV-0242`–`0244`, `0246`–`0263` | planning backlog | Compose-first dogfood, paired AB/BA evidence, transactional steward/commit candidate, overlap parity, autonomous recovery, and final-proof lanes remain open. |
| `ATM-GOV-0245` | planning backlog | Final evidence aggregation/verdict; it must be last and cannot close Plan 3.1 while any preceding dogfood or recovery proof is open. |

Planning frontmatter often still says `planned`; the target live ledger is the
authoritative lifecycle state. Do not re-import a blocked task merely to make
the mirror look tidy.

### Required Plan 3.1 Order

1. Preserve the independent GIT recovery sequence below; it repairs the
   framework machinery used by every subsequent close.
2. Reconcile and close `TASK-SKL-0029`, then replay/close `ATM-GOV-0240` and
   `ATM-GOV-0248` with their existing evidence. Do not recreate their source
   delivery from scratch.
3. Before importing either runner-selection card, perform a small
   planning-fidelity repair: `ATM-GOV-0267` names qualification as its role,
   while `ATM-GOV-0268` describes itself as the producer required before that
   qualification but currently declares the opposite dependency direction.
   Normalize this producer -> consumer order in the cards first.
4. Execute the runner-selection producer/qualification pair, then the
   compose-first dogfood and transactional-steward lanes in dependency order.
5. Run paired workload evidence, rollback parity, dashboard/manifest, and
   independent acceptance gates only after the underlying execution substrate
   is proven.
6. Execute `ATM-GOV-0245` last as the evidence aggregator and final verdict.

`TASK-AAO-0206` is a separate, currently active support lane for the bounded
read-only `tasks audit` projection. It may run in parallel because it does not
change Plan 3.1 behavior; its result reduces the cost of the captain audits
above.

## GIT Status And Required Order

| Task | Live state | Meaning | Next allowed movement |
|---|---|---|---|
| TASK-GIT-0024 | blocked / released | G16 historical ownership convergence; staged lifecycle records remain preserved. | Resume only after G7.1/G7.2 transaction path is verified. |
| TASK-GIT-0025 | running / active | G9.1 import-origin work-admission ticket parity. Source and focused tests exist as WIP; do not call it delivered. | Reconcile after the frozen runner is healthy; then validate and govern a real delivery. |
| TASK-GIT-0026 | ready / released | Evidence-context bundle atomicity correction. | Claim after GIT-0025 and the transaction facade are stable. |
| TASK-GIT-0027 | running / active | G7.1 exact staged-entry lease authority. Delivery commit `0de8db0a4` exists. | Complete runner publication/evidence, then close with historical delivery. |
| TASK-RFT-0101 | planning only | Mandatory deep-module rehabilitation of the preservation WIP. | Import after confirming delivery `0de8db0a4` is an ancestor; it deliberately runs before GIT-0027 close to break the line-budget cycle. |
| TASK-GIT-0028 | planned | G7.2 production transaction wiring. | Blocked by GIT-0027 and RFT-0101; never use preservation commits as its evidence. |

Canonical execution order:

1. Treat frozen runner generation `5891f6884` as published and released; do not reuse the expired earlier queue.
2. Import and complete `TASK-RFT-0101` against landed delivery `0de8db0a4`.
3. Close `TASK-GIT-0027` using delivery `0de8db0a4` after the RFT split removes the line-budget conflict and fresh evidence is recorded.
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

The earlier queue incident is resolved for the current generation: commit
`5891f6884` published the exact receipt-declared outputs sealed to
`0a817b33f`, and its steward group was released. Frozen `node atm.mjs` loads
again. Do not reuse or hand-edit any expired queue record.

The remaining lifecycle blocker is not runner loading: GIT-0027 pre-close sees
the over-budget `git-commit-task-scoped-staging.test.ts` WIP. RFT-0101 owns the
structural split that removes that blocker.

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

## RFT-0101 Active Recovery Checkpoint

`TASK-RFT-0101` is imported and claimed by `codex-git-series-captain` after
Broker serial-release decisions for its overlaps with GIT-0024 and GIT-0027.
Those decisions authorize only RFT extraction work; the two GIT tasks remain
blocked/running in their existing lifecycle states.

The first source inventory confirms that the 5,734-line facade contains
multiple independently changing responsibilities, not one oversized algorithm:

1. CLI option parsing, identities, and admission dispatch.
2. Git-head evidence and commit-attempt diagnostics.
3. Record-only block-bundle classification and staging policy.
4. Task-scoped index parking/restoration and bundle resolution (the transaction
   core, beginning around `withTaskScopedCommitIndex`).
5. Framework-temp staging and branch-commit queue recovery.

Start with a map/report and extract the transaction core plus test fixtures;
keep `implementation.ts` as a typed facade. Do not add behavior to the
preservation diff. The test is currently 623 lines, so its facade/support split
is part of the same atomic boundary.

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
