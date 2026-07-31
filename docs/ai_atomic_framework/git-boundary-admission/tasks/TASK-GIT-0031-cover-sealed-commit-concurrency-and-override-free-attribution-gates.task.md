---
task_id: TASK-GIT-0031
title: Cover sealed commit concurrency and override-free attribution gates
status: done
owner: claude-006
priority: P1
depends_on:
  - TASK-GIT-0029
  - TASK-GIT-0030
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - packages/cli/src/commands/broker/shared-delivery-commit-transaction.ts
  - packages/cli/src/commands/broker/wave-broker-scheduler.ts
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - packages/cli/src/commands/git-governance/lease-command.ts
  - packages/core/src/commit-attribution/sealed-commit-bundle.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/fixtures/governance-incidents/shared-index-commit-attribution/**
  - tests/catalog/groups/**
deliverables:
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/fixtures/governance-incidents/shared-index-commit-attribution/**
  - tests/catalog/groups/**
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/git-governance/lease-command.ts
  - packages/core/src/commit-attribution/sealed-commit-bundle.ts
validators:
  - node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:module-boundaries
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-07-31T08:40:53.232Z"
completed_by_agent: "claude-006"
closedAt: "2026-07-31T08:40:53.232Z"
closedByActor: "claude-006"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T08-40-53-232Z-close-45d3a2e32e4b"
lastTransitionAt: "2026-07-31T08:40:53.232Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a80e646b7ba1ce3b4cfa8b3be00a491aee5abac3"
---

# TASK-GIT-0031 Cover sealed commit concurrency and override-free attribution gates

## Intent

Cursor read-only review of TASK-GIT-0029 found remaining coverage gaps after the sealed attribution delivery: concurrent sealed preparation is not directly proven, queue/wait is not locked as the only normal HEAD gate, override-lease absence is not tested on success paths, provenance mismatch is not fail-closed, and `runWithSealedTaskScopedCommitIndex` can still fall back to sealing the live index when no sealed bundle is passed. Add focused tests and any minimal policy tightening needed to make these properties observable.

## Acceptance

- [ ] Two independent sealed bundles can be prepared from separate logical lanes without reading each other's live-index changes; only final ref update serializes through broker/CAS.
- [ ] HEAD moved between prepare and apply returns broker queue/wait/CAS retry guidance; no governed commit success path may update HEAD through a non-broker finalization route.
- [ ] Tests fail if a successful governed commit uses, requests, or records override lease authority.
- [ ] Provenance mismatch for same path/mode/blob has a named finding kind and fails closed before ref mutation.
- [ ] `runWithSealedTaskScopedCommitIndex` has no unsafe live-index fallback on governed commit paths; any remaining fallback is limited to a named diagnostic/test-only route with evidence.
- [ ] Incident fixture/catalog coverage names the generic family, not a task id, actor, commit SHA, or date in production control flow.
- [ ] TASK-GIT-0030 deletion tombstone tests remain green if 0030 has already landed.

## Notes

- Source review input: Cursor reported 1 partial, 2 partial, 3 missing, 4 mostly pass for the original concurrency model acceptance, then identified missing scope around batch execute, lease command, wave broker scheduler, validator spelling, and provenance-mismatch finding kind.
- This card is coverage/policy hardening. Do not claim or implement it while TASK-GIT-0030 is still running; it may start only after TASK-GIT-0030 is done/released or Captain explicitly authorizes a read-only design pass.
- Suggested order after TASK-GIT-0030 lands: disable governed live-index fallback; add provenance mismatch finding; add dual sealed prepare test; prove HEAD moved uses broker queue/wait/CAS only; prove success path zero override lease; preserve deletion tombstone regression.
- No raw git, branch, rebase, push, or override lease unless separately authorized by owner.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T05:25:25.974Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0031-cover-sealed-commit-concurrency-and-override-free-attribution-gates.task.md","contentDigest":"sha256:5b064237ab109e6ef3efdcf344a12e41b8406b4a22eb6d80969819af217a8e93"} -->
