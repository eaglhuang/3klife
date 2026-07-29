---
task_id: TASK-GIT-0024
title: Historical work-admission attestation and terminal ownership convergence
status: done
completed_at: 2026-07-29T18:03:47.453Z
completed_by: codex-git-series-captain
delivery_commit: 91fcf80a5855f5b00abb0cdc86c256401885475d
closure_commit: 5e0bb05474f6ac50269067207cc2fb1d9d76162d
closure_packet: .atm/history/evidence/TASK-GIT-0024.closure-packet.json
owner: atm-core
priority: P0
depends_on:
  - TASK-GIT-0022
  - TASK-GIT-0023
  - TASK-GIT-0025
  - TASK-GIT-0026
causalGraph:
  causalDependencies:
    - TASK-GIT-0022
    - TASK-GIT-0023
  startConditions:
    - "The target branch contains a critical commit-range rejection with ATM_WRITE_TICKET_MISSING."
  softRelations:
    - "TASK-GIT-0017 remains the sole runner-output inventory authority and is not reopened."
  changedPublicSeams:
    - "HistoricalWorkAdmissionAttestationAuthority"
    - "terminal lifecycle ownership predicate"
  causalImpactEdges:
    - "governed commit -> immutable historical attestation -> pre-push evaluation"
    - "task terminal lifecycle -> pre-commit ownership classification"
  parallelFrontierInputs: []
  validatorReferences:
    - "tests/cli/historical-work-admission-attestation.test.ts"
    - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  phaseOwner: atm-core
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/historical-work-admission-attestation.ts"
  - "packages/core/src/broker/cross-task-mutation-guard.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "packages/cli/src/commands/hook/pre-commit/implementation.ts"
  - "packages/cli/src/commands/hook/pre-push.ts"
  - "packages/cli/src/commands/hook/commit-range-guard/implementation.ts"
  - "packages/cli/src/commands/tasks/claim-repair-diagnostics.ts"
  - "schemas/governance/historical-work-admission-attestation.schema.json"
  - "docs/governance/error-code-registry.json"
  - "packages/core/src/error-code-registry.generated.ts"
  - "docs/ERROR_CODES.md"
  - "tests/cli/historical-work-admission-attestation.test.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-push.spec.ts"
deliverables:
  - "One HistoricalWorkAdmissionAttestationAuthority deep module that verifies an append-only attestation against a fixed commit SHA, canonical ticket digest or approved emergency provenance, task/lane identity, and observed parent/range context."
  - "A governed attestation command produces only a forward corrective record; it never rewrites, amends, or claims to add a trailer to historical commits."
  - "Pre-push consumes the same authority: a normal ATM-Work-Admission trailer remains preferred, while a missing historical trailer blocks unless an exact, valid attestation covers that commit in the pushed range."
  - "The authority rejects an unknown commit, mismatched tree or parent context, altered ticket/provenance digest, duplicate conflicting attestation, non-ancestor target, and an attestation that attempts to cover a future commit."
  - "One terminal lifecycle ownership predicate is used by pre-commit and claim-repair diagnostics. A done/released task with a released lock is not active; a missing or inconsistent terminal transition remains blocked."
  - "Canonical ErrorCode registry, generated projection, and public index carry the new attestation and terminal-lifecycle failure codes together."
validators:
  - "node --strip-types tests/cli/historical-work-admission-attestation.test.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "node --strip-types packages/cli/src/commands/hook/__tests__/pre-push.spec.ts"
  - "npm run generate:error-codes"
  - "npm run typecheck"
  - "npm run validate:cli"
errorCodes:
  - "ATM_WRITE_TICKET_HISTORICAL_ATTESTATION_REQUIRED"
  - "ATM_HISTORICAL_WORK_ADMISSION_ATTESTATION_INVALID"
  - "ATM_TERMINAL_LIFECYCLE_OWNERSHIP_INCONSISTENT"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the attestation authority and both hook projections together. Existing historical commits remain untouched and missing-ticket commits return to fail-closed pre-push blocking."
