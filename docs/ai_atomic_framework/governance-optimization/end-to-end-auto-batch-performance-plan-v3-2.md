---
doc_id: doc_atm_gov_auto_batch_perf_plan_v3_2
title: ATM 3.2 Close-Time Gate Economy and Deep-Module Validation Plan
status: active
family_dir: governance-optimization
owner: atm-core
predecessor: doc_atm_gov_auto_batch_perf_plan_v3
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
created_at: 2026-07-30T11:34:41+08:00
updated_at: 2026-07-30T11:34:41+08:00
createdByCommand: atm plan doc create
---

# ATM 3.2 Close-Time Gate Economy and Deep-Module Validation Plan

## Positioning

Plan 3.1 is complete and remains the closed dogfood evidence baseline. Plan 3.2
does not reopen Plan 3.1 delivery. It starts from the Plan 3.1 measured closeout
costs and fixes the next bottleneck: ATM currently mixes high-value safety gates
with repeated, blocking, or unobservable close-time gates.

The owner-approved planning family remains `GOV / ATM-GOV` under
`governance-optimization`, because this work changes ATM governance economics,
close validation, evidence freshness, and cross-authority recovery. It is not an
ERR-family registry migration, not a TMP cleanup, and not an RFT oversized-module
refactor.

## Carry-forward evidence from Plan 3.1

Plan 3.1 is eligible to hand off to Plan 3.2 because the target ledger shows all
Plan 3.1 frontier cards as `done / released / no-residue`, and the planning repo
cards `ATM-GOV-0240` through `ATM-GOV-0268` are closed with delivery commits.

Measured gate costs from the final dogfood window:

- `typecheck`: about 11.5 seconds.
- `validate:cli`: about 47 seconds.
- `validate:git-head-evidence`: about 98 seconds.
- `pre-push`: about 13 to 14 seconds per run.
- `doctor`: about 18 seconds.
- `validate:standard -- --json`: exceeded 30 minutes and timed out without a
  complete terminal summary.

The failure mode is not that every task card is too large. The code delivery
portion is usually much shorter than the closeout path. The slow path is a
governance avalanche: close requires evidence freshness, evidence freshness can
require runner/git-head/pre-push state, runner publication can require
attestation, and each blocker may surface without a legal recovery lane.

## First principles

ATM safety should come from the smallest evidence chain that proves the current
claim, delivery commit, and declared impact are safe. A gate is economically
valid only when it answers a specific question:

1. Was the work admitted into the declared scope?
2. Is the evidence fresh for the current delivery commit and content hash?
3. Did the relevant validators for this causal impact pass?
4. If a shared governance surface blocks, is there a legal recovery lane?
5. Can the resulting target close, planning closeback, and runner publication be
   retried idempotently without replaying unrelated heavy work?

Plan 3.2 therefore forbids using an all-repository heavyweight validator as the
default proof for a single task close. Full release validation remains valid for
release, nightly, or batch-confidence lanes, but not as the ordinary close gate
for unrelated single-card work.

## Deep-module split

The plan creates five cohesive modules. Each module owns one public seam, one
rollback boundary, and a small set of adapters.

| Task | Deep module | Primary question | First adopter |
| --- | --- | --- | --- |
| `ATM-GOV-0269` | Validation Plan Orchestrator | Can `validate:standard` be decomposed, observed, timed out, and resumed? | `scripts/run-validators.ts` |
| `ATM-GOV-0270` | Evidence Freshness Engine | Which validators must rerun for this delivery commit/content hash? | `taskflow close` |
| `ATM-GOV-0271` | Governance Close Saga Coordinator | What is the next legal phase or recovery lane for closeout? | `taskflow pre-close/close` |
| `ATM-GOV-0272` | Public Attestation Authority | How does an operator create governed forward/emergency attestations without hidden commands? | pre-push / historical admission |
| `ATM-GOV-0273` | Closeback Boundary Facades | Can target close, planning closeback, and runner publication be isolated and retried independently? | cross-authority closeback |

## Delivery policy

- Implement cards in order unless a later card is used only for read-only
  design review.
- Every card must produce or preserve a deep-module review receipt before broad
  production edits.
- New behavior must be generalized and data-driven; no task id, actor id, local
  path, date, or incident-specific control-flow exception may be encoded.
- Validators must be causal and tiered. `validate:standard` may appear only as a
  release-lane or plan-level confidence validator after `ATM-GOV-0269` exposes
  resumable sub-results.
- Close path changes must be proven by interface tests, not private-internal
  tests glued onto the old shallow modules.

## Success criteria

- `validate:standard -- --json` emits observable sub-validator progress and a
  terminal partial summary on timeout.
- A single-card close can prove validator freshness from delivery commit,
  content hashes, command identity, and receipt metadata without rerunning every
  heavyweight validator.
- `runner-sync`, `pre-push`, `evidence`, and `close` return legal recovery lanes
  instead of circular blocker chains.
- Forward/emergency attestation is a documented public CLI/API with dry-run,
  write, status, and validation surfaces.
- Target closure, planning closeback, and runner publication each expose
  independent dry-run/write/explain/recover seams and can be coordinated by a
  saga without becoming one large hidden transaction.

## Pre-Plan 3.2 dual-captain readiness addendum

The 2026-07-30 readiness check found that the broker and neutral-steward layers
already model proposal-first overlap correctly, but the outer claim and commit
adapters are not yet safe enough for live Plan 3.2 parallel rollout.

Two P0 GOV follow-up cards must be handled before starting normal Plan 3.2
implementation:

- `ATM-GOV-0274`: enforce same-task different-lane claim rejection. Assigned to
  Cursor.
- `ATM-GOV-0275`: preserve foreign staged and unstaged work during governed
  dual-captain commit. Assigned to Claude-005.

These cards are intentionally parallel frontier work. They share the
`atm.work-coordination-authority` design baseline and the deep-module review
fingerprint `deep-module-review:9433b14b`, but they must not directly edit each
other's primary files without Captain integration review.

## Pre-Plan 3.2 planning-source admission blocker addendum

The 2026-07-30 ATM-GOV-0269 claim attempt exposed a third blocking capability
gap before true dual-captain overlap testing can start:

- `ATM-GOV-0276`: planning seal benign upgrade, task import fidelity, and
  preclaim transaction guard. Assigned to Claude-005.

This card is not a workaround for ATM-GOV-0269. It must fix the framework
behavior that currently treats `planningCommitSha: null -> <sha>` with unchanged
`contentDigest` as source identity drift, allows `tasks import --force` to drop
machine-readable `causalGraph`, and lets failed claim preflight leave
reserve/promote ledger residue. ATM-GOV-0269 remains paused until this blocker is
delivered.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-07-30T03:34:41.963Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md","contentDigest":"sha256:726c0a172b3e746febb177ae270db449c5cc7ec1b5c53ae99aed4761b98c0559"} -->
