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
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/replay-actions.ts
  - packages/cli/src/commands/broker/replay/closure-policy.ts
  - packages/cli/src/commands/broker/replay/command-backed-matrix.ts
  - scripts/diagnose-plan3-evidence-closure.ts
  - tests/cli/plan3-evidence-closure-diagnostic.test.ts
  - tests/cli/broker-replay-command-surface.test.ts
deliverables:
  - packages/cli/src/commands/broker/replay-actions.ts
  - packages/cli/src/commands/broker/replay/closure-policy.ts
  - packages/cli/src/commands/broker/replay/command-backed-matrix.ts
  - scripts/diagnose-plan3-evidence-closure.ts
  - tests/cli/plan3-evidence-closure-diagnostic.test.ts
validators:
  - node --strip-types tests/cli/plan3-evidence-closure-diagnostic.test.ts
  - node --strip-types tests/cli/broker-replay-command-surface.test.ts
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
labels, formula disclosure, or `not-required` ticket states must not satisfy a
closure prerequisite.

## Acceptance

- [ ] Current weak repository evidence returns `remain-open` with exact missing lifecycle classes.
- [ ] `node atm.mjs --version`, sleep-only workloads, digest-only receipts, and self-reported lifecycle labels are rejected as closure evidence.
- [ ] `formula-generated-matrix-disclosed` is informational and can never convert invalid performance evidence into a passing check.
- [ ] Status distinguishes candidate availability, executed dogfood, matched performance, rollback/parity, backlog, and final verdict.
- [ ] No task id, actor id, local path, date, or incident string is hardcoded into control flow.

## Evidence and rollback

Completion requires a red-before/green-after focused test receipt. Roll back by
reverting the commit; fail-closed `remain-open` is the safe fallback.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- extraction candidate: semantic closure predicates belong in a small policy module, not additional branches in `replay-actions.ts`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:07:51.643Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0239-fail-closed-closure-truth-and-authority-reconciliation.task.md","contentDigest":"sha256:0caf84a9cce0e56aa181b0804873fd051204036963b87a0d7617c4c87272446f"} -->
