---
task_id: ATM-GOV-0279
title: Obligation inventory schema and inventory drift detector
status: done
owner: unassigned
priority: P1
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0277
causalGraph:
  causalDependencies:
    - ATM-GOV-0277
  startConditions:
    - ATM-GOV-0277 is done and provides model-relative vocabulary for coverage obligations and certificates.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - packages/core/src/evidence/coverage-semantics.ts
  changedPublicSeams:
    - atm.obligationInventory.v1
    - atm.inventoryDriftDetector.v1
  causalImpactEdges:
    - source seams and validators -> obligation inventory entries
    - obligation inventory digest -> inventory drift detector
    - inventory drift detector -> coverage certificate freshness
  validatorReferences:
    - node --strip-types tests/cli/plan4-obligation-inventory.test.ts
    - npm run typecheck
  phaseOwner: plan4-foundation
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/obligation-inventory.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/obligation-inventory.schema.json
  - tests/catalog/groups/test_group_plan4_obligation_inventory.shard.json
  - tests/cli/plan4-obligation-inventory.test.ts
deliverables:
  - packages/core/src/evidence/obligation-inventory.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/obligation-inventory.schema.json
  - tests/catalog/groups/test_group_plan4_obligation_inventory.shard.json
  - tests/cli/plan4-obligation-inventory.test.ts
validators:
  - node --strip-types tests/cli/plan4-obligation-inventory.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0279_obligation_inventory_drift_detector_5c7f6251
    targetGroupId: test_group_plan4_obligation_inventory
    semanticKey: plan4_obligation_inventory_drift_detector
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-3
      - ACC-4
      - ACC-5
    coversImpactEdges:
      - source seams and validators -> obligation inventory entries
      - obligation inventory digest -> inventory drift detector
      - inventory drift detector -> coverage certificate freshness
    expectedRedPredicate: A changed obligation universe can reuse an old certificate without producing inventory drift evidence.
    responsibility: task-required
    contractEdge: plan4-obligation-inventory
requiredTestCaseIds:
  - test_atm_gov_0279_obligation_inventory_drift_detector_5c7f6251
evidence:
  required: command-backed-obligation-inventory-receipts
rollback:
  strategy: revert-commit-and-disable-plan4-obligation-inventory
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.obligation-inventory
      pattern: Schema / Drift Detector
      source: packages/core/src/evidence/obligation-inventory.ts
      disposition: extract
completed_at: "2026-07-31T01:14:11.204Z"
completed_by_agent: "codex-skl-captain"
closedAt: "2026-07-31T01:14:11.204Z"
closedByActor: "codex-skl-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T01-14-11-204Z-close-77ba6068a1aa"
lastTransitionAt: "2026-07-31T01:14:11.204Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9e603ea3f9868d89a96bf0c74b2bf472a03d3f5d"
---

# ATM-GOV-0279 Obligation inventory schema and inventory drift detector

## Intent

Create the canonical inventory shape for "what must be tested" and a drift
detector that notices when the universe changed after a certificate was issued.

In the water-pipe analogy: 0277 names what a pressure certificate means; 0279
lists every pipe joint that is part of the certificate and detects when a new
joint appears or an old one disappears.

## First-principles boundary

- A coverage percentage is meaningless without a stable denominator.
- The denominator is an inventory of obligations, not a casual list of test files.
- Drift detection is a pure comparison over canonical IDs and digests; it must
  not depend on filesystem side effects.

## Acceptance

- [ ] ACC-1: A public obligation inventory schema represents obligation id, semantic family, owning seam, source refs, validator refs, and lifecycle status.
- [ ] ACC-2: Canonical inventory digest is deterministic under entry reordering.
- [ ] ACC-3: Drift detector reports added, removed, changed, and stale-observed obligations.
- [ ] ACC-4: Drift evidence can mark a prior certificate stale without mutating that certificate.
- [ ] ACC-5: The test catalog group includes the required test case id and maps it to this card.

## Non-goals

- Do not decide reachability or compile obligations from source here; that belongs to ATM-GOV-0280.
- Do not decide which validators to run here; that belongs to ATM-GOV-0285.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T00:16:38.525Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0279-obligation-inventory-schema-and-inventory-drift-detector.task.md","contentDigest":"sha256:9f8839be24c29046233f9c989143b105db6d0d653aaa00336f3cc94f83fbb055"} -->
