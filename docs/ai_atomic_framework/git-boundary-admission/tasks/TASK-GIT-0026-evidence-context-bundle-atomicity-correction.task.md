---
task_id: TASK-GIT-0026
title: Evidence context bundle atomicity correction
status: done
completed_at: 2026-07-29T16:26:26.044Z
completed_by: codex-git-series-captain
delivery_commit: 91fcf80a5855f5b00abb0cdc86c256401885475d
closure_commit: d1c77258ffebf8cd21352101b06e323470853fd8
closure_packet: .atm/history/evidence/TASK-GIT-0026.closure-packet.json
owner: claude-005
priority: P0
milestone: G11.1
depends_on:
  - TASK-GIT-0019
  - TASK-GIT-0025
causalGraph:
  causalDependencies:
    - "G11 ticket coverage gate"
  startConditions:
    - "GIT-0024 evidence bundle reproduces the protected-state false block"
  softRelations:
    - "unblocks GIT-0024 historical attestation closeout after the independent G9.1 projection correction"
  changedPublicSeams:
    - "pre-commit protected evidence context classifier"
  causalImpactEdges:
    - "task-scoped staged bundle -> protected evidence context -> pre-commit allow or fail closed"
  parallelFrontierInputs: []
  validatorReferences:
    - "tests/cli/pre-commit-evidence-context-parity.test.ts"
    - "tests/cli/historical-work-admission-attestation.test.ts"
  phaseOwner: atm.git-boundary-admission
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/hook/pre-commit/support.ts"
  - "packages/cli/src/commands/hook/pre-commit/implementation.ts"
  - "tests/cli/pre-commit-evidence-context-parity.test.ts"
  - "tests/cli/historical-work-admission-attestation.test.ts"
deliverables:
  - "One task-scoped staged-bundle classifier that proves a protected evidence file travels with the same task's ledger and/or transition event before the hook permits it."
  - "Fail-closed handling for mismatched task IDs, evidence-only bundles, and multi-task ambiguity; no task-id, actor, or filename allowlist."
validators:
  - "node --strip-types tests/cli/pre-commit-evidence-context-parity.test.ts"
  - "node --strip-types tests/cli/historical-work-admission-attestation.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
errorCodes:
  - "ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT"
createdByCommand: atm plan card create
---

# TASK-GIT-0026 Evidence context bundle atomicity correction

## Intent

Repair the G11 protected-state adapter so it evaluates the actual single-task
staged bundle, not a partial internal subset. The live reproduction is
TASK-GIT-0024: its attestation evidence, ledger, and two renew events are all
staged together, yet pre-commit reports that the evidence lacks task context.

## Ordering

This is a G11.1 correction layered on the delivered G11 coverage authority
(`TASK-GIT-0019`) and G9.1 (`TASK-GIT-0025`). Its source classifier can be
drafted independently, but its delivery commit must wait for G9.1: the commit
gate must validate the same filtered staged bundle that the hook classifies.
G16 retries its closeout only after both have landed.

## First-Principles and Deep-Module Design

The protected resource is not an evidence filename. It is the integrity of a
task-scoped governance bundle. The pre-commit support module must parse the
staged set once, derive the task identity and required sibling relationship,
and return a decision consumed by the hook implementation. The hook must not
reconstruct its own sibling rule from a filtered list.

Deletion test: removing this classifier would force every protected-state
consumer to reimplement task-id extraction, sibling matching, and ambiguity
handling. Do not add a special case for TASK-GIT-0024 or any evidence suffix.

## Non-Goals

- Do not commit, close, replay, discard, or alter the preserved G8 Lock B and
  seven-residue fixture.
- Do not bypass hooks, use raw Git, or add a filename/actor/task allowlist.
- Do not change historical-attestation provenance semantics; this card only
  fixes the pre-commit context projection.

## Acceptance

- [ ] Same-task evidence + ledger, and same-task evidence + transition event,
  both pass the protected-state context check when staged in one bundle.
- [ ] Evidence-only, mismatched-task, and multi-task-ambiguous bundles fail
  closed with `ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT`.
- [ ] The hook implementation consumes the shared classifier result; it has no
  duplicate task-id or filename policy.
- [ ] Focused tests, historical-attestation regression, typecheck, and
  `validate:cli` pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T23:32:02.800Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0026-evidence-context-bundle-atomicity-correction.task.md","contentDigest":"sha256:45aa71e5a31678d366625e7cb0d2c6d3feddb7a9d9d843a360a861dde7d2dc34"} -->
