---
task_id: ATM-GOV-0239
title: Fail-closed closure truth and authority reconciliation
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.1-R1
depends_on:
  - ATM-GOV-0234
  - ATM-GOV-0235
  - ATM-GOV-0247
  - ATM-GOV-0251
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/replay-actions.ts
  - packages/cli/src/commands/broker/replay/closure-policy.ts
  - packages/cli/src/commands/broker/replay/command-backed-matrix.ts
  - packages/core/src/broker/decision/proposal-overlap.ts
  - packages/cli/src/commands/taskflow/broker-gate.ts
  - scripts/diagnose-plan3-evidence-closure.ts
  - tests/cli/plan3-evidence-closure-diagnostic.test.ts
  - tests/cli/broker-replay-command-surface.test.ts
  - tests/cli/broker-decision-consumer-coherence.test.ts
  - tests/fixtures/plan3-fake-green/**
deliverables:
  - packages/cli/src/commands/broker/replay-actions.ts
  - packages/cli/src/commands/broker/replay/closure-policy.ts
  - packages/cli/src/commands/broker/replay/command-backed-matrix.ts
  - packages/core/src/broker/decision/proposal-overlap.ts
  - packages/cli/src/commands/taskflow/broker-gate.ts
  - scripts/diagnose-plan3-evidence-closure.ts
  - tests/cli/plan3-evidence-closure-diagnostic.test.ts
  - tests/cli/broker-decision-consumer-coherence.test.ts
  - tests/fixtures/plan3-fake-green/current-protected-closure.json
validators:
  - node --strip-types tests/cli/plan3-evidence-closure-diagnostic.test.ts
  - node --strip-types tests/cli/broker-replay-command-surface.test.ts
  - node --strip-types tests/cli/broker-decision-consumer-coherence.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: semantic-closure-red-green-receipts
rollback:
  strategy: revert-commit
  notes: "Fail-closed remain-open is the safe fallback."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-replay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.replay.closure-policy
      pattern: Policy Object
      source: packages/cli/src/commands/broker/replay/closure-policy.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0239 Fail-closed closure truth and authority reconciliation

## Intent

Make Plan 3 closure status fail closed on semantic evidence, not candidate and
receipt existence. Candidate cards, arbitrary successful commands, lifecycle
labels, formula disclosure, `not-required` ticket states, or conservative
same-file serialization must not satisfy a closure prerequisite.

## Acceptance

- [ ] Current weak repository evidence returns `remain-open` with exact missing lifecycle classes.
- [ ] A locked regression feeds the repaired checker 420 synthetic receipts, `not-required` dogfood, and hardcoded/fixed cost input from the current fake-green closure; the only accepted verdict is `remain-open`.
- [ ] `node atm.mjs --version`, sleep-only workloads, digest-only receipts, and self-reported lifecycle labels are rejected as closure evidence.
- [ ] Deliberate-intersection dogfood with `not-required` is classified as `INV-ATM-008`; arm-specific delay, fixed task id/cost, or result-shaping control flow is classified as `INV-ATM-009`.
- [ ] A same-file scenario with disjoint bounded intents is rejected if evidence shows path-only locking, separate-worktree isolation, missing compose batch membership, or no neutral-steward apply; these violate `INV-ATM-010` and cannot be counted as parallel success.
- [ ] Decision semantics distinguish `composer-routed` from `must-serialize`. A consumer must not turn a composer-routed admission into serialization merely because a legacy top-level verdict says `needs-physical-split`; the canonical decision class is coherent across every field and locked call-site tests cover taskflow/replay consumers.
- [ ] Queue/wakeup is required only for a sealed true-conflict/stale fallback cell. The primary safe-compose cell may have zero queue residency and must not be failed for that reason.
- [ ] `formula-generated-matrix-disclosed` is informational and can never convert invalid performance evidence into a passing check.
- [ ] Status distinguishes candidate availability, executed dogfood, matched performance, rollback/parity, backlog, and final verdict.
- [ ] A predecessor's terminal `done` status is historical lifecycle truth, not proof that a successor plan's semantic evidence predicates passed. Evidence that no longer satisfies the active closure contract is classified generically as `superseded-for-plan-closure` and forces `remain-open`.
- [ ] Reconciliation preserves immutable predecessor task/event/evidence history; it must not reopen, rewrite, or delete a terminal predecessor merely to express that continuation repair is still required.
- [ ] This runtime closure gate cannot close on source-only evidence. The same card-defined behavior probe must pass through source and frozen `node atm.mjs`, bind source/frozen/build/projection digests, and use a runner-sync receipt whose build may be shared with other cards but whose parity result is attributable to this card.
- [ ] No task id, actor id, local path, date, or incident string is hardcoded into control flow.

## Evidence and rollback

Completion requires a red-before/green-after focused test receipt. Roll back by
reverting the commit; fail-closed `remain-open` is the safe fallback.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- extraction candidate: semantic closure predicates belong in a small policy module, not additional branches in `replay-actions.ts`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:07:51.643Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0239-fail-closed-closure-truth-and-authority-reconciliation.task.md","contentDigest":"sha256:0caf84a9cce0e56aa181b0804873fd051204036963b87a0d7617c4c87272446f"} -->
