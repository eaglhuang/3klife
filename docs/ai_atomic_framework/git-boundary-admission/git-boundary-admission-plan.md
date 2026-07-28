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
  - TASK-GIT-0022
  - TASK-GIT-0023
  - TASK-GIT-0024
  - TASK-GIT-0025
  - TASK-GIT-0026
updated_at: 2026-07-29T12:00:00+08:00
---

# ATM Git Boundary Admission Plan

## Summary

MVP execution status: all `TASK-GIT-0001` through `TASK-GIT-0012` were completed in the target repository on 2026-06-23. This planning mirror remains the design/archive record for the delivered series and the active record for post-MVP hard-gate extensions.

Post-MVP extension: `TASK-GIT-0013` is the P0 hard-gate follow-up after Team Agents dogfood showed that pre-push admission and local hooks do not prevent an unrestricted AI agent from directly running raw destructive Git commands. The extension treats Git mutation as a governed capability: supported integrations should deny raw Git mutation by default and route agents through ATM Git tools, Broker index lanes, and scoped emergency leases.

Follow-up: `TASK-GIT-0014` closes the remaining push gap discovered while closing `TASK-GIT-0013`: ATM can admit a push and the pre-push hook can guard commit ranges, but the final remote mutation still requires raw host `git push`. The follow-up adds a governed `atm git push` wrapper and makes supported integrations route raw `git push` attempts to that wrapper.

Follow-up: `TASK-GIT-0015` formalizes the emergency `TASK-AAO-0189` plan created from `ATM-BUG-2026-07-12-161`: raw Git denial and governed push are not enough while multiple AI agents share one Git index. The follow-up makes the staging index a Broker-owned lane, blocks foreign-active unstage/restore/reset/clean operations by default, and introduces explicit stage-only and destructive override leases with audit evidence.

Follow-up: `TASK-GIT-0016` closes the execution-surface gap exposed by external-worker dogfood. Integration command guards are necessary but do not confine an agent that can invoke an unrestricted host shell. The extension introduces one brokered restricted-execution gateway for external workers, rejects interpreter-evaluation and raw mutation escape hatches, and projects the same ATM-only route through every entry skill and structured CLI recovery message.

Follow-up: `TASK-GIT-0017` corrects a runner-publication gap found while closing `TASK-GIT-0016`: a sealed build can update tracked `packages/cli/dist/**`, the onefile manifest, and its steward receipt while the framework-temp publication route commits only a subset. The extension makes one build-output inventory the authority for enqueue, claim, receipt, publication commit, and doctor freshness. Its paired framework-temp lock projection is the only authority for whether an inventory member is foreign-live, stale recovery input, or unowned. Claim admission and active-work summaries consume that same classification; they must not infer ownership from a direction lock in one path and raw runtime lock files in another.

G9 remains separate from G10: G9 classifies sealed runner outputs and their recoverable residue. G10 decides whether a claimed task receives work-admission recovery support (`recoveryMode`) and records its ticket. G9 must not create snapshots, tickets, or another policy authority; G10 must consume G9's compact inventory/disposition evidence rather than rediscover runner output paths.

First-principles simplification: `TASK-GIT-0018` and `TASK-GIT-0019` finish the
capability boundary without adding an OS sandbox or another worker launcher.
The protected resource is not process creation; it is progression of a task or
change into accepted shared state. Claim atomically issues a work-admission
ticket derived from the card's scope, lifecycle intent, validators, and
declared command manifests. ATM tools record content-addressed mutation
attribution against that ticket. Police, Broker, Reviewer, governed commit,
close, protected push, and remote required checks consume one coverage
decision. A native write may still occur in an unrestricted host shell, but it
cannot become a valid ATM delivery until it is attributed or recovered.

The earlier launcher, independent protected-state chain, and separate
conformance-matrix decomposition in `TASK-GIT-0018` through `TASK-GIT-0021`
created four policy owners around one invariant. The cohesion-first replacement
keeps two modules: one admission-ticket authority and one shared
coverage/gate rollout. `TASK-GIT-0020` and `TASK-GIT-0021` are superseded by
these narrower active cards.

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
| G9.1 | TASK-GIT-0025 | Correct G9/G10 projection and glob-scope parity; runs independently of G11.1 |
| G11.1 | TASK-GIT-0026 | Make protected evidence context evaluate the complete task-scoped staged bundle; unblocks G16 closeout independently of G9.1 |
| G10 | TASK-GIT-0018 | Claim-issued work-admission ticket authority, attribution, and recovery |
| G11 | TASK-GIT-0019 | Unified ticket coverage gates and cross-adapter rollout evidence |
| G12 | TASK-GIT-0020 | Superseded by G10/G11: protected-state checks are coverage adapters |
| G13 | TASK-GIT-0021 | Superseded by G11: conformance evidence belongs to rollout acceptance |
| G14 | TASK-GIT-0022 | Publication disposition enforcement and clean-worktree finalization |
| G15 | TASK-GIT-0023 | Foreign generated residue admission deferral and ticket continuity |

