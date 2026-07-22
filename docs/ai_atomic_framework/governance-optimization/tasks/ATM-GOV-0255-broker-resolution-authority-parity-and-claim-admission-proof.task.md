---
task_id: ATM-GOV-0255
title: Broker resolution authority parity and claim-admission proof
status: done
owner: atm-team-broker
priority: P0
milestone: ATM-3.1-R0.7
severity: P0
depends_on:
  - ATM-GOV-0227
  - ATM-GOV-0233
  - ATM-GOV-0247
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 Broker arbitration and claim admission; this card repairs producer/consumer authority parity without creating a second conflict-resolution store."
scopePaths:
  - packages/core/src/team-runtime/permission-broker.ts
  - packages/cli/src/commands/team/legacy/broker-observability.ts
  - packages/cli/src/commands/broker-conflict-resolution.ts
  - packages/cli/src/commands/next/claim-parallel-preflight.ts
  - packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts
  - scripts/validators/team-agents/broker-conflict-resolution.ts
  - scripts/validators/team-agents/broker-conflict-resolution-replay.ts
deliverables:
  - packages/core/src/team-runtime/permission-broker.ts
  - packages/cli/src/commands/broker-conflict-resolution.ts
  - packages/cli/src/commands/next/claim-parallel-preflight.ts
  - packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts
  - scripts/validators/team-agents/broker-conflict-resolution.ts
  - scripts/validators/team-agents/broker-conflict-resolution-replay.ts
validators:
  - node --strip-types packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts
  - node --strip-types scripts/validate-team-agents.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-produced-bcr-to-claim-admission-red-green
rollback:
  strategy: revert-commit-and-freeze-conflicting-claim
  notes: "Retain fail-closed claim behavior whenever the resolution artifact lacks a canonical ticket, authority digest, authorization grant, or matching resource key."
atomizationImpact:
  ownerAtomOrMap: atm.team-broker-conflict-resolution
  mapUpdates: []
  extractionCandidates:
    - atom: atm.team-broker-resolution-authority-envelope
      pattern: Policy Object
      source: packages/core/src/team-runtime/permission-broker.ts
      disposition: extract
completed_at: "2026-07-22T11:31:15.371Z"
completed_by_agent: "claude-plan31-captain"
closedAt: "2026-07-22T11:31:15.371Z"
closedByActor: "claude-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-22T11-31-15-371Z-close-3ef81b62fab1"
lastTransitionAt: "2026-07-22T11:31:15.371Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6a89ed0d2f0c6f61ee0cb6d5dc7f27026716d5f3"
---

# ATM-GOV-0255 Broker resolution authority parity and claim-admission proof

## Intent

Make the official `team broker resolve` command produce the exact authority-bearing artifact that `next --claim` consumes. The same command advertised by a `broker-conflict-blocked` response must be sufficient to authorize the bounded task pair and logical resource, without manual `.atm/runtime` edits or a generic emergency override.

## Acceptance

- [ ] `atm.brokerConflictResolution.v1` emitted by the official command carries a canonical `atm.brokerTicket.v1`, authority generation/digest, bounded authorization grants, task pair, and resource keys.
- [ ] The producer and `readResolutionAuthorizedForeignTaskIds` share one validator/normalizer rather than maintaining different artifact contracts.
- [ ] A regression reproduces `ATM-GOV-0239` versus `ATM-GOV-0249`: `sharedPaths=[]`, logical overlap `atom-core-registry`, first claim freezes, official resolve emits the artifact, and the retry is admitted only for the authorized pair/resource.
- [ ] Missing, stale, over-broad, differently ordered, or resource-mismatched artifacts remain fail closed.
- [ ] Existing valid legacy artifacts have an explicit migration or rejection receipt; no silent permissive fallback is allowed.
- [ ] Backlog item `ATM-BUG-2026-07-22-224` is linked in delivery evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T09:12:26.077Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0255-broker-resolution-authority-parity-and-claim-admission-proof.task.md","contentDigest":"sha256:2a06d6c120ac30874a9226d549ab0f14753000e71eb23f30714d46541e9c1e63"} -->
