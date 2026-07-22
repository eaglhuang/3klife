---
task_id: ATM-GOV-0246
title: Dual-captain dogfood dashboard and sealed run manifest
status: planned
owner: atm-observability
priority: P0
milestone: ATM-3.1-R2.5
depends_on:
  - ATM-GOV-0240
  - ATM-GOV-0241
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 evidence repair; this continues the invalid 0234/0235 closure lineage without creating a new task series."
scopePaths:
  - packages/core/src/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/run-manifest.ts
  - packages/cli/src/commands/broker/replay/dashboard-view-model.ts
  - packages/cli/src/commands/broker/replay-actions.ts
  - tests/cli/plan3-dual-captain-dashboard.test.ts
  - docs/governance/atm-3-replay-evidence.md
deliverables:
  - packages/core/src/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/run-manifest.ts
  - packages/cli/src/commands/broker/replay/dashboard-view-model.ts
  - tests/cli/plan3-dual-captain-dashboard.test.ts
validators:
  - node --strip-types tests/cli/plan3-dual-captain-dashboard.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: dual-captain-dashboard-command-backed
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "The dashboard is read-only. Revert implementation and keep Plan 3 active if canonical reconstruction fails."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-replay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.replay.dashboard
      pattern: Read Model
      source: packages/core/src/broker/replay/dashboard.ts
      disposition: extract
    - atom: atm.replay.run-manifest
      pattern: Sealed Manifest
      source: packages/cli/src/commands/broker/replay/run-manifest.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0246 Dual-captain dogfood dashboard and sealed run manifest

## Intent

Provide a small, read-only live/post-run dashboard and a sealed run-manifest
contract before the Codex/Claude dual-captain dogfood begins. The dashboard
reconstructs observations from canonical task events, tickets, command
receipts, and sealed artifacts; it never drives queue state or trusts
producer-owned success labels.

## Acceptance

- [ ] A pre-run manifest seals run id, participant cards, provider/role scenario data, runtime-assigned actors, PIDs/process expectations, base/build/runner digests, worktree/index/proposal roots, declared shared intersection, private outputs, thresholds, time window, and stop rule.
- [ ] Provider and task bindings are data only; dashboard and harness contain no Codex-, Claude-, actor-, task-, date-, or local-path-specific control-flow branches.
- [ ] Dashboard shows canonical claim/close state, actor/PID, active overlap and ratio, shared/private scopes, ticket state/generation/digest, queue position, `waitedMs`, release condition, automatic wakeup, lifecycle completion, faults/correctness, throughput/cost, source availability, and stop condition.
- [ ] `ready` requires two different actors, OS processes, worktrees, and indexes on the same sealed base/build with a non-empty intersection; missing evidence, contradictory digests, or `not-required` returns `not-ready`.
- [ ] JSON and human-readable views share the same compact digest and can be refreshed live or reconstructed post-run from canonical sources.
- [ ] Refresh is strictly read-only: it cannot claim, wake, release, mutate queue/runtime state, or manufacture lifecycle events.
- [ ] Focused tests prove untrusted producer labels cannot override canonical evidence and incomplete dual-captain setup fails closed.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:20:17.541Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0246-dual-captain-dogfood-dashboard-and-sealed-run-manifest.task.md","contentDigest":"sha256:56c32ea35b17499e21d3c874380a36b5e2e0b853fbe9cf58576e340228f17c13"} -->
