---
task_id: ATM-GOV-0257
title: Actor identity continuity across captain and shared-write lanes
status: done
owner: atm-identity-governance
priority: P1
milestone: ATM-3.1-R0.9
severity: P1
depends_on:
  - ATM-GOV-0231
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns cross-command authority continuity in Plan 3.1; this card reuses the canonical actor registry and command manifest rather than introducing another identity source."
scopePaths:
  - packages/cli/src/commands/actor-registry.ts
  - packages/cli/src/commands/identity.ts
  - packages/cli/src/commands/shared/identity-normalization.ts
  - packages/cli/src/commands/shared/command-manifest.ts
  - packages/cli/src/commands/integration/bootstrap.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/identity-per-actor-routing.test.ts
  - tests/cli/runner-sync-build-actor-continuity.test.ts
  - tests/cli/command-manifest-recovery-chain.test.ts
  - tests/cli/emergency-git-author-continuity.test.ts
deliverables:
  - packages/cli/src/commands/actor-registry.ts
  - packages/cli/src/commands/identity.ts
  - packages/cli/src/commands/shared/identity-normalization.ts
  - packages/cli/src/commands/shared/command-manifest.ts
  - packages/cli/src/commands/integration/bootstrap.ts
  - tests/cli/identity-per-actor-routing.test.ts
  - tests/cli/runner-sync-build-actor-continuity.test.ts
  - tests/cli/command-manifest-recovery-chain.test.ts
  - tests/cli/emergency-git-author-continuity.test.ts
validators:
  - node --strip-types tests/cli/identity-per-actor-routing.test.ts
  - node --strip-types tests/cli/runner-sync-build-actor-continuity.test.ts
  - node --strip-types tests/cli/command-manifest-recovery-chain.test.ts
  - node --strip-types tests/cli/emergency-git-author-continuity.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: actor-authority-continuity-command-chain
rollback:
  strategy: revert-commit-and-require-explicit-actor
  notes: "When automatic continuity cannot be proven, commands must fail closed and print a copyable explicit-actor recovery command."
atomizationImpact:
  ownerAtomOrMap: atm.actor-authority-resolution
  mapUpdates: []
  extractionCandidates:
    - atom: atm.actor-authority-continuity
      pattern: Policy Object
      source: packages/cli/src/commands/shared/identity-normalization.ts
      disposition: extract
completed_at: "2026-07-23T04:33:33.407Z"
completed_by_agent: "cursor-grok45-plan31-captain"
closedAt: "2026-07-23T04:33:33.407Z"
closedByActor: "cursor-grok45-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-23T04-33-33-407Z-close-0ee66a5417e3"
lastTransitionAt: "2026-07-23T04:33:33.407Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b7b2d429b363cd55c73b4b588b34e7920fc6aa17"
---

# ATM-GOV-0257 Actor identity continuity across captain and shared-write lanes

## Intent

Preserve one explicit actor authority across `next`, claim, Team Broker resolution, runner-sync enqueue/build/release, and closeout. Ambient legacy editor identity may be shown as provenance, but it must not silently replace the actor that owns the active lane or queue ticket.

## Acceptance

- [ ] Every shared-write recovery manifest carries the resolved actor, resolution source, lane/session when present, and a shell-safe copyable command.
- [ ] `ATM_ACTOR_ID` or an explicit CLI actor remains authoritative across child build commands; stale `AGENT_IDENTITY` is diagnostic-only when it disagrees.
- [ ] Commands without sufficient actor continuity fail before mutation and identify the active claim/ticket owner plus the exact recovery command.
- [ ] Regressions cover Codex and Claude actor handoff, stale repo defaults, stale legacy environment identity, and queue-head actor mismatch.
- [ ] Identity provenance distinguishes verified active actor/lane authority from editor/model/ambient hints across Codex, Claude, Cursor, Gemini/Antigravity, and other adapters (`ATM-BUG-2026-07-12-115`).
- [ ] Emergency/native fallback manifests, when explicitly authorized, set Git author and committer identity from the active actor authority and verify trailers plus commit metadata; stale host author cannot silently survive (`ATM-BUG-2026-07-22-236`).
- [ ] No task id, actor slug, editor, or model name is hard-coded into the policy.
- [ ] Backlog item `ATM-BUG-2026-07-22-226` is linked in delivery evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T09:12:48.961Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0257-actor-identity-continuity-across-captain-and-shared-write-lanes.task.md","contentDigest":"sha256:3a254c90dff4d83903a5927d1a449db986e83b331efa442f30c470c80901b57c"} -->
