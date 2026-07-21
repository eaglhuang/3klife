---
task_id: ATM-GOV-0237
title: Plan 3 real dogfood shared replay surface A
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.0-E
severity: P0
depends_on:
  - ATM-GOV-0234
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3 real dogfood evidence; this card is one of two intentionally intersecting registered candidates."
scopePaths:
  - "docs/governance/atm-3-replay-evidence.md"
  - "artifacts/generated/atm-plan3-dogfood/ATM-GOV-0237.json"
deliverables:
  - "artifacts/generated/atm-plan3-dogfood/ATM-GOV-0237.json"
validators:
  - "node atm.mjs broker replay dogfood --surface docs/governance/atm-3-replay-evidence.md --json"
  - "node atm.mjs broker replay status --json"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_REPLAY_DOGFOOD_BLOCKED"
  - "ATM_EVIDENCE_SEAL_REQUIRED"
createdByCommand: atm plan card create
evidence:
  required: real-dogfood-command-backed
rollback:
  strategy: abandon-or-reopen-card
  notes: "If the dogfood run fails, keep Plan 3 active, preserve the failed receipt, and abandon or reopen this candidate through the normal task lifecycle."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.parallel-replay"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0237 Plan 3 real dogfood shared replay surface A

## Intent

Provide the first real, registered, not-yet-delivered task candidate for the
Plan 3 runtime dogfood replay. This card intentionally shares
`docs/governance/atm-3-replay-evidence.md` with ATM-GOV-0238 while keeping its
own output artifact separate, so broker admission must preserve the declared
intersection without hardcoded task ids.

## Acceptance

- [ ] Target ledger import records this card as planned/ready/running.
- [ ] `broker replay dogfood` selects this card by declared intersection, not by id.
- [ ] Dogfood evidence records actor, canonical ticket state, waitedMs, wakeup,
      proposal/compose trace, and close-packet digest.
- [ ] No implementation control flow special-cases ATM-GOV-0237.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T16:07:09.691Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0237-plan-3-real-dogfood-shared-replay-surface-a.task.md","contentDigest":"sha256:cde6635e38d8a24988f7a730e4c4e06d81b8ea6278cb9f265e1a59357afa451d"} -->
