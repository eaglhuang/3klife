---
task_id: ATM-GOV-0242
title: Real two-card compose-first and fallback dogfood orchestrator
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.1-R3
depends_on:
  - ATM-GOV-0240
  - ATM-GOV-0241
  - ATM-GOV-0246
  - ATM-GOV-0261
  - ATM-GOV-0263
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
skl_validator_transition:
  schema_id: atm.validatorSelection.transition.v1
  enforcement: advisory-until-TASK-SKL-0029
  causalImpactEdges:
    - two-task-intents-to-compose-or-queue-decision
    - broker-ticket-to-shared-delivery-attribution
  requiredTestCaseIds:
    - test_int_plan3_parallel_replay_two_card_safe_compose_fb9f0b06
  phaseTestCaseIds:
    - test_int_plan3_performance_matched_ab_ba_workload_4bc3165d
  advisoryTestCaseIds: []
  testContributions:
    - caseId: test_int_plan3_parallel_replay_two_card_safe_compose_fb9f0b06
      targetGroupId: test_group_plan3_parallel_replay
      semanticKey: two-card-safe-compose
      coversImpactEdges:
        - two-task-intents-to-compose-or-queue-decision
        - broker-ticket-to-shared-delivery-attribution
---

# ATM-GOV-0242 Real two-card compose-first and fallback dogfood orchestrator

## Intent

Use ATM-GOV-0237 and ATM-GOV-0238 as the two registered dogfood participants:
Codex captain executes 0237 and Claude captain executes 0238. Provider binding
is sealed scenario data only; the generic orchestrator executes their real
governed lifecycle with separate actor identities and OS processes while
sharing one canonical worktree/base/HEAD and preserving the declared physical
file intersection. The primary cell proves safe same-file compose-first and
neutral-steward delivery; a separate sealed true-conflict/stale cell proves the
queue/revalidation fallback. The orchestrator coordinates receipts but does
not invent task transitions or lifecycle labels.

## Acceptance

- [ ] ATM-GOV-0246 dashboard preflight is ready and the sealed run manifest exists before either claim.
- [ ] ATM-GOV-0261 has command-backed passing evidence for the normal VCS-neutral commit-candidate lane. The dogfood must not depend on a direct native pathspec commit, alternate index, manual staging arbitration, or another emergency/anomaly delivery path.
- [ ] ATM-GOV-0263 has passing emitted-command and batch-continuation evidence; both worker lanes follow task-card/playbook output without a captain repairing status/recovery commands or manually pruning terminal queue heads.
- [ ] Codex/0237 and Claude/0238 use two explicit actors and OS processes but the same canonical worktree/base/HEAD/build; their active intervals overlap, and no task lane creates or switches a Git branch, worktree, or index.
- [ ] Both cards preserve `dashboard-view-model.ts` throughout the run and declare disjoint semantic anchors/bounded ranges within it; neither narrows scope to avoid arbitration.
- [ ] Both workers produce bounded patch/mutation proposals without directly writing the shared file. Existing format adapters and transactional composer select both requests in one mutation batch and emit a serializability proof.
- [ ] Safe-cell success requires the exact composed candidate to pass the sealed union of both cards' declared validators, the resolved language adapter's fast static checks, and catalog-selected targeted tests before steward apply.
- [ ] A locked adversarial cell uses disjoint anchors/ranges whose individually applicable proposals produce a semantically broken combined candidate. It must fail or remain inconclusive with `canonicalWriteCount: 0`; serializability alone must never be reported as compose success.
- [ ] The orchestrator proves validator-policy/union sealing precedes producer access to the locked adversarial payload. A union changed after reveal invalidates the run; the harness cannot quietly regenerate a more convenient negative control.
- [ ] Every validation observation is command-backed and binds the candidate digest, validator reference, executable/argv/cwd, runner/build digest, timestamps, exit status, and derived result. Caller-provided success labels or missing-to-pass defaults are rejected.
- [ ] Neutral steward is the only shared-file writer, applies the composed result once, and creates one shared-delivery receipt/commit with complete attribution to both cards. Private files remain attributable to their owning card.
- [ ] The primary safe-compose cell may record zero queue residency and must fail if path equality alone causes serialization. `not-required`, direct-write, separate-worktree, or missing compose/steward evidence is invalid.
- [ ] A separate sealed cell uses the same generic workload adapter but introduces a real logical collision or stale base; only this cell must reach canonical queue/revalidation and, if queued, positive `waitedMs` plus automatic successor wakeup.
- [ ] Both target ledger cards close, active authorization returns to zero, and no manual wakeup, bypass, emergency edit, or direct `.atm` mutation occurs.
- [ ] Manual captain intervention count is zero after the sealed run starts; a genuine task-card error or owner-only stop invalidates the run instead of being silently repaired in chat.
- [ ] Dashboard post-run view is retained and reconstructs the same run digest from canonical sources; provider/task ids never alter orchestration control flow.

## Evidence and rollback

Seal per-card command/event timelines, canonical root/base/HEAD, intent and
proposal digests, adapter decision, compose batch, serializability proof,
steward journal, shared-commit attribution, fallback queue/wakeup, overlap
window, close packet, and terminal authorization census. Failure preserves both
cards and receipts and returns policy to queue-only.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- extraction candidate: lifecycle orchestration belongs in `dogfood-orchestrator.ts`; task-specific data stays in cards and artifacts.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:07:57.275Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0242-real-two-card-queued-dogfood-orchestrator.task.md","contentDigest":"sha256:4bc4863cbe413a40251334b76e186082016987dd87078bd1f83ec35640447a9b"} -->
