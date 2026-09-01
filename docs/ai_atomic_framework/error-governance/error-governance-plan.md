---
doc_id: doc_other_1791
title: ATM Error Governance System Plan
status: active
family_dir: error-governance
series: ERR
prefix: TASK-ERR
createdByCommand: atm plan doc create
---

# ATM Error Governance System Plan

## Purpose

This document is the source plan for the registered ERR planning family. The family uses task prefix TASK-ERR and owns ATM error-code governance work that should not consume ATM-GOV numbering.

## Current Source of Truth

The current canonical ErrorCode registry remains:

- docs/governance/error-code-registry.json

Creating the ERR family does not move that registry. A future governed migration may move it only if the migration updates registry readers, npm run generate:error-codes, generated docs/ERROR_CODES.md, tests, and every emitter/import path in one verified change.

## Rules

1. New, renamed, retired, or redefined ATM_* ErrorCodes must route through atm-error-code-resolver.
2. ErrorCode fields required by plans or task cards are baseline governance fields for the original task, not a reason to open an extra GOV card.
3. Open TASK-ERR work only when error governance itself is the primary subject.
4. Any future registry move must prove content/digest stability and generated-output parity.

## Initial Candidate Work

- Registry migration blueprint for docs/governance/error-code-registry.json.
- ErrorCode baseline fields for plan and task-card templates.
- ErrorCode reference analyzer for plans, task cards, backlog, and registry references.

## Wave 2 correction follow-up (2026-08-09)

`TASK-ERR-0012` owns the generic released-task residue transaction exposed by
the Plan 3.x/4.x false-green correction baseline. A released or abandoned task
may leave protected generated/staged governance bytes in the canonical index.
Those bytes must retain a durable lifecycle owner and a byte-identity snapshot;
an unrelated task must receive a brokered preserve/queue/recovery verdict, not
a bare refusal or a task-specific stage override. This follow-up reuses existing
index-ownership and WIP-admission error contracts; it introduces no new
task-, actor-, or filename-specific error code.

## Wave 0 unblock follow-up (2026-08-11)

`TASK-ERR-0013` owns the adjacent but distinct closure-repair commit boundary
recorded in `ATM-BUG-2026-07-31-002`. The corrective rule is general: a repair
may return a governed commit command only after it creates durable, task-scoped
write authority that the governed commit adapter can consume. It must preserve
the same authority across closure repair, explicit write-ticket operations, and
the commit adapter; it must not create task-, filename-, terminal-status-, or
incident-specific bypasses. Its fixture proves repair-to-commit end-to-end and
also proves that pre-write rejection does not consume an emergency lease or
leave partial staged state.

## Active Plan 3.1 Contracts (2026-07-22)

`TASK-ERR-0004` owns the registry and generated-document contract for receipt-bound
shared writes. The GOV implementation cards consume these codes but do not own
their definitions.

| Code | Exact trigger | Category | Retryable | Human approval | Recovery |
|---|---|---|---:|---:|---|
| `ATM_BROKER_STEWARD_RECEIPT_REQUIRED` | A multi-claim shared mutation reaches a side-effect boundary without a steward composition/apply receipt | `team-broker` | yes | no | Re-enter broker composition and neutral-steward delivery |
| `ATM_BROKER_STEWARD_RECEIPT_INVALID` | The supplied receipt is malformed, unsupported, stale, replayed, attribution-mismatched, digest-mismatched, or does not prove one canonical write | `team-broker` | yes | no | Rebuild the composition on current base/HEAD and obtain a fresh receipt |

Both contracts must expose deterministic operator guidance/required command,
identify `packages/core/src/broker/shared-write-provenance-policy.ts` as source
owner, and identify `TASK-ERR-0004` as registry owner.

`TASK-ERR-0005` owns the acceptance-evidence and cross-authority closeback
contracts. They distinguish semantic insufficiency, missing independent
verification, and an incomplete two-repository saga; implementations must not
collapse them into a generic packet/schema failure.

| Code | Exact trigger | Category | Retryable | Human approval | Recovery |
|---|---|---|---:|---:|---|
| `ATM_TASK_CLOSE_ACCEPTANCE_EVIDENCE_INSUFFICIENT` | A closure-critical predicate is unavailable, below required realness, non-discriminating, failed, or inconclusive | `task-ledger` | yes | no | Produce or re-verify the named authoritative evidence, then rerun pre-close |
| `ATM_TASK_CLOSE_INDEPENDENT_VERIFIER_REQUIRED` | Neither a separate-actor receipt nor a pre-sealed locked-policy verifier is valid | `task-ledger` | yes | no | Run the declared independent verifier, then rerun pre-close |
| `ATM_TASKFLOW_CROSS_AUTHORITY_CLOSEBACK_PENDING` | Target and planning authority commits are not both durable, or a sealed CAS moved | `taskflow` | yes | no | Diagnose and resume/reconcile the existing saga receipt without replaying completed side effects |

All three contracts identify `TASK-ERR-0005` as registry owner. Their source
owners are the acceptance-evidence gate and cross-authority closeback saga;
generated documentation and operator manifests remain registry-derived.

`TASK-ERR-0006` owns the two post-compose semantic-validation contracts. They
distinguish an exact candidate that ran and failed its required validators from
a candidate whose required validator could not produce command-backed evidence.
Both states prohibit canonical write and must not collapse into a generic
compose, steward-receipt, or validation error.

| Code | Exact trigger | Category | Retryable | Human approval | Recovery |
|---|---|---|---:|---:|---|
| `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_FAILED` | The exact materialized candidate ran required validators and at least one command-backed result failed | `team-broker` | yes | no | Repair or recompute proposals, rematerialize on current base/HEAD, and rerun the same sealed validator set before any canonical write |
| `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_UNAVAILABLE` | A required language/project validator cannot be resolved or executed, or has no command-backed result | `team-broker` | yes | no | Restore or resolve the declared validator and revalidate the exact candidate; skipping or caller-provided success is forbidden |

Both contracts identify `TASK-ERR-0006` as registry owner and the generic
post-compose semantic policy/CLI adapter as source owners. Generated TypeScript,
Markdown, and operator manifests remain canonical-registry projections.

## Card Creation

All ERR cards must be created by CLI:

node atm.mjs plan card create --series ERR --title TITLE --write --json

Do not hand-write TASK-ERR task cards.

## Taskflow close recovery follow-up (2026-08-20)

`TASK-ERR-0015` owns the canonical ErrorCode registry contract for
`ATM_TASKFLOW_PRECLOSE_BLOCKED`, `ATM_TASKFLOW_CLOSE_WRITE_NOT_READY`, and
`ATM_TASKFLOW_CLOSE_OWNED_DIRTY_PENDING`. The contract was exposed by a
false-green closeout: one authority snapshot classified receipt-owned dirty
files advisory while a later close blocker reused those same advisory paths as
blocking, and the blocker inherited an unrelated preceding blocker's recovery
command. Every blocker must derive recovery from its own registered code and
consume the same canonical authority snapshot as the gate it describes.
`ATM-GOV-0398` owns the implementation and fixture seam; this ERR card owns
the registry and generated-document source of truth.
