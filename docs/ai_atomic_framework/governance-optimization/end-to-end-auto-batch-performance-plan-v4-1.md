---
doc_id: ATM-GOV-PLAN-4.1
title: ATM Plan 4.1 Hard Causal Dependency and Parallel Work Proof
status: active
family_dir: governance-optimization
series: GOV
predecessor_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
createdByCommand: atm plan doc create
---

# ATM Plan 4.1 Hard Causal Dependency and Parallel Work Proof

## Purpose

Continue Plan 4.0 by making parallel admission the default and whole-task dependency blocking a rare, positively proven exception. Plan 4.1 does not weaken mutation, compose, validation, publication or close safety. It moves each constraint to its true lifecycle boundary.

A task may be prevented from starting only when its correct result must consume a named producer result that does not yet exist. Shared files, shared atoms, validation order, publication order, observation order and planning convenience are not hard causal dependencies by themselves.

## Hard-causal definition

All six facts are mandatory:

1. named producer task and not-yet-available output;
2. named consumer operation that reads that output;
3. proof that changing the producer output can change the consumer's correct result;
4. proof that no stable interface, sealed fixture, proposal-first patch, late binding or deferred compose can substitute;
5. proof that the consumer result is undefined without the output, not merely inconvenient, stale or unpublishable;
6. executable negative control that blocks before the output exists and admits after it is sealed.

Unproven or incomplete declarations fail import as invalid contracts; they do not gain authority to freeze unrelated work.

The canonical import and claim diagnostics for this contract are:

- `ATM_TASK_DEPENDENCY_HARD_PROOF_INCOMPLETE`;
- `ATM_TASK_DEPENDENCY_HARD_PROOF_CONTRADICTORY`;
- `ATM_TASK_DEPENDENCY_UNTYPED_IN_TYPED_CARD`;
- `ATM_TASK_DEPENDENCY_RELATION_UNKNOWN`.

These codes are owned by the dependency-gate contract and must be registered in the canonical ErrorCode registry. The import path may use bounded cohesive extraction to keep the validator facade and import orchestrator within the repository line budget; that extraction is part of ATM-GOV-0406, not a separate task or a change to dependency semantics.

## Lifecycle taxonomy

| Relation | Claim | Proposal/edit | Compose | Validate/close |
|---|---|---|---|---|
| hard-causal | blocked | speculative proposal may exist but cannot claim semantic validity | blocked | blocked |
| validation | allowed | allowed | allowed | waits for validator/basis |
| publication | allowed | allowed | allowed | waits for sealed publication |
| observation | allowed | allowed | allowed | waits for observation |
| soft-order | allowed | allowed | allowed | advisory |

Broker still arbitrates overlapping mutation. File/atom overlap may require proposal-first or serialized compose, but cannot become a whole-task dependency without the six-part proof.

## Fast delivery: exactly two cards

- **ATM-GOV-0406 (Claude Captain):** typed contract, import diagnostics and claim-readiness gate.
- **ATM-GOV-0407 (Cursor Captain):** PRF dependency census, reliable telemetry dashboard and real cross-editor proof using TASK-PRF-0002 plus TASK-PRF-0003.

Both cards have no claim-time dependency and must start concurrently. ATM-GOV-0407 may build its audit, instrumentation and proposal-first harness from this sealed plan. Its final compose and acceptance consume ATM-GOV-0406's contract SHA; that is a validation/compose dependency, not permission to delay claim.

## Product-proof window

- distinct actors and editor adapters;
- both cards actively work concurrently for at least 15 minutes or 25% of the shorter active interval;
- maximum concurrent active claims at least two;
- at least one overlapping/dependent surface reaches proposal-first or Broker arbitration;
- zero foreign-byte overwrite, unauthorized takeover and safety bypass;
- a hard-causal negative control is denied before producer output and admitted afterward;
- TASK-PRF-0002 and TASK-PRF-0003 are the real workload sample, not new PRF planning authority.

## Reliable dashboard

The artifact must seal a time window, watermark, numerator, denominator, source paths, commits and SHA-256 digests. It reports audited edges, hard-causal edges/rate, typed nonblocking and unclassified edges, claim attempts/admissions, concurrency, overlap duration/ratio, proposals, Broker/compose outcomes, safety events, validators, delivery, publication and close separately.

The hard-dependency rate is observational, not a quota. No edge may be relabelled to approach 2% or any other target.

## Exit criteria

- PRF census has zero unclassified edges.
- Every blocking edge has six facts and executable positive/negative controls.
- The two-card and PRF-0002/0003 proof windows satisfy concurrency and safety thresholds.
- Non-hard relations do not block claim; hard-causal control remains fail-closed.
- Dashboard regeneration reproduces counts and digest.
- Source delivery, frozen publication and formal closeout are independently reported.

## Out of scope

- Rewriting all legacy families.
- Removing Broker mutation protection.
- Treating speculative output as a valid producer result.
- Adding more Plan 4.1 cards unless a failed acceptance criterion proves these two cohesive cards cannot own the repair.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-08-22T15:35:11.313Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/end-to-end-auto-batch-performance-plan-v4-1.md","contentDigest":"sha256:5b3b00505560f8e9c2e93c9e2cb3389ea08fca56fce2fc074c0fe1d25425b136"} -->