atomizationImpact:
  ownerAtomOrMap: "atm.historical-work-admission-attestation-authority"
  mapUpdates:
    - "Map one historical-attestation evaluator to the governed command, pre-push, and terminal lifecycle ownership projections."
  extractionCandidates:
    - path: "docs/governance/error-code-registry.json"
      inlineReason: "The canonical registry is a required paired projection, not a behavioral owner for this card."
    - path: "docs/ERROR_CODES.md"
      inlineReason: "Generated public documentation must remain paired with the canonical registry and is not an extraction target."
createdByCommand: atm plan card create
---

# TASK-GIT-0024 Historical work-admission attestation and terminal ownership convergence

## Intent

Repair the proven protected-push deadlock without weakening ticket coverage or
rewriting published history. Four historical critical commits can be factual
and reviewable while lacking a committed `ATM-Work-Admission` trailer. The
repair must make that exception explicit, content-addressed, and forward-only.

This card also closes the adjacent lifecycle defect: a task may be `done` with
a released claim while an old direction-lock projection is still treated as an
active owner by pre-commit. A terminal lifecycle must have one shared meaning
at every gate.

## First-Principles Design

The protected resource is promotion of a commit range, not a trailer string.
The normal proof is the trailer emitted by the governed commit facade. If that
proof is absent from an already-created commit, no future process can honestly
pretend the trailer was always present. The only safe recovery is a new,
append-only attestation that binds the immutable commit identity and the
available contemporaneous ATM evidence.

`HistoricalWorkAdmissionAttestationAuthority` is the deep module:

- **interface:** evaluate `(commitSha, parentSha, treeSha, pushedRange,
  provenance) -> covered | missing | invalid` and emit a canonical attestation
  record only through a governed command;
- **hidden complexity:** ancestry/range checks, ticket or emergency-provenance
  binding, duplicate/conflicting record rejection, task/lane attribution,
  terminal lifecycle state, and ErrorCode mapping;
- **adapter A:** protected pre-push range guard;
- **adapter B:** governed historical-attestation command;
- **shared predicate:** pre-commit and claim repair consume the same terminal
  lifecycle ownership decision rather than reconstructing "active" from an
  incidental lock field.

Deletion test: removing this authority forces pre-push, recovery tooling, and
future remote checks to maintain separate historical exceptions. Removing the
shared terminal predicate forces hooks and lifecycle repair to disagree again.

## Boundaries

- Do not amend, rebase, force-push, or manufacture trailers for historical
  commits.
- Do not turn emergency pathspec commits into ordinary delivery success.
- Do not move runner publication membership from TASK-GIT-0017.
- Do not introduce a second ticket registry or a commit-specific allowlist.
- An attestation is only a forward recovery for the exact immutable commit it
  proves; it grants no file-write, task-close, or future commit authority.

## Acceptance

- [ ] A temporary-repository fixture proves that an ordinary governed commit
  with `ATM-Work-Admission` passes unchanged.
- [ ] A missing-trailer critical commit remains blocked until one valid
  historical attestation binds its exact commit, parent, tree, provenance
  digest, task, and lane context.
- [ ] Tampering with any bound value, targeting a non-ancestor/future commit,
  or adding a conflicting second attestation fails closed.
- [ ] The pre-push hook and the attestation command use the same evaluator and
  report the same covered/missing/invalid decision.
- [ ] A done/released task with a released direction lock is not reported as an
  active cross-task owner; a terminal ledger/lock mismatch remains blocked.
- [ ] Existing GIT-0022/GIT-0023 emergency commits can be covered only through
  a reviewable forward attestation; their commit messages and history remain
  unchanged.
- [ ] Focused tests, error-code generation, typecheck, and validate:cli pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T22:40:22.418Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0024-historical-work-admission-attestation-and-terminal-ownership-convergence.task.md","contentDigest":"sha256:355c343e05d8913fb442849136b1e7b84881daa10588de536f21fcdf905e71e2"} -->