### G9 Foundation Boundary

`TASK-GIT-0017` remains closed and is the sole authority for sealed runner
publication inventory. This plan does not reopen it for later admission or
hook defects: G9.1 consumes its inventory through a compatibility projection,
while G11.1 classifies task-scoped staged governance bundles. Neither card may
recreate runner-output membership, infer it from release filenames, or add a
second inventory registry. A future change to the inventory's public contract
must be a new explicitly-versioned G9 follow-up, not a silent edit to GIT-0017.

## Work-Admission Ticket Continuation

### First-Principles Boundary

The protected resource is not a command spelling, a Git hook, an ATM task file,
or the ability to invoke a host process. It is the ability to advance a task or
mutation into accepted shared state. Prompt text, editor skills, and command
deny lists improve behavior, but none of them is authority.

The trustworthy chain is:

`task card -> atomic claim + admission ticket -> mutation attribution -> validators/review -> delivery authorization -> close/protected publication`.

The ticket is derived only from governed task data:

- file authority comes from `scopePaths` and the active direction lock;
- Git authority is a lifecycle operation class such as stage, commit, close, or
  push, never arbitrary raw Git argv;
- process authority comes from declared validator or generated-write command
  manifests, never generic `node -e`, shell text, or PowerShell write access;
- actor, task, lane, claim generation, scope digest, expiry, and runner
  selection are bound into the ticket.

Git does not provide arbitrary per-file metadata, so ATM records attribution in
a content-addressed ledger keyed by path, base digest, observed digest,
operation class, and ticket id. A file itself is not rewritten merely to carry
governance metadata.

Recovery snapshots are a policy-controlled aid, not part of the always-on
admission boundary. Every write-capable claim still receives the cheap ticket,
content digests, and downstream coverage gates. The task card declares:

`workAdmission.recoveryMode: auto | enabled | disabled`

The default is `auto`. The authority resolves `auto` to `enabled` only when
governed evidence identifies elevated task risk/complexity, destructive
capability, sensitive shared surfaces, or an untrusted, degraded, or
not-yet-proven worker/adapter. It otherwise resolves to `disabled`, producing
no snapshot scan, blob write, or task snapshot GC work. Trust is evidence-based
and must not be inferred from a model brand.

Task authors, Captains, and the human owner may force `enabled` or `disabled`.
A worker cannot change this setting after claim. The requested mode, resolved
mode, reasons, and policy digest are sealed into the admission ticket. An
in-flight change requires a governed planning amendment and ticket reseal; a
prompt or environment variable cannot disable recovery.

The planning importer must validate and preserve this field in the target
ledger. Unknown modes fail import, and dry-run import must expose the normalized
policy. The field is not allowed to remain planning prose that disappears
before claim.

When enabled, recovery uses a bounded sparse temporary snapshot, not a commit
or continuous backup stream. Each task may retain at most two save points:

1. the claim baseline;
2. one replaceable pre-risk save point created only before a destructive
   recovery or high-risk overwrite.

Clean tracked files reference existing Git blob ids and consume no copied
content. Only dirty or untracked preimages are compressed into the gitignored
`.atm/runtime/work-admission-temp/` content-addressed store. Post-write state is
represented by digests, not another full blob. Per-task and repository-wide
hard byte budgets fail closed instead of expanding storage silently.

Successful close immediately removes temporary blobs and retains only a small
digest manifest. Handoff or blocked recovery may pin the two save points with a
TTL. A governed GC command removes expired task snapshots quickly. No recovery
blob or temporary manifest is committed to Git.

When disabled, ATM creates no recovery snapshot directory or blob for that
task. Admission tickets, mutation attribution, Police/Broker/Reviewer checks,
validators, commit, close, push, and remote required checks remain fully
enforced. Recovery is then limited to existing Git objects, provenance review,
late attach where evidence permits it, quarantine, corrective commits, or
forward recovery. Claim and `next` must state that tradeoff concisely.

Without an OS sandbox, ATM cannot truthfully claim that a native write or local
raw commit never happened. It can guarantee that an unattributed mutation
cannot pass ATM lifecycle gates. To prevent a direct raw push from bypassing
the local process entirely, protected branches must require the same ticket
coverage result as a remote status check.

### Deep-Module Decomposition

- **G10 / `WorkAdmissionTicketAuthority`**: deepens the existing `WriteTicket`
  and `RestrictedExecutionGateway` instead of replacing them. It atomically
  issues a ticket with claim, evaluates content-addressed mutation coverage,
  advances ticket stages, and returns one recovery plan for unattached WIP.
  Its two primary adapters are claim issuance and mutation observation.
