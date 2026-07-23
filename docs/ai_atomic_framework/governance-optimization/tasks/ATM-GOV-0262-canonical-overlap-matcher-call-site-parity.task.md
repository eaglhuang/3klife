---
task_id: ATM-GOV-0262
title: Canonical overlap matcher call-site parity
status: planned
owner: atm-broker
priority: P0
milestone: ATM-3.1-R0.14
severity: P0
depends_on:
  - ATM-GOV-0255
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 Broker correctness; this card removes matcher drift inside the existing canonical Broker decision path rather than introducing another conflict model."
scopePaths:
  - packages/core/src/broker/resource-overlap.ts
  - packages/core/src/broker/conflict-matrix.ts
  - packages/core/src/broker/decision/physical-overlap.ts
  - packages/core/src/broker/decision/proposal-overlap.ts
  - tests/core/broker-resource-overlap.test.ts
  - tests/core/broker-overlap-callsite-parity.test.ts
deliverables:
  - packages/core/src/broker/resource-overlap.ts
  - packages/core/src/broker/conflict-matrix.ts
  - packages/core/src/broker/decision/physical-overlap.ts
  - tests/core/broker-overlap-callsite-parity.test.ts
validators:
  - node --strip-types tests/core/broker-resource-overlap.test.ts
  - node --strip-types tests/core/broker-overlap-callsite-parity.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: canonical-overlap-matcher-callsite-red-green
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Any call-site disagreement or unsupported pattern remains fail closed and prevents Plan 3.1 dogfood."
atomizationImpact:
  ownerAtomOrMap: atm.broker.resource-overlap
  mapUpdates: []
  extractionCandidates:
    - atom: atm.broker.resource-overlap-matcher
      pattern: Policy Function
      source: packages/core/src/broker/resource-overlap.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0262 Canonical overlap matcher call-site parity

## Intent

Remove the live correctness gap recorded by `ATM-BUG-2026-07-20-213`.
`conflict-matrix.ts` already understands pattern-aware resource overlap, while
`decision/physical-overlap.ts` can still use exact `includes` matching. Plan
3.1 cannot use Broker results as evidence while two decision call sites can
disagree on the same glob/literal resource pair.

The repair must follow `INV-ATM-009`: one data-driven matcher owns exact,
glob-containment, normalized path, atom/CID, anchor, and range comparison
semantics; decision modules consume it and cannot retain private variants.

## Acceptance

- [ ] One canonical resource-overlap matcher is used by conflict-matrix, physical-overlap, and proposal-overlap decision paths.
- [ ] A call-site inventory regression fails if a Broker decision module reintroduces direct exact-match membership for governed resource overlap.
- [ ] The `glob intent -> literal candidate` and `literal intent -> glob candidate` false-negative cases from `ATM-BUG-2026-07-20-213` produce the same conflict dimensions and resource keys through every call site.
- [ ] Negative controls prove disjoint files, atoms, CIDs, anchors, and source ranges remain parallel-admissible; the fix must not collapse all same-file work into a file lock.
- [ ] Normalization and matching policy is repository-neutral and contains no task id, actor, date, or incident-specific branch.
- [ ] Source and frozen-runner evidence use the same fixture digest before this card closes.
- [ ] Delivery evidence links `ATM-BUG-2026-07-20-213`; Plan 3.1 dogfood and final verdict remain blocked until the item has a terminal command-backed disposition.

## Evidence and rollback

Seal the paired false-negative/negative-control matrix and the call-site
inventory digest. On rollback, trip parallel admission to queue-only rather
than restoring divergent matcher semantics.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-23T01:22:54.246Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0262-canonical-overlap-matcher-call-site-parity.task.md","contentDigest":"sha256:0e35ad24a7581bad3912a88c14c4b25e6974e47439c7f04463663bedd3b3be26"} -->
