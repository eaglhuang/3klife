---
task_id: ATM-GOV-0242
title: Real two-card queued dogfood orchestrator
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.1-R3
depends_on:
  - ATM-GOV-0240
  - ATM-GOV-0241
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/replay/**
  - tests/e2e/atm-3-real-task-dogfood.test.ts
  - docs/governance/atm-3-replay-evidence.md
  - artifacts/generated/atm-plan3-dogfood/**
deliverables:
  - packages/cli/src/commands/broker/replay/dogfood-orchestrator.ts
  - tests/e2e/atm-3-real-task-dogfood.test.ts
  - artifacts/generated/atm-plan3-dogfood/ATM-GOV-0237.json
  - artifacts/generated/atm-plan3-dogfood/ATM-GOV-0238.json
validators:
  - node --strip-types tests/e2e/atm-3-real-task-dogfood.test.ts
  - node atm.mjs broker replay dogfood --surface docs/governance/atm-3-replay-evidence.md --json
  - node atm.mjs broker replay status --json
  - npm run typecheck
errorCodes: []
evidence:
  required: real-two-card-command-event-receipts
rollback:
  strategy: abandon-or-reopen-card
  notes: "Preserve failed receipts and return policy to queue-only without direct runtime edits."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-replay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.replay.dogfood-orchestrator
      pattern: Orchestrator
      source: packages/cli/src/commands/broker/replay/dogfood-orchestrator.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0242 Real two-card queued dogfood orchestrator

## Intent

Use ATM-GOV-0237 and ATM-GOV-0238 as the two registered dogfood participants.
Execute their real governed lifecycle with separate actor identities and OS
processes while preserving the declared shared intersection. The orchestrator
coordinates receipts but does not invent task transitions or lifecycle labels.

## Acceptance

- [ ] Two explicit actors and two OS processes claim the two registered cards and their active intervals overlap.
- [ ] Both cards preserve the shared surface throughout the run; neither narrows scope to avoid arbitration.
- [ ] Canonical broker tickets exist; at least one participant records positive queue wait and automatic successor wakeup.
- [ ] Proposal, shared write, compose/publish, validation, and close execute as real commands/events in isolated worktree/index or proposal surfaces.
- [ ] Both target ledger cards close, active authorization returns to zero, and no manual wakeup, bypass, emergency edit, or direct `.atm` mutation occurs.

## Evidence and rollback

Seal per-card command/event timelines, ticket generation/digest, overlap window,
shared-surface digest, wakeup, close packet, and terminal authorization census.
Failure preserves both cards and receipts and returns policy to queue-only.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- extraction candidate: lifecycle orchestration belongs in `dogfood-orchestrator.ts`; task-specific data stays in cards and artifacts.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:07:57.275Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0242-real-two-card-queued-dogfood-orchestrator.task.md","contentDigest":"sha256:4bc4863cbe413a40251334b76e186082016987dd87078bd1f83ec35640447a9b"} -->