- **G11 / `WorkAdmissionCoverageGate`**: projects the G10 decision into Police,
  Broker, Reviewer, governed commit, close, protected push, and remote required
  checks. It owns no new permission rules. Cross-adapter fixtures and rollout
  evidence live here instead of in a separate conformance module.
- **G12 / G13**: retired before import. Their protected-state and conformance
  responsibilities are adapters and tests of G10/G11, not independent deep
  modules.

Deletion test: removing G10 forces claim, write-ticket, and execution policy to
reconstruct task authority independently. Removing G11 forces Police, Broker,
Reviewer, commit, close, and push to maintain separate ticket checks. No third
module passes the deletion test.

### Recoverable Violation State Machine

A bypass is recoverable but never silently normalized:

1. **Covered write**: ticket, scope, digest, and operation match; continue.
2. **Late attach**: a native write is in-scope and attributable. Record a
   violation receipt, bind the observed digest, rerun validators and review,
   then allow stage advancement.
3. **Scope recovery**: out-of-scope WIP must be amended, split to a new task,
   handed off, quarantined as non-delivery WIP, or discarded with proof.
4. **Native commit recovery**: accept only through provenance review as a
   historical delivery or through a governed corrective commit; never rewrite
   history automatically.
5. **Published bypass**: a raw push without valid coverage is a remote
   governance incident. Block task closure/promotion and require a forward
   recovery; do not pretend a local ticket can retroactively prevent it.

Every recovery is idempotent and preserves the original violation evidence.
Without an OS watcher, ATM guarantees recovery to the claim baseline and the
optional pre-risk save point only when the resolved recovery policy is enabled,
not every intermediate byte written by an unmanaged process. A disabled
snapshot policy never weakens ticket coverage or delivery gates.

### Dependency and Rollout Order

1. Complete `TASK-GIT-0017` first to remove live runner-publication ambiguity.
2. `TASK-GIT-0025` follows the delivered G9/G10 contracts and restores their
   shared projection/scope fidelity. `TASK-GIT-0026` independently repairs
   G11's protected staged-bundle projection. They may run in parallel.
3. G16 (`TASK-GIT-0024`) retries historical-attestation closeout only after
   both G9.1 and G11.1 have landed; this keeps ticket admission and protected
   evidence context as separate deep modules rather than coupling either fix
   to the other.
4. `TASK-GIT-0018` depends on the restricted execution and ATM-only guidance
   delivered by `TASK-GIT-0016`; it reuses those decisions while making claim
   ticket issuance and recovery authoritative.
5. `TASK-GIT-0019` depends on `TASK-GIT-0018` and performs the full gate,
   adapter, dogfood, and remote-check rollout as one large integration card.
6. Do not import or claim `TASK-GIT-0020` or `TASK-GIT-0021`; they are
   superseded planning records. The current target importer normalizes
   non-terminal planning statuses to `planned`, so retirement authority remains
   the planning card/index/plan contract until importer-level retirement
   fidelity is implemented.

Unsupported adapters may still assist with read-only work. Their prose does not
grant write authority. An unrestricted worker can produce a patch or dirty WIP,
but only an ATM ticket and shared coverage gate can promote it to delivery.

## Non-Goals

- No every-commit mandatory gate in MVP.
- No background daemon/cache in MVP.
- No cross-machine broker RPC in MVP.
- No full automatic rebase engine.
- No automatic commit after steward apply by default.
- No promise to resolve all Git conflicts semantically.
- No claim that local hooks alone can prevent raw destructive Git commands by unrestricted AI shells.
- No claim that skill text alone constrains an external worker.
- No new general worker launcher or OS sandbox.
- No arbitrary command strings in tickets; only structured ATM operation classes and declared manifests.
- No per-file content rewriting solely to carry ticket metadata.
- No silent laundering of native writes; late attachment always retains violation evidence and requires revalidation.
- No raw Git workaround for generated runner residue. Every declared publication output needs an ATM-governed disposition.
- No claim that ATM can stop arbitrary user-owned terminal sessions from creating local bytes or commits.

## Final Acceptance

- `atm git admit` or equivalent command can evaluate local-vs-remote deltas before push.
- A pre-push hook can call the command and preserve clear operator output.
- Same-file disjoint structured edits can be routed through existing broker/composer semantics.
- True overlap blocks before push and produces reviewable evidence.
- Post-push-fail fallback can explain and rerun the same admission path.
- Evidence can be archived for paper claims without inventing a new envelope schema.
- Claim and work-admission ticket issuance are atomic; a write-capable claim without a valid ticket cannot start.
- Ticket coverage is content-addressed and consumed by Police, Broker, Reviewer, governed commit, close, protected push, and the remote required check through one evaluator.
- Direct native writes remain recoverable through late attach, scope amendment, split, handoff, quarantine, discard-with-proof, historical-delivery review, or forward incident recovery.
- Direct raw Git, interpreter evaluation, and shell write paths may create local state in unrestricted hosts, but unattributed results cannot pass ATM or protected-branch acceptance.
- A runner is not publication-current merely because its source mtime is current; the sealed build-output inventory and its receipt must be committed or explicitly retained by a governed recovery state.

## G14 - Publication Disposition Enforcement

`TASK-GIT-0022` is the correction card for the post-GIT-0019 observation that
a sealed build can leave generated members dirty while doctor reports current.
It does not reopen GIT-0017. It makes the GIT-0017 inventory authoritative at
the remaining adapter boundary: a sealed generation has one inventory digest
and one terminal disposition, consumed by publication, runner-sync release,
claim admission, and doctor. Unrelated Plan3.1/TMP evidence remains outside
that inventory and must retain its own governed owner or recovery receipt.

G14 is also the sole registry owner for `ATM_RUNNER_PUBLICATION_PENDING` and
`ATM_RUNNER_PUBLICATION_INVENTORY_INCOMPLETE`. The first reports a sealed
generation that has no terminal publication/recovery disposition; the second
reports a receipt or transaction whose membership does not match the sealed
inventory digest. Both must be emitted with structured details and registered
through the canonical error-code pipeline. They are not aliases for source-mtime
drift and must never be replaced by doctor-local allowlists or prose-only
recovery guidance.

## G15 - Foreign Generated Residue Admission Deferral

`TASK-GIT-0023` resolves a distinct dogfood gap exposed after G14: a task can
have a current runner, fresh validators, and a valid delivery, yet be unable to
renew its admission ticket or close because an independently owned generated
artifact is dirty in the common worktree. The solution must not fold every
generated file into `BuildOutputInventory`; that would turn the runner
publication module into a second, global artifact registry.

G15 therefore adds one `ForeignGeneratedResidueDisposition` adapter beneath the
existing work-admission ticket authority. It first asks G9's
`BuildOutputInventory` whether a path belongs to a sealed runner generation. A
member is never deferred and follows G9/G14 publication recovery. For a
non-member, G15 permits only a verifiable producer/provenance proof with
content digests and independently attributable ownership. The result is either:

- **deferred foreign generated residue**: recorded in ticket evidence but never
  granted to the candidate task for write, staging, commit, restore, deletion,
  or close-bundle membership; or
- **blocked residue**: the default for unknown, semantic, stale, or
  unverifiable WIP.

Claim admission, ticket renewal, write-readiness, and close consume this one
result. G15 has no automatic cleanup behavior and no path allowlist. Its first
fixture is the SKL-owned corpus audit artifact that blocks G14's GIT-0022
closeout. G15 releases the ticket continuity problem without taking ownership
of the SKL artifact; its canonical producer remains responsible for later
regeneration or delivery.

## G16 - Historical Admission Attestation and Terminal Ownership Convergence

`TASK-GIT-0024` owns the forward-only recovery for a protected push that sees
an already-created critical commit without an `ATM-Work-Admission` trailer.
It does not reopen GIT-0017, GIT-0022, or GIT-0023, and it must never rewrite
history to make an old commit appear governed after the fact.

The design adds one deep `HistoricalWorkAdmissionAttestationAuthority`:

- normal commits remain covered by their committed ticket trailer;
- a historical exception requires an append-only, governed attestation binding
  the exact commit SHA, parent and tree context, pushed range, canonical ticket
  digest or approved emergency provenance, task/lane attribution, and review
  evidence;
- pre-push, the attestation command, and future remote enforcement consume the
  same evaluator; unknown, tampered, future, non-ancestor, or conflicting
  records fail closed;
- the record is corrective provenance only. It grants no write capability,
  cannot cover a different commit, and does not erase the emergency signal.

The same card converges terminal ownership semantics. A `done` task with a
released claim and released direction lock must not be treated as active by
pre-commit. Conversely, a ledger/lock mismatch remains blocked. One shared
lifecycle predicate replaces independent hook and repair heuristics.

G16 depends on G14/G15 outcomes (`TASK-GIT-0022`, `TASK-GIT-0023`), the
G9.1 parity correction (`TASK-GIT-0025`), and the G11.1 staged-bundle
correction (`TASK-GIT-0026`), because it must distinguish their
exact sealed receipts and emergency preservation from ordinary unprovenanced
commits without treating its own forward-attestation evidence as ticket
out-of-scope. It is the required gate before retrying a push blocked solely by
`ATM_WRITE_TICKET_MISSING` in historical local commits.
